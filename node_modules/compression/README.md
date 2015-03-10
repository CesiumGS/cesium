# compression

[![NPM version](https://badge.fury.io/js/compression.svg)](http://badge.fury.io/js/compression)
[![Build Status](https://travis-ci.org/expressjs/compression.svg?branch=master)](https://travis-ci.org/expressjs/compression)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/compression.svg?branch=master)](https://coveralls.io/r/expressjs/compression)

Node.js compression middleware.

## API

```js
var express     = require('express')
var compression = require('compression')

var app = express()
app.use(compression())
```

### compression(options)

Returns the compression middleware using the given `options`.

```js
app.use(compression({
  threshold: 512
}))
```

#### Options

- `threshold` `<1kb>` - response is only compressed if the byte size is at or above this threshold.
- `filter` - a filtering callback function. Uses [Compressible](https://github.com/expressjs/compressible) by default.

In addition to these, [zlib](http://nodejs.org/api/zlib.html) options may be passed in to the options object.

## License

The MIT License (MIT)

Copyright (c) 2014 Jonathan Ong me@jongleberry.com

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
