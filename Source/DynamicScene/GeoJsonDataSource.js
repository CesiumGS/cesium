/*global define*/
define(['../Core/createGuid',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/loadJson',
        './DynamicPoint',
        './DynamicPolyline',
        './DynamicPolygon',
        './DynamicMaterialProperty',
        './DynamicObjectCollection',
        './StaticProperty',
        './StaticPositionProperty',
        '../ThirdParty/when'], function(
                createGuid,
                Cartographic,
                Color,
                defineProperties,
                DeveloperError,
                Ellipsoid,
                Event,
                loadJson,
                DynamicPoint,
                DynamicPolyline,
                DynamicPolygon,
                DynamicMaterialProperty,
                DynamicObjectCollection,
                StaticProperty,
                StaticPositionProperty,
                when) {
      "use strict";

    var GeoJsonDataSource = function() {
        this._changed = new Event();
        this._error = new Event();
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._crsNameHandlers = {};
        this._crsLinkTypeHandlers = {};
        this._crsLinkHrefHandlers = {};
    };

    defineProperties(GeoJsonDataSource.prototype, {
        crsTransformations : {
            get : function() {
                return this._crsNameHandlers;
            }
        }
    });

    GeoJsonDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    GeoJsonDataSource.prototype.getErrorEvent = function() {
        return this._error;
    };

    GeoJsonDataSource.prototype.getClock = function() {
        return undefined;
    };

    GeoJsonDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    GeoJsonDataSource.prototype.getIsTimeVarying = function() {
        return false;
    };

    GeoJsonDataSource.prototype.load = function(geoJson, source) {
        if (typeof geoJson === 'undefined') {
            throw new DeveloperError('geoJson is required.');
        }

        if (typeof geoJson.type === 'undefined') {
            throw new DeveloperError('Invalid GeoJSON.  Type not defined');
        }

        var typeHandler = types[geoJson.type];
        if (typeof typeHandler === 'undefined') {
            throw new DeveloperError('Unsupported GeoJSON object type: ' + geoJson.type);
        }

        //Check for a custom Coordinate Reference System.
        var crsPromise;
        var crs = geoJson.crs;
        if (typeof crs !== 'undefined') {
            if (crs === null) {
                throw new DeveloperError('crs is null.');
            }
            if (typeof crs.type === 'undefined') {
                throw new DeveloperError('Invalid crs property, crs.type is undefined.');
            } else if (typeof crs.properties === 'undefined') {
                throw new DeveloperError('Invalid crs property, crs.properties is undefined.');
            }

            var properties = crs.properties;
            if (crs.type === 'name') {
                var crsFunction = this._crsNameHandlers[properties.name];
                if (typeof crsFunction === 'undefined') {
                    throw new DeveloperError('Unknown crs name: ' + properties.name);
                }

                crsPromise = when(crsFunction, function(crsFunction) {
                    var deferred = when.defer();
                    deferred.resolve(crsFunction);
                    return deferred.promise;
                });
            } else if (crs.type === 'link') {
                var handler = this._crsLinkHrefHandlers[properties.href];
                if (typeof handler === 'undefined') {
                    handler = this._crsLinkHandlers;
                }

                if (typeof handler === 'undefined') {
                    throw new DeveloperError('Unable to resolve crs link: ' + properties);
                }

                crsPromise = handler(properties.href, properties.type);
            } else {
                throw new DeveloperError('Unknown crs type: ' + crs.type);
            }
        } else {
            //Use the default
            crsPromise = when(defaultCrsFunction, function(defaultCrsFunction) {
                var deferred = when.defer();
                deferred.resolve(defaultCrsFunction);
                return deferred.promise;
            });
        }

        this._dynamicObjectCollection.clear();

        var that = this;
        return crsPromise.then(function(crsFunction) {
            typeHandler(geoJson, that._dynamicObjectCollection, crsFunction, source);
            that._changed.raiseEvent(that);
        });
    };

    GeoJsonDataSource.prototype.loadUrl = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return loadJson(url).then(function(geoJson) {
            dataSource.load(geoJson, url);
        }, function(error) {
            this._error.raiseEvent(this, error);
        });
    };

    function defaultCrsFunction(coordinates) {
        var cartographic = Cartographic.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
        return Ellipsoid.WGS84.cartographicToCartesian(cartographic);
    }

    function applyPointDefaults(dynamicObject) {
        var point = new DynamicPoint();
        point.color = new StaticProperty(Color.BLUE);
        point.pixelSize = new StaticProperty(10);
        point.outlineColor = new StaticProperty(Color.BLACK);
        point.outlineWidth = new StaticProperty(1);
        dynamicObject.point = point;
    }

    function applyPolylineDefaults(dynamicObject) {
        var polyline = new DynamicPolyline();
        polyline.color = new StaticProperty(Color.BLUE);
        polyline.width = new StaticProperty(2);
        polyline.outlineColor = new StaticProperty(Color.BLACK);
        polyline.outlineWidth = new StaticProperty(1);
        dynamicObject.polyline = polyline;
    }

    var polygonMaterial = new DynamicMaterialProperty();
    polygonMaterial.processCzmlIntervals({
        solidColor : {
            color : {
                rgba : [0, 0, 255, 25.5]
            }
        }
    }, undefined, undefined);

    function applyPolygonDefaults(dynamicObject) {
        var polyline = new DynamicPolyline();
        polyline.color = new StaticProperty(Color.BLUE);
        polyline.width = new StaticProperty(1);
        polyline.outlineColor = new StaticProperty(Color.BLACK);
        polyline.outlineWidth = new StaticProperty(0);
        dynamicObject.polyline = polyline;

        var polygon = new DynamicPolygon();
        polygon.material = polygonMaterial;
        dynamicObject.polygon = polygon;
    }

    function processFeature(feature, dynamicObjectCollection, crsFunction, source) {
        if (typeof feature.geometry !== 'object') {
            throw new DeveloperError('feature.geometry is required to be an object.');
        }

        if (typeof feature.properties !== 'object') {
            throw new DeveloperError('feature.properties is required to be an object.');
        }

        if (feature.geometry === null) {
            //Null geometry is allowed, so just create an empty dynamicObject instance for it.
            var id = feature.id;
            if (typeof id === 'undefined') {
                id = createGuid();
            }
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
            dynamicObject.geoJson = feature;
        } else {
            var geometryType = feature.geometry.type;
            var geometryHandler = types[geometryType];
            if (typeof geometryHandler === 'undefined') {
                throw new DeveloperError('Unknown geometry type: ' + geometryType);
            }
            geometryHandler(feature, dynamicObjectCollection, crsFunction, source);
        }
    }

    function processFeatureCollection(featureCollection, dynamicObjectCollection, crsFunction, source) {
        var features = featureCollection.features;
        for ( var i = 0, len = features.length; i < len; i++) {
            processFeature(features[i], dynamicObjectCollection, crsFunction, source);
        }
    }

    function processGeometryCollection(geometryCollection, dynamicObjectCollection, crsFunction, source) {
        var geometries = geometryCollection.geometries;
        for ( var i = 0, len = geometries.length; i < len; i++) {
            var geometry = geometries[i];
            types[geometry.type](geometry, dynamicObjectCollection, crsFunction, source);
        }
    }

    function processLineString(feature, dynamicObjectCollection, crsFunction, source) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.geoJson = feature;

        var coordinates = feature.geometry.coordinates;
        var positions = new Array(coordinates.length);
        for ( var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        dynamicObject.vertexPositions = new StaticPositionProperty(positions);
        applyPolylineDefaults(dynamicObject);
    }

    function processMultiLineString(feature, dynamicObjectCollection, crsFunction, source) {
        var lineStrings = feature.geometry.coordinates;
        for ( var i = 0; i < lineStrings.length; i++) {
            var lineString = lineStrings[i];
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.geoJson = feature;
            var positions = new Array(lineString.length);
            for ( var z = 0; z < lineString.length; z++) {
                positions[z] = crsFunction(lineString[z]);
            }
            dynamicObject.vertexPositions = new StaticPositionProperty(positions);
            applyPolylineDefaults(dynamicObject);
        }
    }

    function processMultiPoint(feature, dynamicObjectCollection, crsFunction, source) {
        var coordinates = feature.geometry.coordinates;
        for ( var i = 0; i < coordinates.length; i++) {
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.geoJson = feature;
            dynamicObject.position = new StaticPositionProperty(crsFunction(coordinates[i]));
            applyPointDefaults(dynamicObject);
        }
    }

    function processMultiPolygon(feature, dynamicObjectCollection, crsFunction, source) {
        var polygons = feature.geometry.coordinates;
        for ( var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i];
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.geoJson = feature;

            //TODO holes
            var vertexPositions = polygon[0];
            for ( var q = 0; q < vertexPositions.length; q++) {
                var positions = new Array(vertexPositions.length);
                for ( var z = 0; z < vertexPositions.length; z++) {
                    positions[z] = crsFunction(vertexPositions[z]);
                }
                dynamicObject.vertexPositions = new StaticPositionProperty(positions);
                applyPolygonDefaults(dynamicObject);
            }
        }
    }

    function processPoint(feature, dynamicObjectCollection, crsFunction, source) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.geoJson = feature;

        dynamicObject.position = new StaticPositionProperty(crsFunction(feature.geometry.coordinates));
        applyPointDefaults(dynamicObject);
    }

    function processPolygon(feature, dynamicObjectCollection, crsFunction, source) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.geoJson = feature;

        //TODO Holes
        var coordinates = feature.geometry.coordinates[0];
        var positions = new Array(coordinates.length);
        for ( var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        dynamicObject.vertexPositions = new StaticPositionProperty(positions);
        applyPolygonDefaults(dynamicObject);
    }

    var types = {
        Feature : processFeature,
        FeatureCollection : processFeatureCollection,
        GeometryCollection : processGeometryCollection,
        LineString : processLineString,
        MultiLineString : processMultiLineString,
        MultiPoint : processMultiPoint,
        MultiPolygon : processMultiPolygon,
        Point : processPoint,
        Polygon : processPolygon
    };

    return GeoJsonDataSource;
});