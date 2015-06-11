/*
 * Copyright (c) 2013 nazomikan
 * https://github.com/nazomikan/PubsubJS
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function (name, global, definition) {
  if (typeof module !== 'undefined') {
    module.exports = definition();
  } else if (typeof require !== 'undefined' && typeof require.amd === 'object') {
    define(definition);
  } else {
    global[name] = definition();
  }
})('Pubsub', this, function () {
  var arrayProto = Array.prototype
    , slice = arrayProto.slice
    ;

  function Context() {
    this.subscribers = {};
  }

  Context.create = function createContext() {
    var context = createObject(Context.prototype)
      , args = slice.call(arguments)
      ;

    Context.apply(context, args);
    return context;
  };

  Context.prototype.publish = function (/*eventName, context, args*/) {
    var args = slice.call(arguments)
      , eventName = args.shift()
      , context = args.shift()
      , subscribers = this.subscribers[eventName] || []
      , params = [context].concat(args)
      , i
      , l
      , c
      ;

    if (!checkContext(context)) {
      throw new TypeError('publish: The second arguments must be pubsub#Context or Null');
    }

    for (i = 0, l = subscribers.length; i < l; i++) {
      subscribers[i].apply(null, params);
      // length may change by subscribeOnce.
      l !== (c = subscribers.length) && (--i, l = c);
    }
  };

  Context.prototype.subscribe = function (eventName, handler) {
    this.subscribers[eventName] = this.subscribers[eventName] || [];
    this.subscribers[eventName].push(handler);
  };

  Context.prototype.subscribeOnce = function (eventName, handler) {
    var that = this
      , func
      ;

    func = function () {
      var args = slice.call(arguments);
      handler.apply(null, args);
      that.unsubscribe(eventName, func);
    };

    that.subscribe(eventName, func);
  };

  Context.prototype.unsubscribe = function (eventName, handler) {
    var subscribers = this.subscribers
      , targetSubscribers = subscribers[eventName] || []
      , i
      , iz
      ;

    if (!handler) {
      delete subscribers[eventName];
      return;
    }

    for (i = targetSubscribers.length - 1, iz = 0; i >= iz; i--) {
      // fn.guid -> support jquery.proxy
      if (targetSubscribers[i] === handler || (handler.guid && (targetSubscribers[i].guid === handler.guid))) {
        targetSubscribers.splice(i, 1);
      }
    }
  };

  Context.prototype.dump = function (eventName) {
    return eventName ? (this.subscribers[eventName] || []) : this.subscribers;
  };

  function Pubsub() {
    this.Context = Context;
    this.globalContext = Context.create();
  }

  Pubsub.create = function () {
    var pubsub = createObject(Pubsub.prototype)
      , args = slice.call(arguments)
      ;

    Pubsub.apply(pubsub, args);
    return pubsub;
  };

  Pubsub.prototype.publish = function (/*eventName, context, args*/) {
    var args = slice.call(arguments)
      , eventName = args.shift()
      , globalContext = this.globalContext
      , context = args.shift()
      , params = [eventName, context].concat(args)
      ;

    globalContext.publish.apply(globalContext, params);
  };

  Pubsub.prototype.subscribe = function (eventName, handler) {
    var context = this.globalContext
      ;
    context.subscribe(eventName, handler);
  };

  Pubsub.prototype.subscribeOnce = function (eventName, handler) {
    var context = this.globalContext
      ;
    context.subscribeOnce(eventName, handler);
  };

  Pubsub.prototype.unsubscribe = function (eventName, handler) {
    var context = this.globalContext
      ;
    context.unsubscribe(eventName, handler);
  };

  Pubsub.prototype.dump = function (eventName) {
    var context = this.globalContext
      ;
    return context.dump(eventName);
  }

  function createObject(obj) {
    if (Object.create) {
      return Object.create(obj);
    }

    if (arguments.length > 1) {
      throw new Error('Object.create implementation only accepts the first parameter.');
    }
    function F() {}
    F.prototype = obj;
    return new F();
  }

  function checkContext(obj) {
    if (!(obj instanceof Context) &&
      !(obj instanceof Pubsub) &&
      !(obj == null)) {
      return false;
    }
    return true;
  }

  return Pubsub;
});
