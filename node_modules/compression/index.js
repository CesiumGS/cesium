/*!
 * compression
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var zlib = require('zlib');
var accepts = require('accepts');
var bytes = require('bytes');
var onHeaders = require('on-headers');
var compressible = require('compressible');
var vary = require('vary');

/**
 * Supported content-encoding methods.
 */

exports.methods = {
    gzip: zlib.createGzip
  , deflate: zlib.createDeflate
};

/**
 * Default filter function.
 */

exports.filter = function(req, res){
  return compressible(res.getHeader('Content-Type'));
};

/**
 * Compress response data with gzip / deflate.
 *
 * See README.md for documentation of options.
 *
 * @param {Object} options
 * @return {Function} middleware
 * @api public
 */

module.exports = function compression(options) {
  options = options || {};
  var filter = options.filter || exports.filter;
  var threshold;

  if (false === options.threshold || 0 === options.threshold) {
    threshold = 0
  } else if ('string' === typeof options.threshold) {
    threshold = bytes(options.threshold)
  } else {
    threshold = options.threshold || 1024
  }

  return function compression(req, res, next){
    var compress = true
    var listeners = []
    var write = res.write
    var on = res.on
    var end = res.end
    var stream

    // see #8
    req.on('close', function(){
      res.write = res.end = function(){};
    });

    // flush is noop by default
    res.flush = noop;

    // proxy

    res.write = function(chunk, encoding){
      if (!this._header) {
        // if content-length is set and is lower
        // than the threshold, don't compress
        var length = res.getHeader('content-length');
        if (!isNaN(length) && length < threshold) compress = false;
        this._implicitHeader();
      }
      return stream
        ? stream.write(new Buffer(chunk, encoding))
        : write.call(res, chunk, encoding);
    };

    res.end = function(chunk, encoding){
      var len

      if (chunk) {
        len = Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding)
      }

      if (!this._header) {
        compress = len && len >= threshold
      }

      if (chunk) {
        this.write(chunk, encoding);
      }

      return stream
        ? stream.end()
        : end.call(res);
    };

    res.on = function(type, listener){
      if (!listeners || type !== 'drain') {
        return on.call(this, type, listener)
      }

      if (stream) {
        return stream.on(type, listener)
      }

      // buffer listeners for future stream
      listeners.push([type, listener])

      return this
    }

    function nocompress(){
      addListeners(res, on, listeners)
      listeners = null
    }

    onHeaders(res, function(){
      // default request filter
      if (!filter(req, res)) return nocompress()

      // vary
      vary(res, 'Accept-Encoding')

      if (!compress) return nocompress()

      var encoding = res.getHeader('Content-Encoding') || 'identity';

      // already encoded
      if ('identity' !== encoding) return nocompress()

      // head
      if ('HEAD' === req.method) return nocompress()

      // compression method
      var accept = accepts(req);
      var method = accept.encodings(['gzip', 'deflate', 'identity']);

      // negotiation failed
      if (!method || method === 'identity') return nocompress()

      // compression stream
      stream = exports.methods[method](options);
      addListeners(stream, stream.on, listeners)

      // overwrite the flush method
      res.flush = function(){
        stream.flush();
      }

      // header fields
      res.setHeader('Content-Encoding', method);
      res.removeHeader('Content-Length');

      // compression
      stream.on('data', function(chunk){
        if (write.call(res, chunk) === false) {
          stream.pause()
        }
      });

      stream.on('end', function(){
        end.call(res);
      });

      on.call(res, 'drain', function() {
        stream.resume()
      });
    });

    next();
  };
};

/**
 * Add bufferred listeners to stream
 */

function addListeners(stream, on, listeners) {
  for (var i = 0; i < listeners.length; i++) {
    on.apply(stream, listeners[i])
  }
}

function noop(){}
