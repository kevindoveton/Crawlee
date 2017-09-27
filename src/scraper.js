const rp = require('request-promise');
const cheerio = require('cheerio');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const cheeto = require('cheeto').cheeto();
const csstree = require('css-tree');


/**
 * Crawlee - a scraper!
 * @param {object} obj - an object containing many configuration options!
 * url - the starting url to scrape 
 * protocol - http or https
 * baseDir - download directory
 * downloadJs - whether to download javascript files
 * downloadCss - whether to download css files
 * downloadImage - whether to download images
 * maxConnections - the maximum number of connections
 * preProcess - process to run after downloading, must return a promise
 * gets a copy of response, resolving will save 
 * rejecting will stop file saving
 * postProcess - process to run after saving
*/
class Crawlee {
  constructor(obj) {
    this.url = obj.url;
    this.protocol = obj.protocol || 'http'
    this.baseDir = obj.baseDir || __dirname + '/../static/';
    this.downloadJs = obj.downloadJs || true;
    this.downloadCss = obj.downloadCss || true;
    this.downloadImage = obj.downloadImage || true;
    this.preProcess = obj.preProcess || function(res) { return new Promise((resolve, reject) => { resolve(res); }) }
    this.postProcess = obj.postProcess || function() {};
    this.maxConnections = obj.maxConnections || 1;

    this.baseUrl = this.protocol + '://' + this.url + '/';
    this.queue = [];
    this.downloaded = [];
    this.finishedCount = 0;
    this.openConnections = 0;
    this.currentSearches = 0;
    this.stats = {
      js: 0,
      css: 0,
      image: 0,
      html: 0,
      other: 0,
      total: 0,
      failed: 0,

      startTime: new Date(),
      endTime: undefined,
      
      elapsedSecs: undefined,
    };
    cheeto.update();
  }

  saveFile(url, type) {
    var file = path.join(this.baseDir, url.replace(this.baseUrl, '/'));
    var dir = file.substr(0, file.lastIndexOf('/'));
    return new Promise((resolve, reject) => {

      mkdirp(dir, (err) => {
        if (err) {
          reject(err);
        }
        rp({
          uri: url,
          resolveWithFullResponse: true,
          encoding: type == 'other' || type == 'image' ? null : undefined
        }).then((response) => {

          if (typeof (type) == 'undefined' || type == 'other' || type == 'page') {
            if (response.headers['content-type'] == 'text/html') {
              file = path.join(file, '/index.html');
              type = 'page';
            } else if (response.headers['content-type'] == 'text/css') {
              type = 'css';
            }
          }

          var dir = file.substr(0, file.lastIndexOf('/'));
          mkdirp(dir, (err) => {
            let body = response.body;

            if (err) {
              reject(err)
            }

            this.preProcess(response).then((obj) => {
              fs.writeFile(file, body, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve({
                    body: body,
                    response: response,
                    type: type,
                    url: url
                  });
                }
              })
            }).catch((err) => {
              reject(err);
            })
          })
        }).catch((err) => {
          reject(err);
        });
      })

    });
  }

  checkWhetherToDownload(src) {
    // assume safe to download
    var download = true;

    if (src.indexOf('mailto:') != -1 || src.indexOf('tel:') != -1) {
      // we can't download these..
      download = false;
    } else if (src.indexOf('http://') != -1 || src.indexOf('https://') != -1) {
      // site starts with a http!
      // check if it is this domain
      if (src.indexOf(this.url) == -1) {
        // its not this domain
        // therefore dont download
        download = false;
      }
    } else if (cheeto.isValid('http://' + src.split('/')[0])) {
      // site doesn't have a http or https ahead of it
      // add a http and check if it is a valid domain
      download = false;
    } else if (src.indexOf(this.url) != -1) {
      // contains this url, but doesn't start with http
      // check if subdomain...
      if (src.indexOf(this.url) != 0) {
        // it is a subdomain!
        download = false;
      }
    } else if (src.length > 2 && src[0] == '.' && src[1] == '/') {
      // definitely download

      // remove the first . though
      src = src.substring(1);
    }

    src = src.replace('http://', '').replace('https://', '').replace(this.baseUrl, '');
    if (src[0] == '/') {
      src = src.substring(1);
    }

    src = this.baseUrl + src;

    return {download: download, url: src};
  }

  searchCss(body) {
    var that = this;
    return new Promise((resolve, reject) => {
      let ast = csstree.parse(body);
      csstree.walk(ast, function (node) {
        if (this.declaration !== null && node.type === 'Url') {
          var value = node.value;
          var url;

          if (value.type === 'Raw') {
            url = value;
          } else {
            url = value.value.substr(1, value.value.length - 2);
          }

          var d = that.checkWhetherToDownload(url);

          if (d.download) {
            that.addToQueue(d.url, 'other');
          }
        }
      }); // end css walk
      resolve();
    }); // end promise
  }

  searchHtml(body) {
    var that = this;
    return new Promise((resolve, reject) => {
      let $ = cheerio.load(body);

      $('a').each((i, elem) => {
        let src = $(elem).attr('href');
        if (typeof(src) != 'undefined' && src != '' ) {
          var type = 'other'
          var d = this.checkWhetherToDownload(src);

          if (d.download) {
            that.addToQueue(d.url, type);
          }
        }
      });

      if (this.downloadCss) {
        $('link').each((i, elem) => {
          let src = $(elem).attr('href');
          if (typeof (src) != 'undefined' && src != '') {
            var type = 'css'

            var d = this.checkWhetherToDownload(src);

            if (d.download) {
              that.addToQueue(d.url, type);
            }

          }
        });
      }

      if (this.downloadJs) {
        $('script').each((i, elem) => {
          let src = $(elem).attr('src');
          if (typeof (src) != 'undefined' && src != '') {
            var type = 'javascript'

            var d = this.checkWhetherToDownload(src);

            if (d.download) {
              that.addToQueue(d.url, type);
            }

          }
        });
      }

      if (this.downloadImage) {
        $('img').each((i, elem) => {
          let src = $(elem).attr('src');
          if (typeof (src) != 'undefined' && src != '') {
            var type = 'image'

            var d = this.checkWhetherToDownload(src);

            if (d.download) {
              that.addToQueue(d.url, type);
            }

          }
        });
      }
      resolve();
    });
  }

  go() {
    return new Promise((resolve, reject) => {
      var startInterval = false;
      this.currentSearches++;

      this.saveFile(this.baseUrl, 'page').then((obj) => {
        this.searchHtml(obj.body).then(() => {
          this.currentSearches--;
        });
        startInterval = true;
      });

      var downloadTimer = setInterval(() => {
        if (this.openConnections >= this.maxConnections || !startInterval) {
          return;
        } else {
          if (typeof (this.queue[0]) != 'undefined') {
            var cur = this.queue.shift();
            var found = false;
            for (var i = 0; i < this.downloaded.length; i++) {
              if (this.downloaded[i]['url'] == cur.url) {
                found = true;
                break;
              }
            }

            this.downloaded.push(cur);

            if (!found) {
              this.openConnections++;
              this.finishedCount = 0;
              this.saveFile(cur.url, cur.type).then((obj) => {
                this.openConnections--;
                this.currentSearches++;
                this.postProcess(obj);

                if (obj.type == 'page') {
                  this.searchHtml(obj.body).then(() => {
                    this.currentSearches--;
                    this.stats.html++;
                  });
                } else if (obj.type == 'css') {
                  this.searchCss(obj.body).then(() => {
                    this.currentSearches--;
                    this.stats.css++;
                  });
                } else {
                  this.currentSearches--;
                  if (obj.type == 'javascript') {
                    this.stats.js++;
                  } else if (obj.type == 'image') {
                    this.stats.image++;
                  } else {
                    this.stats.other++;
                  }
                }
                this.stats.total++;
              }).catch((err) => {
                this.stats.failed++;
                this.openConnections--;
                console.log('failed to download ', cur.url);
              });
            }
          } else {
            // we've maybe finished
            // make sure no searches going on!
            if (this.currentSearches == 0) {
              this.finishedCount++;
              if (this.finishedCount > 20) {
                // give it some time
                clearInterval(downloadTimer);
                this.stats.endTime = new Date();
                this.stats.elapsedSecs = (this.stats.endTime / 1000) - (this.stats.startTime / 1000)
                resolve(this.stats);
              }
            }
          }
        }

      }, 50)
    })
  }

  addToQueue(url, type) {
    this.queue.push({
      url: url,
      type: type,
      attempts: 0
    });
  }

}

exports.Crawlee = Crawlee;