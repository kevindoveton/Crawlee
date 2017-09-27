# crawlee
Crawlee - Your friendly website scraper


## Usage
todo.. refer to scraper.js and index.js for now
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
