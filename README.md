# crawlee
Crawlee - Your friendly website scraper


## Usage
todo.. refer to scraper.js and index.js for now
```js
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
```
