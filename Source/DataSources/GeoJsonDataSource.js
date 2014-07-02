/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/loadJson',
        '../Core/RuntimeError',
        '../ThirdParty/topojson',
        '../ThirdParty/when',
        './ColorMaterialProperty',
        './ConstantProperty',
        './DynamicObject',
        './DynamicObjectCollection',
        './DynamicPoint',
        './DynamicPolygon',
        './DynamicPolyline'
    ], function(
        Cartesian3,
        Color,
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getFilenameFromUri,
        loadJson,
        RuntimeError,
        topojson,
        when,
        ColorMaterialProperty,
        ConstantProperty,
        DynamicObject,
        DynamicObjectCollection,
        DynamicPoint,
        DynamicPolygon,
        DynamicPolyline) {
    "use strict";

    function describe(properties, nameProperty) {
        var html = '<table class="cesium-geoJsonDataSourceTable">';
        for ( var key in properties) {
            if (properties.hasOwnProperty(key)) {
                if (key === nameProperty) {
                    continue;
                }
                var value = properties[key];
                if (defined(value)) {
                    if (typeof value === 'object') {
                        html += '<tr><td>' + key + '</td><td>' + describe(value) + '</td></tr>';
                    } else {
                        html += '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
                    }
                }
            }
        }
        html += '</table>';
        return html;
    }

    //GeoJSON specifies only the Feature object has a usable id property
    //But since "multi" geometries create multiple dynamicObject,
    //we can't use it for them either.
    function createObject(geoJson, dynamicObjectCollection) {
        var id = geoJson.id;
        if (!defined(id) || geoJson.type !== 'Feature') {
            id = createGuid();
        } else {
            var i = 2;
            var finalId = id;
            while (defined(dynamicObjectCollection.getById(finalId))) {
                finalId = id + "_" + i;
                i++;
            }
            id = finalId;
        }

        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.geoJson = geoJson;

        var properties = geoJson.properties;
        if (defined(properties)) {
            //Try and find a good name for the object from its meta-data
            //TODO: Make both name and description creation user-configurable.
            var key;
            var nameProperty;
            for (key in properties) {
                if (properties.hasOwnProperty(key) && properties[key]) {
                    var upperKey = key.toUpperCase();
                    if (upperKey === 'NAME' || upperKey === 'TITLE') {
                        nameProperty = key;
                        dynamicObject.name = properties[key];
                        break;
                    }
                }
            }
            if (!defined(nameProperty)) {
                for (key in properties) {
                    if (properties.hasOwnProperty(key) && properties[key]) {
                        if (/name/i.test(key) || /title/i.test(key)) {
                            nameProperty = key;
                            dynamicObject.name = properties[key];
                            break;
                        }
                    }
                }
            }

            var description = describe(properties, nameProperty);
            dynamicObject.description = {
                getValue : function() {
                    return description;
                }
            };
        }
        return dynamicObject;
    }

    function coordinatesArrayToCartesianArray(coordinates, crsFunction) {
        var positions = new Array(coordinates.length);
        for (var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        return positions;
    }

    // GeoJSON processing functions
    function processFeature(dataSource, feature, notUsed, crsFunction, sourceUri) {
        if (!defined(feature.geometry)) {
            throw new RuntimeError('feature.geometry is required.');
        }

        if (feature.geometry === null) {
            //Null geometry is allowed, so just create an empty dynamicObject instance for it.
            createObject(feature, dataSource._dynamicObjectCollection);
        } else {
            var geometryType = feature.geometry.type;
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, feature, feature.geometry, crsFunction, sourceUri);
        }
    }

    function processFeatureCollection(dataSource, featureCollection, notUsed, crsFunction, sourceUri) {
        var features = featureCollection.features;
        for (var i = 0, len = features.length; i < len; i++) {
            processFeature(dataSource, features[i], undefined, crsFunction, sourceUri);
        }
    }

    function processGeometryCollection(dataSource, geoJson, geometryCollection, crsFunction, sourceUri) {
        var geometries = geometryCollection.geometries;
        for (var i = 0, len = geometries.length; i < len; i++) {
            var geometry = geometries[i];
            var geometryType = geometry.type;
            var geometryHandler = geometryTypes[geometryType];
            if (!defined(geometryHandler)) {
                throw new RuntimeError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(dataSource, geoJson, geometry, crsFunction, sourceUri);
        }
    }

    function processPoint(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
        dynamicObject.merge(dataSource.defaultPoint);
        dynamicObject.position = new ConstantProperty(crsFunction(geometry.coordinates));
    }

    function processMultiPoint(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        var coordinates = geometry.coordinates;
        for (var i = 0; i < coordinates.length; i++) {
            var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
            dynamicObject.merge(dataSource.defaultPoint);
            dynamicObject.position = new ConstantProperty(crsFunction(coordinates[i]));
        }
    }

    function processLineString(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
        dynamicObject.merge(dataSource.defaultLine);
        dynamicObject.vertexPositions = new ConstantProperty(coordinatesArrayToCartesianArray(geometry.coordinates, crsFunction));
    }

    function processMultiLineString(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        var lineStrings = geometry.coordinates;
        for (var i = 0; i < lineStrings.length; i++) {
            var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
            dynamicObject.merge(dataSource.defaultLine);
            dynamicObject.vertexPositions = new ConstantProperty(coordinatesArrayToCartesianArray(lineStrings[i], crsFunction));
        }
    }

    function processPolygon(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        //TODO Holes
        var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
        dynamicObject.merge(dataSource.defaultPolygon);
        dynamicObject.vertexPositions = new ConstantProperty(coordinatesArrayToCartesianArray(geometry.coordinates[0], crsFunction));
    }

    function processTopology(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        for ( var property in geometry.objects) {
            if (geometry.objects.hasOwnProperty(property)) {
                var feature = topojson.feature(geometry, geometry.objects[property]);
                var typeHandler = geoJsonObjectTypes[feature.type];
                typeHandler(dataSource, feature, feature, crsFunction, sourceUri);
            }
        }
    }

    function processMultiPolygon(dataSource, geoJson, geometry, crsFunction, sourceUri) {
        //TODO holes
        var polygons = geometry.coordinates;
        for (var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i];
            var dynamicObject = createObject(geoJson, dataSource._dynamicObjectCollection);
            dynamicObject.merge(dataSource.defaultPolygon);
            dynamicObject.vertexPositions = new ConstantProperty(coordinatesArrayToCartesianArray(polygon[0], crsFunction));
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
            dataSource._isLoading = isLoading;
            dataSource._loading.raiseEvent(dataSource, isLoading);
        }
    }

    /**
     * A {@link DataSource} which processes both GeoJSON and TopoJSON data.  Since GeoJSON has no standard for styling
     * content, we provide default graphics via the defaultPoint, defaultLine, and defaultPolygon properties. Any
     * changes to these objects will affect the resulting {@link DynamicObject} collection.
     * @alias GeoJsonDataSource
     * @constructor
     *
     * @param {String} [name] The name of this data source.  If undefined, a name will be taken from
     *                        the name of the GeoJSON file.
     *
     * @see DataSourceDisplay
     * @see {@link http://www.geojson.org/|GeoJSON specification}
     *
     * @example
     * //Use a billboard instead of a point.
     * var dataSource = new Cesium.GeoJsonDataSource();
     * var defaultPoint = dataSource.defaulPoint;
     * defaultPoint.point = undefined;
     * var billboard = new Cesium.DynamicBillboard();
     * billboard.image = new Cesium.ConstantProperty('image.png');
     * defaultPoint.billboard = billboard;
     * dataSource.loadUrl('sample.geojson');
     */
    var GeoJsonDataSource = function(name) {
        this._name = name;

        //default point
        var defaultPoint = new DynamicObject('GeoJsonDataSource.defaultPoint');
        var point = new DynamicPoint();
        point.color = new ConstantProperty(Color.YELLOW);
        point.pixelSize = new ConstantProperty(10);
        point.outlineColor = new ConstantProperty(Color.BLACK);
        point.outlineWidth = new ConstantProperty(1);
        defaultPoint.point = point;

        //default line
        var defaultLine = new DynamicObject('GeoJsonDataSource.defaultLine');
        var polyline = new DynamicPolyline();
        var material = new ColorMaterialProperty();
        material.color = new ConstantProperty(Color.YELLOW);
        polyline.material = material;
        polyline.width = new ConstantProperty(2);
        defaultLine.polyline = polyline;

        //default polygon
        var defaultPolygon = new DynamicObject('GeoJsonDataSource.defaultPolygon');

        polyline = new DynamicPolyline();
        material = new ColorMaterialProperty();
        material.color = new ConstantProperty(Color.YELLOW);
        polyline.material = material;
        polyline.width = new ConstantProperty(1);
        defaultPolygon.polyline = polyline;

        var polygon = new DynamicPolygon();
        defaultPolygon.polygon = polygon;

        material = new ColorMaterialProperty();
        material.color = new ConstantProperty(new Color(1.0, 1.0, 0.0, 0.2));
        polygon.material = material;

        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._dynamicObjectCollection = new DynamicObjectCollection();

        /**
         * Gets or sets the default graphics to be applied to GeoJSON Point and MultiPoint geometries.
         * @type {DynamicObject}
         */
        this.defaultPoint = defaultPoint;

        /**
         * Gets or sets the default graphics to be applied to GeoJSON LineString and MultiLineString geometries.
         * @type {DynamicObject}
         */
        this.defaultLine = defaultLine;

        /**
         * Gets or sets the default graphics to be applied to GeoJSON Polygon and MultiPolygon geometries.
         * @type {DynamicObject}
         */
        this.defaultPolygon = defaultPolygon;
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
         * GeoJSON only defines static data, therefore this property is always undefined.
         * @memberof GeoJsonDataSource.prototype
         * @type {DynamicClock}
         */
        clock : {
            value : undefined,
            writable : false
        },
        /**
         * Gets the collection of {@link DynamicObject} instances.
         * @memberof GeoJsonDataSource.prototype
         * @type {DynamicObjectCollection}
         */
        dynamicObjects : {
            get : function() {
                return this._dynamicObjectCollection;
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

        this._dynamicObjectCollection.removeAll();

        setLoading(this, true);

        var dataSource = this;
        return when(crsFunction, function(crsFunction) {
            typeHandler(dataSource, geoJson, geoJson, crsFunction, sourceUri);
            dataSource._changed.raiseEvent(dataSource);
            setLoading(dataSource, false);
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
