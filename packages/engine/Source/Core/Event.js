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
 * const myObjectInstance = new MyObject();
 * const evt = new Cesium.Event();
 * evt.addEventListener(MyObject.prototype.myListener, myObjectInstance);
 * evt.raiseEvent('1', '2');
 * evt.removeEventListener(MyObject.prototype.myListener);
 */
function Event() {
  this._listeners = new Map();
  this._toRemove = [];
  this._insideRaiseEvent = false;
}

Object.defineProperties(Event.prototype, {
  /**
   * The number of listeners currently subscribed to the event.
   * @memberof Event.prototype
   * @type {number}
   * @readonly
   */
  numberOfListeners: {
    get: function () {
      return this._listeners.size - this._toRemove.length;
    },
  },
});

/**
 * Registers a callback function to be executed whenever the event is raised.
 * An optional scope can be provided to serve as the <code>this</code> pointer
 * in which the function will execute.
 *
 * @param {Listener} listener The function to be executed when the event is raised.
 * @param {object} [scope] An optional object scope to serve as the <code>this</code>
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

  this._listeners.set(listener, scope);

  const event = this;
  return function () {
    event.removeEventListener(listener, scope);
  };
};

/**
 * Unregisters a previously registered callback.
 *
 * @param {Listener} listener The function to be unregistered.
 * @param {object} [scope] The scope that was originally passed to addEventListener.
 * @returns {boolean} <code>true</code> if the listener was removed; <code>false</code> if the listener and scope are not registered with the event.
 *
 * @see Event#addEventListener
 * @see Event#raiseEvent
 */
Event.prototype.removeEventListener = function (listener, scope) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("listener", listener);
  //>>includeEnd('debug');

  if (!this._listeners.has(listener)) {
    return false;
  }

  if (this._insideRaiseEvent) {
    // Mark for removal after raiseEvent
    this._toRemove.push(listener);
    this._listeners.set(listener, undefined);
  } else {
    this._listeners.delete(listener);
  }
  return true;
};

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

  for (const [listener, scope] of this._listeners.entries()) {
    if (defined(listener)) {
      listener.apply(scope, arguments);
    }
  }

  // Actually remove items marked for removal
  if (this._toRemove.length > 0) {
    for (const listener of this._toRemove) {
      this._listeners.delete(listener);
    }
    this._toRemove.length = 0;
  }

  this._insideRaiseEvent = false;
};

/**
 * A function that removes a listener.
 * @callback Event.RemoveCallback
 */

export default Event;
