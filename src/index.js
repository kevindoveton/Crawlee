const { Crawlee } = require('./scraper');
const cheerio = require('cheerio');


var crawlee = new Crawlee({
  url: 'kdoveton.com',
  protocol: 'https',
  maxConnections: 15
});


crawlee.go().then((stats) => {
  console.log(stats);
  console.log('All done!');
}).catch(() => {
  // this can never be called.. but node likes to have one anyway
});