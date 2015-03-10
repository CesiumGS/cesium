/*!
 * serve-static
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var escapeHtml = require('escape-html');
var parseurl = require('parseurl');
var resolve = require('path').resolve;
var send = require('send');
var url = require('url');

/**
 * Static:
 *
 *   Static file server with the given `root` path.
 *
 * Examples:
 *
 *     var oneDay = 86400000;
 *     var serveStatic = require('serve-static');
 *
 *     connect()
 *       .use(serveStatic(__dirname + '/public'))
 *
 *     connect()
 *       .use(serveStatic(__dirname + '/public', { maxAge: oneDay }))
 *
 * Options:
 *
 *    - `maxAge`     Browser cache maxAge in milliseconds. defaults to 0
 *    - `hidden`     Allow transfer of hidden files. defaults to false
 *    - `redirect`   Redirect to trailing "/" when the pathname is a dir. defaults to true
 *    - `index`      Default file name, defaults to 'index.html'
 *
 *   Further options are forwarded on to `send`.
 *
 * @param {String} root
 * @param {Object} options
 * @return {Function}
 * @api public
 */

exports = module.exports = function(root, options){
  options = extend({}, options);

  // root required
  if (!root) throw new TypeError('root path required');

  // resolve root to absolute
  root = resolve(root);

  // default redirect
  var redirect = false !== options.redirect;

  // setup options for send
  options.maxage = options.maxage || options.maxAge || 0;
  options.root = root;

  return function staticMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var opts = extend({}, options);
    var originalUrl = url.parse(req.originalUrl || req.url);
    var path = parseurl(req).pathname;

    if (path == '/' && originalUrl.pathname[originalUrl.pathname.length - 1] != '/') {
      return directory();
    }

    function directory() {
      if (!redirect) return next();
      var target;
      originalUrl.pathname += '/';
      target = url.format(originalUrl);
      res.statusCode = 303;
      res.setHeader('Location', target);
      res.end('Redirecting to ' + escapeHtml(target));
    }

    function error(err) {
      if (404 == err.status) return next();
      next(err);
    }

    send(req, path, opts)
      .on('error', error)
      .on('directory', directory)
      .pipe(res);
  };
};

/**
 * Expose mime module.
 *
 * If you wish to extend the mime table use this
 * reference to the "mime" module in the npm registry.
 */

exports.mime = send.mime;

/**
 * Shallow clone a single object.
 *
 * @param {Object} obj
 * @param {Object} source
 * @return {Object}
 * @api private
 */

function extend(obj, source) {
  if (!source) return obj;

  for (var prop in source) {
    obj[prop] = source[prop];
  }

  return obj;
};
