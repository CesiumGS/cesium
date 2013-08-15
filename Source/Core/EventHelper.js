/*global define*/
define([
        './defined',
        './DeveloperError'
    ], function(
        defined,
        DeveloperError) {
    "use strict";

    /**
     * A convenience object that simplifies the common pattern of attaching event listeners
     * to several events, then removing all those listeners at once later, for example, in
     * a destroy method.
     *
     * @alias EventHelper
     * @constructor
     *
     * @see Event
     *
     * @example
     * var helper = new EventHelper();
     *
     * helper.add(someObject.event, listener1, this);
     * helper.add(otherObject.event, listener2, this);
     *
     * // later...
     * helper.removeAll();
     */
    var EventHelper = function() {
        this._removalFunctions = [];
    };

    /**
     * Adds a listener to an event, and records the registration to be cleaned up later.
     * @memberof EventHelper
     *
     * @param {Event} event The event to attach to.
     * @param {Function} listener The function to be executed when the event is raised.
     * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
     * pointer in which the listener function will execute.
     *
     * @see Event#addEventListener
     *
     * @exception {DeveloperError} event is required and must be a function.
     * @exception {DeveloperError} listener is required and must be a function.
     */
    EventHelper.prototype.add = function(event, listener, scope) {
        if (!defined(event)) {
            throw new DeveloperError('event is required');
        }

        this._removalFunctions.push(event.addEventListener(listener, scope));
    };

    /**
     * Unregisters all previously added listeners.
     * @memberof EventHelper
     *
     * @see Event#removeEventListener
     */
    EventHelper.prototype.removeAll = function() {
        var removalFunctions = this._removalFunctions;
        for ( var i = 0, len = removalFunctions.length; i < len; ++i) {
            removalFunctions[i]();
        }
        removalFunctions.length = 0;
    };

    return EventHelper;
});
