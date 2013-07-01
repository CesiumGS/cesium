/*global require,__dirname*/
var connect = require('connect');
connect.createServer(
 connect.static(__dirname)
).listen(8080);