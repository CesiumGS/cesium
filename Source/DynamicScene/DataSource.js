/*global define*/
define(['../Core/DeveloperError'
        ], function(
                DeveloperError) {
    "use strict";

    function throwInsantiationError() {
        throw new DeveloperError('This type should not be instantiated directly.');
    }

    /**
     * Provides data in the form of a dynamic .  This type describes an
     * interface and is not intended to be instantiated directly.
     *
     * @alias DataSource
     * @constructor
     */
    var DataSource = function() {
        throwInsantiationError();
    };

    /**
     * Gets an event that is raised when a non-temporal data source is changed or when any data source
     * changes its ready state.
     * @memberof DataSource
     * @returns {Event} The event.
     */
    DataSource.prototype.getChangedEvent = throwInsantiationError;

    /**
     * Gets the top level clock associated with this data souce, if one is defined.
     * @memberof DataSource
     * @returns {DynamicClock} The clock.
     */
    DataSource.prototype.getClock = throwInsantiationError;

    /**
     * Gets the DynamicObjectCollection associated with this data source.
     * @memberof DataSource
     * @returns {DynamicObjectCollection} The collection.
     */
    DataSource.prototype.getDynamicObjectCollection = throwInsantiationError;

    /**
     * Gets whether or not the underlying data varies with simulation time.
     * @memberof DataSource
     * @returns {Boolean} True if the data varies with simulation time or false if the data is static.
     */
    DataSource.prototype.getIsTemporal = throwInsantiationError;

    /**
     * Gets whether the data is ready or not.
     * @memberof DataSource
     * @returns {Boolean} True if the data is ready for use, false if otherwise.
     */
    DataSource.prototype.getIsReady = throwInsantiationError;

    return DataSource;
});