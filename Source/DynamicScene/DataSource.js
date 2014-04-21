/*global define*/
define([
        '../Core/defineProperties',
        '../Core/DeveloperError'
    ], function(
            defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Defines the interface for data sources, which turn arbitrary data into a
     * {@link DynamicObjectCollection} for generic consumption. This object is an interface
     * for documentation purposes and is not intended to be instantiated directly.
     * @alias DataSource
     * @constructor
     */
    var DataSource = function() {
        DeveloperError.throwInstantiationError();
    };

    defineProperties(DataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof DataSource.prototype
         * @type {String}
         */
        name : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets the preferred clock settings for this data source.
         * @memberof DataSource.prototype
         * @type {DynamicClock}
         */
        clock : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets the collection of {@link DynamicObject} instances.
         * @memberof DataSource.prototype
         * @type {DynamicObjectCollection}
         */
        dynamicObjects : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof DataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError()
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : DeveloperError.throwInstantiationError()
        }
    });

    /**
     * Updates the data source to the provided time.
     * @memberof DataSource
     * @function
     *
     * @param {JulianDate} time The simulation time.
     *
     * @returns {Boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
     */
    DataSource.prototype.update = DeveloperError.throwInstantiationError;

    return DataSource;
});