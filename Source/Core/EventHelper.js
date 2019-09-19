import defined from './defined.js';
import DeveloperError from './DeveloperError.js';

    /**
     * A convenience object that simplifies the common pattern of attaching event listeners
     * to several events, then removing all those listeners at once later, for example, in
     * a destroy method.
     *
     * @alias EventHelper
     * @constructor
     *
     *
     * @example
     * var helper = new Cesium.EventHelper();
     *
     * helper.add(someObject.event, listener1, this);
     * helper.add(otherObject.event, listener2, this);
     *
     * // later...
     * helper.removeAll();
     *
     * @see Event
     */
    function EventHelper() {
        this._removalFunctions = [];
    }

    /**
     * Adds a listener to an event, and records the registration to be cleaned up later.
     *
     * @param {Event} event The event to attach to.
     * @param {Function} listener The function to be executed when the event is raised.
     * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
     *        pointer in which the listener function will execute.
     * @returns {EventHelper~RemoveCallback} A function that will remove this event listener when invoked.
     *
     * @see Event#addEventListener
     */
    EventHelper.prototype.add = function(event, listener, scope) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(event)) {
            throw new DeveloperError('event is required');
        }
        //>>includeEnd('debug');

        var removalFunction = event.addEventListener(listener, scope);
        this._removalFunctions.push(removalFunction);

        var that = this;
        return function() {
            removalFunction();
            var removalFunctions = that._removalFunctions;
            removalFunctions.splice(removalFunctions.indexOf(removalFunction), 1);
        };
    };

    /**
     * Unregisters all previously added listeners.
     *
     * @see Event#removeEventListener
     */
    EventHelper.prototype.removeAll = function() {
        var removalFunctions = this._removalFunctions;
        for (var i = 0, len = removalFunctions.length; i < len; ++i) {
            removalFunctions[i]();
        }
        removalFunctions.length = 0;
    };

    /**
     * A function that removes a listener.
     * @callback EventHelper~RemoveCallback
     */
export default EventHelper;
