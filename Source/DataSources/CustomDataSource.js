/*global define*/
define([
        '../Core/defineProperties',
        '../Core/Event',
        './DataSource',
        './EntityCollection'
    ], function(
        defineProperties,
        Event,
        DataSource,
        EntityCollection) {
    "use strict";

    /**
     * A {@link DataSource} implementation which can be used to manually manage a group of entities.
     *
     * @alias CustomDataSource
     * @constructor
     *
     * @example
     * var dataSource = new Cesium.CustomDataSource();
     * dataSource.name = "myData";
     *
     * var entity = dataSource.entities.add({
     *    position : Cesium.Cartesian3.fromDegrees(1, 2, 0),
     *    billboard : {
     *        image : 'image.png'
     *    }
     * });
     *
     * viewer.dataSources.add(dataSource);
     */
    var CustomDataSource = function() {
        this._name = undefined;
        this._clock = undefined;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection();
    };

    defineProperties(CustomDataSource.prototype, {
        /**
         * Gets or sets a human-readable name for this instance.
         * @memberof CustomDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            },
            set : function(value) {
                if (this._name !== value) {
                    this._name = value;
                    this._changed.raiseEvent(this);
                }
            }
        },
        /**
         * Gets or sets the clock for this instance.
         * @memberof CustomDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            get : function() {
                return this._clock;
            },
            set : function(value) {
                if (this._clock !== value) {
                    this._clock = value;
                    this._changed.raiseEvent(this);
                }
            }
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof CustomDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets or sets whether the data source is currently loading data.
         * @memberof CustomDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            },
            set : function(value) {
                DataSource.setLoading(this, value);
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof CustomDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof CustomDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof CustomDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        }
    });

    return CustomDataSource;
});