# crawlee
Crawlee - Your friendly website scraper. Crawlee allows you to scrape a website and its resources, apply some pre/post processing and then save the resulting content to file. This can be useful to generate offline backups of sites, or to convert your cms based website into a static site to decrease load times!


## Usage
```js
const { Crawlee } = require('./scraper');

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
```

#### The API
```js
/**
 * Crawlee - a scraper!
 * @param {object} obj - an object containing many configuration options!
 * url - string - the starting url to scrape 
 * protocol - string - http or https
 * baseDir - string - download directory
 * downloadJs - bool - whether to download javascript files
 * downloadCss - bool - whether to download css files
 * downloadImage - bool - whether to download images
 * maxConnections - int - the maximum number of connections
 * preProcess - function - process to run after downloading, must return a promise
 * gets a copy of response, resolve with this response, will save 
 * rejecting will stop file saving
 * postProcess - function - process to run after saving
*/
```
