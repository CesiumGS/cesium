/*!
 * on-headers
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Reference to Array slice.
 */

var slice = Array.prototype.slice

/**
 * Execute a listener when a response is about to write headers.
 *
 * @param {Object} res
 * @return {Function} listener
 * @api public
 */

module.exports = function onHeaders(res, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('listener must be a function')
  }

  res.writeHead = createWriteHead(res.writeHead, listener)
}

function createWriteHead(prevWriteHead, listener) {
  var fired = false;

  // return function with core name and argument list
  return function writeHead(statusCode) {
    // set headers from arguments
    var args = setWriteHeadHeaders.apply(this, arguments);

    // fire listener
    if (!fired) {
      fired = true
      listener.call(this)
    }

    prevWriteHead.apply(this, args);
  }
}

function setWriteHeadHeaders(statusCode) {
  var headerIndex = typeof arguments[1] === 'string'
    ? 2
    : 1

  var headers = arguments[headerIndex]

  this.statusCode = statusCode

  // the following block is from node.js core
  if (Array.isArray(headers)) {
    // handle array case
    for (var i = 0, len = headers.length; i < len; ++i) {
      this.setHeader(headers[i][0], headers[i][1])
    }
  } else if (headers) {
    // handle object case
    var keys = Object.keys(headers)
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      if (k) this.setHeader(k, headers[k])
    }
  }

  return slice.call(arguments, 0, headerIndex)
}
