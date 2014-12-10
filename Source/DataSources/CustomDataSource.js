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
     * A {@link DataSource} which processes both
     * {@link http://www.geojson.org/|GeoJSON} and {@link https://github.com/mbostock/topojson|TopoJSON} data.
     * {@link https://github.com/mapbox/simplestyle-spec|Simplestyle} properties will also be used if they
     * are present.
     *
     * @alias CustomDataSource
     * @constructor
     *
     * @param {String} [name] The name of this data source.  If undefined, a name will be taken from
     *                        the name of the GeoJSON file.
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
         * Gets a human-readable name for this instance.
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
         * This DataSource only defines static data, therefore this property is always undefined.
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
         * Gets a value indicating if the data source is currently loading data.
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