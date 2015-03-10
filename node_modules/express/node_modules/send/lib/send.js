
/**
 * Module dependencies.
 */

var debug = require('debug')('send')
var escapeHtml = require('escape-html')
  , parseRange = require('range-parser')
  , Stream = require('stream')
  , mime = require('mime')
  , fresh = require('fresh')
  , path = require('path')
  , http = require('http')
  , onFinished = require('finished')
  , fs = require('fs')
  , basename = path.basename
  , normalize = path.normalize
  , join = path.join
  , utils = require('./utils');

var upPathRegexp = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

/**
 * Expose `send`.
 */

exports = module.exports = send;

/**
 * Expose mime module.
 */

exports.mime = mime;

/**
 * Return a `SendStream` for `req` and `path`.
 *
 * @param {Request} req
 * @param {String} path
 * @param {Object} options
 * @return {SendStream}
 * @api public
 */

function send(req, path, options) {
  return new SendStream(req, path, options);
}

/**
 * Initialize a `SendStream` with the given `path`.
 *
 * Events:
 *
 *  - `error` an error occurred
 *  - `stream` file streaming has started
 *  - `end` streaming has completed
 *  - `directory` a directory was requested
 *
 * @param {Request} req
 * @param {String} path
 * @param {Object} options
 * @api private
 */

function SendStream(req, path, options) {
  var self = this;
  options = options || {};
  this.req = req;
  this.path = path;
  this.options = options;
  this.etag(('etag' in options) ? options.etag : true);
  this.maxage(options.maxage);
  this.hidden(options.hidden);
  this.index(('index' in options) ? options.index : 'index.html');
  if (options.root || options.from) this.root(options.root || options.from);
}

/**
 * Inherits from `Stream.prototype`.
 */

SendStream.prototype.__proto__ = Stream.prototype;

/**
 * Enable or disable etag generation.
 *
 * @param {Boolean} val
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.etag = function(val){
  val = Boolean(val);
  debug('etag %s', val);
  this._etag = val;
  return this;
};

/**
 * Enable or disable "hidden" (dot) files.
 *
 * @param {Boolean} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.hidden = function(val){
  val = Boolean(val);
  debug('hidden %s', val);
  this._hidden = val;
  return this;
};

/**
 * Set index `paths`, set to a falsy
 * value to disable index support.
 *
 * @param {String|Boolean|Array} paths
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.index = function index(paths){
  var index = !paths ? [] : Array.isArray(paths) ? paths : [paths];
  debug('index %o', paths);
  this._index = index;
  return this;
};

/**
 * Set root `path`.
 *
 * @param {String} path
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.root = 
SendStream.prototype.from = function(path){
  path = String(path);
  this._root = normalize(path);
  return this;
};

/**
 * Set max-age to `ms`.
 *
 * @param {Number} ms
 * @return {SendStream}
 * @api public
 */

SendStream.prototype.maxage = function(ms){
  ms = Number(ms);
  if (isNaN(ms)) ms = 0;
  if (Infinity == ms) ms = 60 * 60 * 24 * 365 * 1000;
  debug('max-age %d', ms);
  this._maxage = ms;
  return this;
};

/**
 * Emit error with `status`.
 *
 * @param {Number} status
 * @api private
 */

SendStream.prototype.error = function(status, err){
  var res = this.res;
  var msg = http.STATUS_CODES[status];

  err = err || new Error(msg);
  err.status = status;

  // emit if listeners instead of responding
  if (this.listeners('error').length) {
    return this.emit('error', err);
  }

  // wipe all existing headers
  res._headers = undefined;

  res.statusCode = err.status;
  res.end(msg);
};

/**
 * Check if the pathname is potentially malicious.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isMalicious = function(){
  return !this._root && ~this.path.indexOf('..') && upPathRegexp.test(this.path);
};

/**
 * Check if the pathname ends with "/".
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.hasTrailingSlash = function(){
  return '/' == this.path[this.path.length - 1];
};

/**
 * Check if the basename leads with ".".
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.hasLeadingDot = function(){
  return '.' == basename(this.path)[0];
};

/**
 * Check if this is a conditional GET request.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isConditionalGET = function(){
  return this.req.headers['if-none-match']
    || this.req.headers['if-modified-since'];
};

/**
 * Strip content-* header fields.
 *
 * @api private
 */

SendStream.prototype.removeContentHeaderFields = function(){
  var res = this.res;
  Object.keys(res._headers).forEach(function(field){
    if (0 == field.indexOf('content')) {
      res.removeHeader(field);
    }
  });
};

/**
 * Respond with 304 not modified.
 *
 * @api private
 */

SendStream.prototype.notModified = function(){
  var res = this.res;
  debug('not modified');
  this.removeContentHeaderFields();
  res.statusCode = 304;
  res.end();
};

/**
 * Raise error that headers already sent.
 *
 * @api private
 */

SendStream.prototype.headersAlreadySent = function headersAlreadySent(){
  var err = new Error('Can\'t set headers after they are sent.');
  debug('headers already sent');
  this.error(500, err);
};

/**
 * Check if the request is cacheable, aka
 * responded with 2xx or 304 (see RFC 2616 section 14.2{5,6}).
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isCachable = function(){
  var res = this.res;
  return (res.statusCode >= 200 && res.statusCode < 300) || 304 == res.statusCode;
};

/**
 * Handle stat() error.
 *
 * @param {Error} err
 * @api private
 */

SendStream.prototype.onStatError = function(err){
  var notfound = ['ENOENT', 'ENAMETOOLONG', 'ENOTDIR'];
  if (~notfound.indexOf(err.code)) return this.error(404, err);
  this.error(500, err);
};

/**
 * Check if the cache is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isFresh = function(){
  return fresh(this.req.headers, this.res._headers);
};

/**
 * Check if the range is fresh.
 *
 * @return {Boolean}
 * @api private
 */

SendStream.prototype.isRangeFresh = function isRangeFresh(){
  var ifRange = this.req.headers['if-range'];

  if (!ifRange) return true;

  return ~ifRange.indexOf('"')
    ? ~ifRange.indexOf(this.res._headers['etag'])
    : Date.parse(this.res._headers['last-modified']) <= Date.parse(ifRange);
};

/**
 * Redirect to `path`.
 *
 * @param {String} path
 * @api private
 */

SendStream.prototype.redirect = function(path){
  if (this.listeners('directory').length) return this.emit('directory');
  if (this.hasTrailingSlash()) return this.error(403);
  var res = this.res;
  path += '/';
  res.statusCode = 301;
  res.setHeader('Location', path);
  res.end('Redirecting to ' + escapeHtml(path));
};

/**
 * Pipe to `res.
 *
 * @param {Stream} res
 * @return {Stream} res
 * @api public
 */

SendStream.prototype.pipe = function(res){
  var self = this
    , args = arguments
    , path = this.path
    , root = this._root;

  // references
  this.res = res;

  // invalid request uri
  path = utils.decode(path);
  if (-1 == path) return this.error(400);

  // null byte(s)
  if (~path.indexOf('\0')) return this.error(400);

  // join / normalize from optional root dir
  if (root) path = normalize(join(this._root, path));

  // ".." is malicious without "root"
  if (this.isMalicious()) return this.error(403);

  // malicious path
  if (root && 0 != path.indexOf(root)) return this.error(403);

  // hidden file support
  if (!this._hidden && this.hasLeadingDot()) return this.error(404);

  // index file support
  if (this._index.length && this.hasTrailingSlash()) {
    this.sendIndex(path);
    return res;
  }

  debug('stat "%s"', path);
  fs.stat(path, function(err, stat){
    if (err) return self.onStatError(err);
    if (stat.isDirectory()) return self.redirect(self.path);
    self.emit('file', path, stat);
    self.send(path, stat);
  });

  return res;
};

/**
 * Transfer `path`.
 *
 * @param {String} path
 * @api public
 */

SendStream.prototype.send = function(path, stat){
  var options = this.options;
  var len = stat.size;
  var res = this.res;
  var req = this.req;
  var ranges = req.headers.range;
  var offset = options.start || 0;

  if (res._header) {
    // impossible to send now
    return this.headersAlreadySent();
  }

  // set header fields
  this.setHeader(path, stat);

  // set content-type
  this.type(path);

  // conditional GET support
  if (this.isConditionalGET()
    && this.isCachable()
    && this.isFresh()) {
    return this.notModified();
  }

  // adjust len to start/end options
  len = Math.max(0, len - offset);
  if (options.end !== undefined) {
    var bytes = options.end - offset + 1;
    if (len > bytes) len = bytes;
  }

  // Range support
  if (ranges) {
    ranges = parseRange(len, ranges);

    // If-Range support
    if (!this.isRangeFresh()) {
      debug('range stale');
      ranges = -2;
    }

    // unsatisfiable
    if (-1 == ranges) {
      debug('range unsatisfiable');
      res.setHeader('Content-Range', 'bytes */' + stat.size);
      return this.error(416);
    }

    // valid (syntactically invalid/multiple ranges are treated as a regular response)
    if (-2 != ranges && ranges.length === 1) {
      debug('range %j', ranges);

      options.start = offset + ranges[0].start;
      options.end = offset + ranges[0].end;

      // Content-Range
      res.statusCode = 206;
      res.setHeader('Content-Range', 'bytes '
        + ranges[0].start
        + '-'
        + ranges[0].end
        + '/'
        + len);
      len = options.end - options.start + 1;
    }
  }

  // content-length
  res.setHeader('Content-Length', len);

  // HEAD support
  if ('HEAD' == req.method) return res.end();

  this.stream(path, options);
};

/**
 * Transfer index for `path`.
 *
 * @param {String} path
 * @api private
 */
SendStream.prototype.sendIndex = function sendIndex(path){
  var i = -1;
  var self = this;

  function next(err){
    if (++i >= self._index.length) {
      if (err) return self.onStatError(err);
      return self.error(404);
    }

    var p = path + self._index[i];

    debug('stat "%s"', p);
    fs.stat(p, function(err, stat){
      if (err) return next(err);
      if (stat.isDirectory()) return next();
      self.emit('file', p, stat);
      self.send(p, stat);
    });
  }

  if (!this.hasTrailingSlash()) path += '/';

  next();
};

/**
 * Stream `path` to the response.
 *
 * @param {String} path
 * @param {Object} options
 * @api private
 */

SendStream.prototype.stream = function(path, options){
  // TODO: this is all lame, refactor meeee
  var finished = false;
  var self = this;
  var res = this.res;
  var req = this.req;

  // pipe
  var stream = fs.createReadStream(path, options);
  this.emit('stream', stream);
  stream.pipe(res);

  // response finished, done with the fd
  onFinished(res, function onfinished(){
    finished = true;
    stream.destroy();
  });

  // error handling code-smell
  stream.on('error', function onerror(err){
    // request already finished
    if (finished) return;

    // clean up stream
    finished = true;
    stream.destroy();

    // no hope in responding
    if (res._header) {
      console.error(err.stack);
      req.destroy();
      return;
    }

    // error
    self.onStatError(err);
  });

  // end
  stream.on('end', function onend(){
    self.emit('end');
  });
};

/**
 * Set content-type based on `path`
 * if it hasn't been explicitly set.
 *
 * @param {String} path
 * @api private
 */

SendStream.prototype.type = function(path){
  var res = this.res;
  if (res.getHeader('Content-Type')) return;
  var type = mime.lookup(path);
  var charset = mime.charsets.lookup(type);
  debug('content-type %s', type);
  res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
};

/**
 * Set response header fields, most
 * fields may be pre-defined.
 *
 * @param {String} path
 * @param {Object} stat
 * @api private
 */

SendStream.prototype.setHeader = function setHeader(path, stat){
  var res = this.res;
  if (!res.getHeader('Accept-Ranges')) res.setHeader('Accept-Ranges', 'bytes');
  if (!res.getHeader('Date')) res.setHeader('Date', new Date().toUTCString());
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'public, max-age=' + Math.floor(this._maxage / 1000));
  if (!res.getHeader('Last-Modified')) res.setHeader('Last-Modified', stat.mtime.toUTCString());

  if (this._etag && !res.getHeader('ETag')) {
    var etag = utils.etag(path, stat);
    debug('etag %s', etag);
    res.setHeader('ETag', etag);
  }
};
