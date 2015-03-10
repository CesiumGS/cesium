# finished

[![NPM Version](https://badge.fury.io/js/finished.svg)](http://badge.fury.io/js/finished)
[![Build Status](https://travis-ci.org/expressjs/finished.svg?branch=master)](https://travis-ci.org/expressjs/finished)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/finished.svg?branch=master)](https://coveralls.io/r/expressjs/finished)

Execute a callback when a request closes, finishes, or errors.

#### Install

```sh
$ npm install finished
```

#### Uses

This is useful for cleaning up streams. For example, you want to destroy any file streams you create on socket errors otherwise you will leak file descriptors.

This is required to fix what many perceive as issues with node's streams. Relevant:

- [node#6041](https://github.com/joyent/node/issues/6041)
- [koa#184](https://github.com/koajs/koa/issues/184)
- [koa#165](https://github.com/koajs/koa/issues/165)

## API

### finished(response, callback)

```js
var onFinished = require('finished')

onFinished(res, function (err) {
  // do something maybe
})
```

### Examples

The following code ensures that file descriptors are always closed once the response finishes.

#### Node / Connect / Express

```js
var onFinished = require('finished')

function (req, res, next) {
  var stream = fs.createReadStream('thingie.json')
  stream.pipe(res)
  onFinished(res, function (err) {
    stream.destroy()
  })
}
```

#### Koa

```js
function* () {
  var stream = this.body = fs.createReadStream('thingie.json')
  onFinished(this, function (err) {
    stream.destroy()
  })
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
