# serve-static

[![NPM version](https://badge.fury.io/js/serve-static.svg)](http://badge.fury.io/js/serve-static)
[![Build Status](https://travis-ci.org/expressjs/serve-static.svg?branch=master)](https://travis-ci.org/expressjs/serve-static)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/serve-static.svg?branch=master)](https://coveralls.io/r/expressjs/serve-static)

Previously `connect.static()`.

## Install

```sh
$ npm install serve-static
```

## API

```js
var serveStatic = require('serve-static')
```

### serveStatic(root, options)

Create a new middleware function to serve files from within a given root
directory. The file to serve will be determined by combining `req.url`
with the provided root directory.

Options:

- `hidden` Allow transfer of hidden files. defaults to `false`
- `index` Default file name, defaults to `'index.html'`
- `maxAge` Browser cache maxAge in milliseconds. defaults to `0`
- `redirect` Redirect to trailing "/" when the pathname is a dir. defaults to `true`

## Examples

### Serve files with vanilla node.js http server

```js
var finalhandler = require('finalhandler')
var http = require('http')
var serveStatic = require('serve-static')

// Serve up public/ftp folder
var serve = serveStatic('public/ftp', {'index': ['index.html', 'index.htm']})

// Create server
var server = http.createServer(function(req, res){
  var done = finalhandler(req, res)
  serve(req, res, done)
})

// Listen
server.listen(3000)
```

### Serve all files from ftp folder

```js
var connect = require('connect')
var serveStatic = require('serve-static')

var app = connect()

app.use(serveStatic('public/ftp', {'index': ['default.html', 'default.htm']}))
app.listen(3000)
```

## License

The MIT License (MIT)

Copyright (c) 2014 Douglas Christopher Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
