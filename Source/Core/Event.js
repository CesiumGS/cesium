/*global define*/
define([
        './DeveloperError'
       ], function(
         DeveloperError) {
    "use strict";

    /**
     * A generic utility class for managing subscribers for a particular event.
     * This class is usually instantiated inside of a container class and
     * exposed as a property for others to subscribe to.
     *
     * @name Event
     * @constructor
     *
     * @example
     * MyObject.prototype.myListener = function(arg1, arg2) {
     *     this.myArg1Copy = arg1;
     *     this.myArg2Copy = arg2;
     * }
     *
     * var evt = new Event();
     * evt.addEventListener(MyObject.prototype.myListener, MyObjectInstance);
     * evt.raiseEvent("1", "2");
     * evt.removeEventListener(MyObject.prototype.myListener);
     */
    function Event() {
        this._listeners = [];
        this._scopes = [];
    }

    /**
     * <p>
     * Registers a callback function to be executed whenever the event is raised.
     * An optional scope can be provided to serve as the <code>this</code> pointer
     * in which the function will execute.
     * </p>
     *
     * @memberof Event
     *
     * @param {Function} listener The function to be executed when the event is raised.
     * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
     * pointer in which the listener function will execute.
     *
     * @see Event#raiseEvent
     * @see Event#removeEventListener
     *
     * @exception {DeveloperError} listener is required and must be a function.
     * @exception {DeveloperError} listener is already subscribed.
     */
    Event.prototype.addEventListener = function(listener, scope) {
        if (typeof listener !== 'function') {
            throw new DeveloperError("listener is required and must be a function.");
        }

        var this_listeners = this._listeners;
        var index = this_listeners.indexOf(listener);

        if (index !== -1) {
            throw new DeveloperError("listener is already subscribed.");
        }

        this_listeners.push(listener);
        this._scopes.push(scope);
    };

    /**
     * <p>
     * Unregisters a previously registered callback.
     * </p>
     *
     * @memberof Event
     *
     * @param {Function} listener The function to be unregistered.
     *
     * @see Event#addEventListener
     * @see Event#raiseEvent
     *
     * @exception {DeveloperError} listener is required and must be a function.
     * @exception {DeveloperError} listener is not subscribed.
     */
    Event.prototype.removeEventListener = function(listener) {
        if (typeof listener !== 'function') {
            throw new DeveloperError("listener is required and must be a function.");
        }

        var this_listeners = this._listeners;
        var index = this_listeners.indexOf(listener);

        if (index === -1) {
            throw new DeveloperError("listener is not subscribed.");
        }

        this_listeners.splice(index, 1);
        this._scopes.splice(index, 1);
    };

    /**
     * <p>
     * Raises the event by calling each registered listener with all supplied arguments.
     * </p>
     *
     * @memberof Event
     *
     * @param {*} arguments This method takes any number of parameters and passes them through to the listener functions.
     *
     * @see Event#addEventListener
     * @see Event#removeEventListener
     *
     */
    Event.prototype.raiseEvent = function() {
        var listeners = this._listeners;
        var scopes = this._scopes;
        for ( var i = listeners.length - 1; i > -1; i--) {
            listeners[i].apply(scopes[i], arguments);
        }
    };

    return Event;
});