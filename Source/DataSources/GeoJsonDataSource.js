/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/loadJson',
        '../Core/PinBuilder',
        '../Core/RuntimeError',
        '../Scene/VerticalOrigin',
        '../ThirdParty/topojson',
        '../ThirdParty/when',
        './BillboardGraphics',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './EntityCollection',
        './PolygonGraphics',
        './PolylineGraphics'
    ], function(
        Cartesian3,
        Color,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getFilenameFromUri,
        loadJson,
        PinBuilder,
        RuntimeError,
        VerticalOrigin,
        topojson,
        when,
        BillboardGraphics,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        EntityCollection,
        PolygonGraphics,
        PolylineGraphics) {
    "use strict";

    var sizes = {
        small : 24,
        medium : 48,
        large : 64
    };

    var defaultPolylineMaterial = ColorMaterialProperty.fromColor(Color.YELLOW);
    var defaultPolylineWidth = new ConstantProperty(2);

    var defaultPolygonMaterial = ColorMaterialProperty.fromColor(Color.fromBytes(255, 255, 0, 100));
    var defaultPolygonOutline = new ConstantProperty(true);
    var defaultPolygonOutlineColor = Color.BLACK;
    var defaultPolygonOutlineColorProperty = new ConstantProperty(defaultPolygonOutlineColor);

    var simpleStyleIdentifiers = ['title', 'description', //
    'marker-size', 'marker-symbol', 'marker-color', 'stroke', //
    'stroke-opacity', 'stroke-width', 'fill', 'fill-opacity'];

    function describe(properties, nameProperty) {
        var html = '<table class="cesium-infoBox-defaultTable"><tbody>';
        for ( var key in properties) {
            if (properties.hasOwnProperty(key)) {
                if (key === nameProperty || simpleStyleIdentifiers.indexOf(key) !== -1) {
                    continue;
                }
                var value = properties[key];
                if (defined(value)) {
                    if (typeof value === 'object') {
                        html += '<tr><th>' + key + '</th><td>' + describe(value) + '</td></tr>';
                    } else {
                        html += '<tr><th>' + key + '</th><td>' + value + '</td></tr>';
                    }
                }
            }
        }
        html += '</tbody></table>';
        return html;
    }

    //GeoJSON specifies only the Feature object has a usable id property
    //But since "multi" geometries create multiple entity,
    //we can't use it for them either.
    function createObject(geoJson, entityCollection) {
        var id = geoJson.id;
        if (!defined(id) || geoJson.type !== 'Feature') {
            id = createGuid();
        } else {
            var i = 2;
            var finalId = id;
            while (defined(entityCollection.getById(finalId))) {
                finalId = id + "_" + i;
                i++;
            }
            id = finalId;
        }

        var entity = entityCollection.getOrCreateEntity(id);
        var properties = geoJson.properties;
        if (defined(properties)) {
            entity.addProperty('properties');
            entity.properties = properties;

            var nameProperty;

            //Check for the simplestyle specified name first.
            var name = properties.title;
            if (defined(name)) {
                entity.name = name;
                nameProperty = 'title';
            } else {
                //Else, find the name by selecting an appropriate property.
                //The name will be obtained based on this order:
                //1) The first case-insensitive property with the name 'title',
                //2) The first case-insensitive property with the name 'name',
                //3) The first property containing the word 'title'.
                //4) The first property containing the word 'name',
                var namePropertyPrecedence = Number.MAX_VALUE;
                for ( var key in properties) {
                    if (properties.hasOwnProperty(key) && properties[key]) {
                        var lowerKey = key.toLowerCase();

                        if (namePropertyPrecedence > 1 && lowerKey === 'title') {
                            namePropertyPrecedence = 1;
                            nameProperty = key;
                            break;
                        } else if (namePropertyPrecedence > 2 && lowerKey === 'name') {
                            namePropertyPrecedence = 2;
                            nameProperty = key;
                        } else if (namePropertyPrecedence > 3 && /title/i.test(key)) {
                            namePropertyPrecedence = 3;
                            nameProperty = key;
                        } else if (namePropertyPrecedence > 4 && /name/i.test(key)) {
                            namePropertyPrecedence = 4;
                            nameProperty = key;
                        }
                    }
                }
                if (defined(nameProperty)) {
                    entity.name = properties[nameProperty];
                }
            }

            var description = properties.description;
            if (!defined(description)) {
                description = describe(properties, nameProperty);
            }
            entity.description = new ConstantProperty(description);
        }
        return entity;
    }

    function coordinatesArrayToCartesianArray(coordinates, crsFunction) {
        var positions = new Array(coordinates.length);
        for (var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        return positions;
    }

    // GeoJSON processing functions
    function processFeature(dataSource, feature, notUsed, crsFunction) {
        if (!defined(feature.geometry)) {
            throw new RuntimeError('feature.geometry is required.');
        }

        if (feature.geometry === null) {
            //Null geometry is allowed, so just create an empty entity instance for it.
            createObject(feature, dataSource._entityCollection);
        } else {
            var geometryType = feature.geometry.type;
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, feature, feature.geometry, crsFunction);
        }
    }

    function processFeatureCollection(dataSource, featureCollection, notUsed, crsFunction) {
        var features = featureCollection.features;
        for (var i = 0, len = features.length; i < len; i++) {
            processFeature(dataSource, features[i], undefined, crsFunction);
        }
    }

    function processGeometryCollection(dataSource, geoJson, geometryCollection, crsFunction) {
        var geometries = geometryCollection.geometries;
        for (var i = 0, len = geometries.length; i < len; i++) {
            var geometry = geometries[i];
            var geometryType = geometry.type;
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, geoJson, geometry, crsFunction);
        }
    }

    function createPoint(dataSource, geoJson, crsFunction, coordinates) {
        var symbol;
        var color = Color.ROYALBLUE;
        var size = sizes.medium;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var cssColor = properties['marker-color'];
            if (defined(cssColor)) {
                color = Color.fromCssColorString(cssColor);
            }

            size = defaultValue(sizes[properties['marker-size']], size);
            symbol = properties['marker-symbol'];
        }

        var canvasOrPromise;
        if (defined(symbol)) {
            if (symbol.length === 1) {
                canvasOrPromise = dataSource._pinBuilder.fromText(symbol.toUpperCase(), color, size);
            } else {
                canvasOrPromise = dataSource._pinBuilder.fromMakiIconId(symbol, color, size);
            }
        } else {
            canvasOrPromise = dataSource._pinBuilder.fromColor(color, size);
        }

        dataSource._promises.push(when(canvasOrPromise, function(canvas) {
            var billboard = new BillboardGraphics();
            billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
            billboard.image = new ConstantProperty(canvas.toDataURL());

            var entity = createObject(geoJson, dataSource._entityCollection);
            entity.billboard = billboard;
            entity.position = new ConstantPositionProperty(crsFunction(coordinates));
        }));
    }

    function processPoint(dataSource, geoJson, geometry, crsFunction) {
        createPoint(dataSource, geoJson, crsFunction, geometry.coordinates);
    }

    function processMultiPoint(dataSource, geoJson, geometry, crsFunction) {
        var coordinates = geometry.coordinates;
        for (var i = 0; i < coordinates.length; i++) {
            createPoint(dataSource, geoJson, crsFunction, coordinates[i]);
        }
    }

    function createLineString(dataSource, geoJson, crsFunction, coordinates) {
        var material = defaultPolylineMaterial;
        var widthProperty = defaultPolylineWidth;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var width = properties['stroke-width'];
            if (defined(width)) {
                widthProperty = new ConstantProperty(width);
            }

            var color;
            var stroke = properties.stroke;
            if (defined(stroke)) {
                color = Color.fromCssColorString(stroke);
            }
            var opacity = properties['stroke-opacity'];
            if (defined(opacity) && opacity !== 1.0) {
                if (!defined(color)) {
                    color = material.color.clone();
                }
                color.alpha = opacity;
            }
            if (defined(color)) {
                material = ColorMaterialProperty.fromColor(color);
            }
        }

        var polyline = new PolylineGraphics();
        polyline.material = material;
        polyline.width = widthProperty;
        polyline.positions = new ConstantProperty(coordinatesArrayToCartesianArray(coordinates, crsFunction));

        var entity = createObject(geoJson, dataSource._entityCollection);
        entity.polyline = polyline;
    }

    function processLineString(dataSource, geoJson, geometry, crsFunction) {
        createLineString(dataSource, geoJson, crsFunction, geometry.coordinates);
    }

    function processMultiLineString(dataSource, geoJson, geometry, crsFunction) {
        var lineStrings = geometry.coordinates;
        for (var i = 0; i < lineStrings.length; i++) {
            createLineString(dataSource, geoJson, crsFunction, lineStrings[i]);
        }
    }

    function createPolygon(dataSource, geoJson, crsFunction, coordinates) {
        var outlineColorProperty = defaultPolygonOutlineColorProperty;
        var material = defaultPolygonMaterial;

        var properties = geoJson.properties;
        if (defined(properties)) {
            var color;
            var stroke = properties.stroke;
            if (defined(stroke)) {
                color = Color.fromCssColorString(stroke);
            }
            var opacity = properties['stroke-opacity'];
            if (defined(opacity) && opacity !== 1.0) {
                if (!defined(color)) {
                    color = defaultPolygonOutlineColor.clone();
                }
                color.alpha = opacity;
            }

            if (defined(color)) {
                outlineColorProperty = new ConstantProperty(color);
            }

            var fillColor;
            var fill = properties.fill;
            if (defined(fill)) {
                fillColor = Color.fromCssColorString(fill);
                fillColor.alpha = material.color.alpha;
            }
            opacity = properties['fill-opacity'];
            if (defined(opacity) && opacity !== material.color.alpha) {
                if (!defined(fillColor)) {
                    fillColor = material.color.clone();
                }
                fillColor.alpha = opacity;
            }
            if (defined(fillColor)) {
                material = ColorMaterialProperty.fromColor(fillColor);
            }
        }

        var polygon = new PolygonGraphics();
        polygon.outline = defaultPolygonOutline;
        polygon.outlineColor = outlineColorProperty;
        polygon.material = material;
        polygon.positions = new ConstantProperty(coordinatesArrayToCartesianArray(coordinates, crsFunction));
        if (coordinates.length > 0 && coordinates[0].length > 2) {
            polygon.perPositionHeight = new ConstantProperty(true);
        }

        var entity = createObject(geoJson, dataSource._entityCollection);
        entity.polygon = polygon;
    }

    function processPolygon(dataSource, geoJson, geometry, crsFunction) {
        createPolygon(dataSource, geoJson, crsFunction, geometry.coordinates[0]);
    }

    function processMultiPolygon(dataSource, geoJson, geometry, crsFunction) {
        var polygons = geometry.coordinates;
        for (var i = 0; i < polygons.length; i++) {
            createPolygon(dataSource, geoJson, crsFunction, polygons[i][0]);
        }
    }

    function processTopology(dataSource, geoJson, geometry, crsFunction) {
        for ( var property in geometry.objects) {
            if (geometry.objects.hasOwnProperty(property)) {
                var feature = topojson.feature(geometry, geometry.objects[property]);
                var typeHandler = geoJsonObjectTypes[feature.type];
                typeHandler(dataSource, feature, feature, crsFunction);
            }
        }
    }

    var geoJsonObjectTypes = {
        Feature : processFeature,
        FeatureCollection : processFeatureCollection,
        GeometryCollection : processGeometryCollection,
        LineString : processLineString,
        MultiLineString : processMultiLineString,
        MultiPoint : processMultiPoint,
        MultiPolygon : processMultiPolygon,
        Point : processPoint,
        Polygon : processPolygon,
        Topology : processTopology
    };

    var geometryTypes = {
        GeometryCollection : processGeometryCollection,
        LineString : processLineString,
        MultiLineString : processMultiLineString,
        MultiPoint : processMultiPoint,
        MultiPolygon : processMultiPolygon,
        Point : processPoint,
        Polygon : processPolygon,
        Topology : processTopology
    };

    function setLoading(dataSource, isLoading) {
        if (dataSource._isLoading !== isLoading) {
            if (isLoading) {
                dataSource._entityCollection.suspendEvents();
            } else {
                dataSource._entityCollection.resumeEvents();
            }
            dataSource._isLoading = isLoading;
            dataSource._loading.raiseEvent(dataSource, isLoading);
        }
    }

    /**
     * A {@link DataSource} which processes both
     * {@link http://www.geojson.org/|GeoJSON} and {@link https://github.com/mbostock/topojson|TopoJSON} data.
     * {@link https://github.com/mapbox/simplestyle-spec|Simplestyle} properties will also be used if they
     * are present.
     *
     * @alias GeoJsonDataSource
     * @constructor
     *
     * @param {String} [name] The name of this data source.  If undefined, a name will be taken from
     *                        the name of the GeoJSON file.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20and%20TopoJSON.html|Cesium Sandcastle GeoJSON and TopoJSON Demo}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GeoJSON%20simplestyle.html|Cesium Sandcastle GeoJSON simplestyle Demo}
     *
     * @example
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * var dataSource = new Cesium.GeoJsonDataSource();
     * viewer.dataSources.add(dataSource);
     * dataSource.loadUrl('sample.geojson');
     */
    var GeoJsonDataSource = function(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection();
        this._promises = [];
        this._pinBuilder = new PinBuilder();
    };

    /**
     * Creates a new instance and asynchronously loads the provided url.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {GeoJsonDataSource} A new instance set to load the specified url.
     *
     * @example
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.dataSources.add(Cesium.GeoJsonDataSource.fromUrl('sample.geojson'));
     */
    GeoJsonDataSource.fromUrl = function(url) {
        var result = new GeoJsonDataSource();
        result.loadUrl(url);
        return result;
    };

    defineProperties(GeoJsonDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * @memberof GeoJsonDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * This DataSource only defines static data, therefore this property is always undefined.
         * @memberof GeoJsonDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            value : undefined,
            writable : false
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof GeoJsonDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof GeoJsonDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof GeoJsonDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
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
    GeoJsonDataSource.prototype.loadUrl = function(url) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        //>>includeEnd('debug');

        setLoading(this, true);

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
     * Asynchronously loads the provided GeoJSON object, replacing any existing data.
     *
     * @param {Object} geoJson The object to be processed.
     * @param {String} [sourceUri] The base URI of any relative links in the geoJson object.
     * @returns {Promise} a promise that will resolve when the GeoJSON is loaded.
     *
     * @exception {DeveloperError} Unsupported GeoJSON object type.
     * @exception {RuntimeError} crs is null.
     * @exception {RuntimeError} crs.properties is undefined.
     * @exception {RuntimeError} Unknown crs name.
     * @exception {RuntimeError} Unable to resolve crs link.
     * @exception {RuntimeError} Unknown crs type.
     */
    GeoJsonDataSource.prototype.load = function(geoJson, sourceUri) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(geoJson)) {
            throw new DeveloperError('geoJson is required.');
        }
        //>>includeEnd('debug');

        var name;
        if (defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (defined(name) && this._name !== name) {
            this._name = name;
            this._changed.raiseEvent(this);
        }

        var typeHandler = geoJsonObjectTypes[geoJson.type];
        if (!defined(typeHandler)) {
            throw new DeveloperError('Unsupported GeoJSON object type: ' + geoJson.type);
        }

        //Check for a Coordinate Reference System.
        var crsFunction = defaultCrsFunction;
        var crs = geoJson.crs;
        if (defined(crs)) {
            if (crs === null) {
                throw new RuntimeError('crs is null.');
            }
            if (!defined(crs.properties)) {
                throw new RuntimeError('crs.properties is undefined.');
            }

            var properties = crs.properties;
            if (crs.type === 'name') {
                crsFunction = GeoJsonDataSource.crsNames[properties.name];
                if (!defined(crsFunction)) {
                    throw new RuntimeError('Unknown crs name: ' + properties.name);
                }
            } else if (crs.type === 'link') {
                var handler = GeoJsonDataSource.crsLinkHrefs[properties.href];
                if (!defined(handler)) {
                    handler = GeoJsonDataSource.crsLinkTypes[properties.type];
                }

                if (!defined(handler)) {
                    throw new RuntimeError('Unable to resolve crs link: ' + JSON.stringify(properties));
                }

                crsFunction = handler(properties);
            } else if (crs.type === 'EPSG') {
                crsFunction = GeoJsonDataSource.crsNames['EPSG:' + properties.code];
                if (!defined(crsFunction)) {
                    throw new RuntimeError('Unknown crs EPSG code: ' + properties.code);
                }
            } else {
                throw new RuntimeError('Unknown crs type: ' + crs.type);
            }
        }

        setLoading(this, true);

        var dataSource = this;
        return when(crsFunction, function(crsFunction) {
            dataSource._entityCollection.removeAll();
            typeHandler(dataSource, geoJson, geoJson, crsFunction);

            when.all(dataSource._promises, function() {
                dataSource._promises.length = 0;
                setLoading(dataSource, false);
                dataSource._changed.raiseEvent(dataSource);
            });
        }).otherwise(function(error) {
            setLoading(dataSource, false);
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };

    function defaultCrsFunction(coordinates) {
        return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
    }

    /**
     * An object that maps the name of a crs to a callback function which takes a GeoJSON coordinate
     * and transforms it into a WGS84 Earth-fixed Cartesian.  Older versions of GeoJSON which
     * supported the EPSG type can be added to this list as well, by specifying the complete EPSG name,
     * for example 'EPSG:4326'.
     * @memberof GeoJsonDataSource
     * @type {Object}
     */
    GeoJsonDataSource.crsNames = {
        'urn:ogc:def:crs:OGC:1.3:CRS84' : defaultCrsFunction,
        'EPSG:4326' : defaultCrsFunction
    };

    /**
     * An object that maps the href property of a crs link to a callback function
     * which takes the crs properties object and returns a Promise that resolves
     * to a function that takes a GeoJSON coordinate and transforms it into a WGS84 Earth-fixed Cartesian.
     * Items in this object take precedence over those defined in <code>crsLinkHrefs</code>, assuming
     * the link has a type specified.
     * @memberof GeoJsonDataSource
     * @type {Object}
     */
    GeoJsonDataSource.crsLinkHrefs = {};

    /**
     * An object that maps the type property of a crs link to a callback function
     * which takes the crs properties object and returns a Promise that resolves
     * to a function that takes a GeoJSON coordinate and transforms it into a WGS84 Earth-fixed Cartesian.
     * Items in <code>crsLinkHrefs</code> take precedence over this object.
     * @memberof GeoJsonDataSource
     * @type {Object}
     */
    GeoJsonDataSource.crsLinkTypes = {};

    return GeoJsonDataSource;
});
