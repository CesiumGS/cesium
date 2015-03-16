# vary

[![NPM version](https://badge.fury.io/js/vary.svg)](http://badge.fury.io/js/vary)
[![Build Status](https://travis-ci.org/expressjs/vary.svg?branch=master)](https://travis-ci.org/expressjs/vary)
[![Coverage Status](https://img.shields.io/coveralls/expressjs/vary.svg?branch=master)](https://coveralls.io/r/expressjs/vary)

Update the Vary header of a response

## Install

```sh
$ npm install vary
```

## API

```js
var vary = require('vary')
```

### vary(res, field)

Adds the given header `field` to the `Vary` response header of `res`.
This can be a string of a single field or an array of multiple fields.

This will append the header if not already listed, otherwise leaves
it listed in the current location.

```js
vary(res, 'Origin')
vary(res, 'User-Agent')
vary(res, ['Accept', 'Accept-Language', 'Accept-Encoding'])
```

## Testing

```sh
$ npm test
```

## License

[MIT](LICENSE)
