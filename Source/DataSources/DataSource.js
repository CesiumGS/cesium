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
     * {@link EntityCollection} for generic consumption. This object is an interface
     * for documentation purposes and is not intended to be instantiated directly.
     * @alias DataSource
     * @constructor
     *
     * @see Entity
     * @see DataSourceDisplay
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
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the preferred clock settings for this data source.
         * @memberof DataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof DataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof DataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : DeveloperError.throwInstantiationError
        },
        /**
         * Gets an event that will be raised when the value of isLoading changes.
         * @memberof DataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Updates the data source to the provided time.  This function is optional and
     * is not required to be implemented.  It is provided for data sources which
     * retrieve data based on the current animation time or scene state.
     * If implemented, update will be called by {@link DataSourceDisplay} once a frame.
     * @function
     *
     * @param {JulianDate} time The simulation time.
     * @returns {Boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
     */
    DataSource.prototype.update = DeveloperError.throwInstantiationError;

    /**
     * @private
     */
    DataSource.setLoading = function(dataSource, isLoading) {
        if (dataSource._isLoading !== isLoading) {
            if (isLoading) {
                dataSource._entityCollection.suspendEvents();
            } else {
                dataSource._entityCollection.resumeEvents();
            }
            dataSource._isLoading = isLoading;
            dataSource._loading.raiseEvent(dataSource, isLoading);
        }
    };

    return DataSource;
});