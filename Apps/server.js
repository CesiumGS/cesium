/*global require,__dirname,unescape,console*/
/*jshint es3:false*/
'use strict';

var connect = require('connect');
var http = require('http');
var url=require('url');

function extractProxyUrl(requestUrl) {
  var queryStringStart = requestUrl.indexOf('?');
  var proxyUrl = requestUrl.substring(queryStringStart + 1);
  proxyUrl = unescape(proxyUrl);
  return proxyUrl;
}

function proxyMiddleware(request, response, next) {
  if (request.url.indexOf('/proxy') === 0) {
    //TODO handle case of no url - return 400 'No url specified.''
    var proxyUrl = extractProxyUrl(request.url);
    
    http.request(url.parse(proxyUrl), function(proxyResponse) {
      proxyResponse.on('data', function (chunk) {
        response.write(chunk, 'binary');
      });
      proxyResponse.on('end', function () {
        response.end();
      });
    }).end();
  } else {
    next();
  }
}

var app = connect();
app.use(proxyMiddleware);
app.use(connect.static(__dirname));
app.listen(8080);

console.log('Cessium node.js server running, try me at http://localhost:8080/HelloWorld.html');