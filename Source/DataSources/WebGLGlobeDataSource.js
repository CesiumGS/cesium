/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/loadJson',
        '../ThirdParty/when',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './Entity',
        './EntityCollection',
        './PolylineGraphics'
    ], function(
        Cartesian3,
        Cartographic,
        Color,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getFilenameFromUri,
        loadJson,
        when,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        Entity,
        EntityCollection,
        PolylineGraphics) {
    "use strict";

    function setLoading(dataSource, isLoading) {
        if (dataSource._isLoading !== isLoading) {
            dataSource._isLoading = isLoading;
            dataSource._loading.raiseEvent(dataSource, isLoading);
        }
    }

    function defaultColorFunction(height) {
        return Color.fromHsl((0.6 - (height * 0.5)), 1.0, 0.5);
    }

    /**
     * A {@link DataSource} which loads JSON data formatted for {@link https://github.com/dataarts/webgl-globe|WebGL Globe}.
     * @alias WebGLGlobeDataSource
     * @constructor
     *
     * @param {String} [name] The name of this data source.  If undefined, a name will be taken from
     *                        the name of the file.
     *
     * @example
     * var dataSource = new Cesium.WebGLGlobeDataSource();
     * dataSource.loadUrl('sample.json');
     * viewer.dataSources.add(dataSource);
     */
    var WebGLGlobeDataSource = function(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection();
        this._seriesNames = [];
        this._seriesToDisplay = undefined;

        /**
         * Gets or sets the function used to compute line color.
         * @type {WebGLGlobeDataSource~ColorFunction}
         */
        this.colorFunction = defaultColorFunction;

        /**
         * Gets or sets the scale factor applied to the height of each line.
         * @type {Number}
         */
        this.heightScale = 10000000;
    };

    defineProperties(WebGLGlobeDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * Since WebGL Globe JSON is not time-dynamic, this property is always undefined.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            value : undefined,
            writable : false
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        },
        /**
         * Gets the array of series names.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {String}
         */
        seriesNames : {
            get : function() {
                return this._seriesNames;
            }
        },
        /**
         * Gets or sets the name of the series to display.
         * @memberof WebGLGlobeDataSource.prototype
         * @type {String[]}
         */
        seriesToDisplay : {
            get : function() {
                return this._seriesToDisplay;
            },
            set : function(value) {
                this._seriesToDisplay = value;
                var collection = this._entityCollection;
                var entities = collection.entities;
                collection.suspendEvents();
                for (var i = 0; i < entities.length; i++) {
                    var entity = entities[i];
                    entity.polyline.show.setValue(value === entity.seriesName);
                }
                collection.resumeEvents();
            }
        }
    });

    /**
     * Asynchronously loads the GeoJSON at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the GeoJSON is loaded.
     */
    WebGLGlobeDataSource.prototype.loadUrl = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        var name;
        if (defined(url)) {
            name = getFilenameFromUri(url);
        }

        if (defined(name) && this._name !== name) {
            this._name = name;
            this._changed.raiseEvent(this);
        }

        var dataSource = this;
        return when(loadJson(url), function(geoJson) {
            return dataSource.load(geoJson, url);
        }).otherwise(function(error) {
            setLoading(dataSource, false);
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    /**
     * Asynchronously loads the provided data, replacing any existing data.
     *
     * @param {Object} data The object to be processed.
     * @returns {Promise} a promise that will resolve when the data is loaded.
     *
     * @exception {DeveloperError} Unsupported GeoJSON object type.
     */
    WebGLGlobeDataSource.prototype.load = function(data) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }
        if (!defined(this.colorFunction)) {
            throw new DeveloperError('this.colorFunction is required.');
        }
        if (typeof this.heightScale !== 'number') {
            throw new DeveloperError('this.heightScale is required.');
        }
        //>>includeEnd('debug');

        setLoading(this, true);
        this._seriesNames.length = 0;
        this._seriesToDisplay = undefined;

        var heightScale = this.heightScale;
        var entities = this._entityCollection;
        entities.suspendEvents();
        entities.removeAll();

        for (var x = 0; x < data.length; x++) {
            var series = data[x];
            var seriesName = series[0];
            var coordinates = series[1];
            this._seriesNames.push(seriesName);

            var show = x === 0;
            if (show) {
                this._seriesToDisplay = seriesName;
            }

            for (var i = 0; i < coordinates.length; i += 3) {
                var latitude = coordinates[i];
                var longitude = coordinates[i + 1];
                var height = coordinates[i + 2];
                var color = this.colorFunction(height);
                var surfacePosition = Cartesian3.fromDegrees(longitude, latitude, 0);
                var heightPosition = Cartesian3.fromDegrees(longitude, latitude, height * heightScale);

                var polyline = new PolylineGraphics();
                polyline.show = new ConstantProperty(show);
                polyline.material = ColorMaterialProperty.fromColor(color);
                polyline.width = new ConstantProperty(2);
                polyline.followSurface = new ConstantProperty(false);
                polyline.positions = new ConstantProperty([surfacePosition, heightPosition]);

                var entity = new Entity(seriesName + ' index ' + i.toString());
                entity.polyline = polyline;
                entity.addProperty('seriesName');
                entity.seriesName = seriesName;
                entities.add(entity);
            }
        }
        entities.resumeEvents();

        this._changed.raiseEvent(this);
        setLoading(this, false);
    };

    /**
     * Function interface for specifying the color of each line.
     * @callback WebGLGlobeDataSource~ColorFunction
     * @param {Number} height The height of the line in meters.
     * @returns {Color} The color of the line.
     *
     * @example
     * function defaultColorFunction(height) {
     *     return Color.fromHsl((0.6 - (height * 0.5)), 1.0, 0.5);
     * }
     */

    return WebGLGlobeDataSource;
});
