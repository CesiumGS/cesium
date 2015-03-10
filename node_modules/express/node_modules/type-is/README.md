# type-is [![Build Status](https://travis-ci.org/expressjs/type-is.svg?branch=master)](https://travis-ci.org/expressjs/type-is) [![NPM version](https://badge.fury.io/js/type-is.svg)](https://badge.fury.io/js/type-is)

Infer the content-type of a request.

### Install

```sh
$ npm install type-is
```

## API

```js
var http = require('http')
var is   = require('type-is')

http.createServer(function (req, res) {
  is(req, ['text/*'])
})
```

### type = is(request, types)

`request` is the node HTTP request. `types` is an array of types.

```js
// req.headers.content-type = 'application/json'

is(req, ['json'])             // 'json'
is(req, ['html', 'json'])     // 'json'
is(req, ['application/*'])    // 'application/json'
is(req, ['application/json']) // 'application/json'

is(req, ['html']) // false
```

#### Each type can be:

- An extension name such as `json`. This name will be returned if matched.
- A mime type such as `application/json`.
- A mime type with a wildcard such as `*/json` or `application/*`. The full mime type will be returned if matched
- A suffix such as `+json`. This can be combined with a wildcard such as `*/vnd+json` or `application/*+json`. The full mime type will be returned if matched.

`false` will be returned if no type matches.

## Examples

#### Example body parser

```js
var is = require('type-is');
var parse = require('body');
var busboy = require('busboy');

function bodyParser(req, res, next) {
  var hasRequestBody = 'content-type' in req.headers
    || 'transfer-encoding' in req.headers;
  if (!hasRequestBody) return next();

  switch (is(req, ['urlencoded', 'json', 'multipart'])) {
    case 'urlencoded':
      // parse urlencoded body
      break
    case 'json':
      // parse json body
      break
    case 'multipart':
      // parse multipart body
      break
    default:
      // 415 error code
  }
}
```

## License

The MIT License (MIT)

Copyright (c) 2013 Jonathan Ong me@jongleberry.com

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
