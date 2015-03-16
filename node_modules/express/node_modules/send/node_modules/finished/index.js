/*!
 * finished
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

/**
* Module dependencies.
*/

var first = require('ee-first')

/**
* Variables.
*/

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) }

/**
 * Invoke callback when the response has finished, useful for
 * cleaning up resources afterwards.
 *
 * @param {object} thingie
 * @param {function} callback
 * @return {object}
 * @api public
 */

module.exports = function finished(thingie, callback) {
  var socket = thingie.socket || thingie
  var res = thingie.res || thingie

  if (res.finished || !socket.writable) {
    defer(callback)
    return thingie
  }

  var listener = res.__onFinished

  // create a private single listener with queue
  if (!listener || !listener.queue) {
    listener = res.__onFinished = function onFinished(err) {
      if (res.__onFinished === listener) res.__onFinished = null
      var queue = listener.queue || []
      while (queue.length) queue.shift()(err)
    }
    listener.queue = []

    // finished on first event
    first([
      [socket, 'error', 'close'],
      [res, 'finish'],
    ], listener)
  }

  listener.queue.push(callback)

  return thingie
}
