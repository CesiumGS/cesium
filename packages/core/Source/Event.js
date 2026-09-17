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
  /**
   * @type {Map<Listener,Set<object>>}
   * @private
   */
  this._listeners = new Map();
  /**
   * @type {Map<Listener,Set<object>>}
   * @private
   */
  this._toRemove = new Map();
  /**
   * @type {Map<Listener,Set<object>>}
   * @private
   */
  this._toAdd = new Map();
  this._invokingListeners = false;
  this._listenerCount = 0; // Tracks number of listener + scope pairs
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
      return this._listenerCount;
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
  const event = this;

  const listenerMap = event._invokingListeners
    ? event._toAdd
    : event._listeners;
  const added = addEventListener(this, listenerMap, listener, scope);
  if (added) {
    event._listenerCount++;
  }

  return function () {
    event.removeEventListener(listener, scope);
  };
};

function addEventListener(event, listenerMap, listener, scope) {
  if (!listenerMap.has(listener)) {
    listenerMap.set(listener, new Set());
  }
  const scopes = listenerMap.get(listener);
  if (!scopes.has(scope)) {
    scopes.add(scope);
    return true;
  }

  return false;
}

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

  const removedFromListeners = removeEventListener(
    this,
    this._listeners,
    listener,
    scope,
  );
  const removedFromToAdd = removeEventListener(
    this,
    this._toAdd,
    listener,
    scope,
  );

  const removed = removedFromListeners || removedFromToAdd;
  if (removed) {
    this._listenerCount--;
  }

  return removed;
};

function removeEventListener(event, listenerMap, listener, scope) {
  const scopes = listenerMap.get(listener);
  if (!scopes || !scopes.has(scope)) {
    return false;
  }

  if (event._invokingListeners) {
    if (!addEventListener(event, event._toRemove, listener, scope)) {
      // Already marked for removal
      return false;
    }
  } else {
    scopes.delete(scope);
    if (scopes.size === 0) {
      listenerMap.delete(listener);
    }
  }

  return true;
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
  this._invokingListeners = true;

  for (const [listener, scopes] of this._listeners.entries()) {
    if (!defined(listener)) {
      continue;
    }

    for (const scope of scopes) {
      listener.apply(scope, arguments);
    }
  }

  this._invokingListeners = false;

  // Actually add items marked for addition
  for (const [listener, scopes] of this._toAdd.entries()) {
    for (const scope of scopes) {
      addEventListener(this, this._listeners, listener, scope);
    }
  }
  this._toAdd.clear();

  // Actually remove items marked for removal
  for (const [listener, scopes] of this._toRemove.entries()) {
    for (const scope of scopes) {
      removeEventListener(this, this._listeners, listener, scope);
    }
  }
  this._toRemove.clear();
};

/**
 * A function that removes a listener.
 * @callback Event.RemoveCallback
 */

export default Event;
