/*global define*/
define([
        './defineProperties',
        './DeveloperError'
    ], function(
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * A generic utility class for managing subscribers for a particular event.
     * This class is usually instantiated inside of a container class and
     * exposed as a property for others to subscribe to.
     *
     * @alias Event
     * @constructor
     *
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
    var Event = function() {
        this._listeners = [];
        this._scopes = [];
    };

    defineProperties(Event.prototype, {
        /**
         * The number of listeners currently subscribed to the event.
         * @memberof Event.prototype
         * @type {Number}
         */
        numberOfListeners: {
            get : function() {
                return this._listeners.length;
            }
        }
    });

    /**
     * Registers a callback function to be executed whenever the event is raised.
     * An optional scope can be provided to serve as the <code>this</code> pointer
     * in which the function will execute.
     *
     * @param {Function} listener The function to be executed when the event is raised.
     * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
     * pointer in which the listener function will execute.
     * @returns {Function} A function that will remove this event listener when invoked.
     *
     * @see Event#raiseEvent
     * @see Event#removeEventListener
     */
    Event.prototype.addEventListener = function(listener, scope) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof listener !== 'function') {
            throw new DeveloperError('listener is required and must be a function.');
        }
        //>>includeEnd('debug');

        this._listeners.push(listener);
        this._scopes.push(scope);

        var event = this;
        return function() {
            event.removeEventListener(listener, scope);
        };
    };

    /**
     * Unregisters a previously registered callback.
     *
     * @param {Function} listener The function to be unregistered.
     * @param {Object} [scope] The scope that was originally passed to addEventListener.
     * @returns {Boolean} <code>true</code> if the listener was removed; <code>false</code> if the listener and scope are not registered with the event.
     *
     * @see Event#addEventListener
     * @see Event#raiseEvent
     */
    Event.prototype.removeEventListener = function(listener, scope) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof listener !== 'function') {
            throw new DeveloperError('listener is required and must be a function.');
        }
        //>>includeEnd('debug');

        var thisListeners = this._listeners;
        var thisScopes = this._scopes;

        var index = -1;
        for (var i = 0; i < thisListeners.length; i++) {
            if (thisListeners[i] === listener && thisScopes[i] === scope) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            thisListeners.splice(index, 1);
            this._scopes.splice(index, 1);
            return true;
        }

        return false;
    };

    /**
     * Raises the event by calling each registered listener with all supplied arguments.
     *
     * @param {*} arguments This method takes any number of parameters and passes them through to the listener functions.
     *
     * @see Event#addEventListener
     * @see Event#removeEventListener
     */
    Event.prototype.raiseEvent = function() {
        var listeners = this._listeners;
        var scopes = this._scopes;
        var length = listeners.length;
        for (var i = 0; i < length; i++) {
            listeners[i].apply(scopes[i], arguments);
        }
    };

    return Event;
});