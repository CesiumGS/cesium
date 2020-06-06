import Check from "./Check.js";
import defined from "./defined.js";

/**
 * A generic utility class for managing subscribers for a particular event.
 * This class is usually instantiated inside of a container class and
 * exposed as a property for others to subscribe to.
 *
 * @alias Event
 * @template Listener extends (...args: any[]) => void = (...args: any[]) => void
 * @constructor
 * @example
 * MyObject.prototype.myListener = function(arg1, arg2) {
 *     this.myArg1Copy = arg1;
 *     this.myArg2Copy = arg2;
 * }
 *
 * var myObjectInstance = new MyObject();
 * var evt = new Cesium.Event();
 * evt.addEventListener(MyObject.prototype.myListener, myObjectInstance);
 * evt.raiseEvent('1', '2');
 * evt.removeEventListener(MyObject.prototype.myListener);
 */
function Event() {
  this._listeners = [];
  this._scopes = [];
  this._toRemove = [];
  this._insideRaiseEvent = false;
}

Object.defineProperties(Event.prototype, {
  /**
   * The number of listeners currently subscribed to the event.
   * @memberof Event.prototype
   * @type {Number}
   * @readonly
   */
  numberOfListeners: {
    get: function () {
      return this._listeners.length - this._toRemove.length;
    },
  },
});

/**
 * Registers a callback function to be executed whenever the event is raised.
 * An optional scope can be provided to serve as the <code>this</code> pointer
 * in which the function will execute.
 *
 * @param {Listener} listener The function to be executed when the event is raised.
 * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
 *        pointer in which the listener function will execute.
 * @returns {Event.RemoveCallback} A function that will remove this event listener when invoked.
 *
 * @see Event#raiseEvent
 * @see Event#removeEventListener
 */
Event.prototype.addEventListener = function (listener, scope) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("listener", listener);
  //>>includeEnd('debug');

  this._listeners.push(listener);
  this._scopes.push(scope);

  var event = this;
  return function () {
    event.removeEventListener(listener, scope);
  };
};

/**
 * Unregisters a previously registered callback.
 *
 * @param {Listener} listener The function to be unregistered.
 * @param {Object} [scope] The scope that was originally passed to addEventListener.
 * @returns {Boolean} <code>true</code> if the listener was removed; <code>false</code> if the listener and scope are not registered with the event.
 *
 * @see Event#addEventListener
 * @see Event#raiseEvent
 */
Event.prototype.removeEventListener = function (listener, scope) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("listener", listener);
  //>>includeEnd('debug');

  var listeners = this._listeners;
  var scopes = this._scopes;

  var index = -1;
  for (var i = 0; i < listeners.length; i++) {
    if (listeners[i] === listener && scopes[i] === scope) {
      index = i;
      break;
    }
  }

  if (index !== -1) {
    if (this._insideRaiseEvent) {
      //In order to allow removing an event subscription from within
      //a callback, we don't actually remove the items here.  Instead
      //remember the index they are at and undefined their value.
      this._toRemove.push(index);
      listeners[index] = undefined;
      scopes[index] = undefined;
    } else {
      listeners.splice(index, 1);
      scopes.splice(index, 1);
    }
    return true;
  }

  return false;
};

function compareNumber(a, b) {
  return b - a;
}

/**
 * Raises the event by calling each registered listener with all supplied arguments.
 *
 * @param {...Parameters<Listener>} arguments This method takes any number of parameters and passes them through to the listener functions.
 *
 * @see Event#addEventListener
 * @see Event#removeEventListener
 */
Event.prototype.raiseEvent = function () {
  this._insideRaiseEvent = true;

  var i;
  var listeners = this._listeners;
  var scopes = this._scopes;
  var length = listeners.length;

  for (i = 0; i < length; i++) {
    var listener = listeners[i];
    if (defined(listener)) {
      listeners[i].apply(scopes[i], arguments);
    }
  }

  //Actually remove items removed in removeEventListener.
  var toRemove = this._toRemove;
  length = toRemove.length;
  if (length > 0) {
    toRemove.sort(compareNumber);
    for (i = 0; i < length; i++) {
      var index = toRemove[i];
      listeners.splice(index, 1);
      scopes.splice(index, 1);
    }
    toRemove.length = 0;
  }

  this._insideRaiseEvent = false;
};

/**
 * A function that removes a listener.
 * @callback Event.RemoveCallback
 */

export default Event;
