/*global define*/
define(['../Core/createGuid',
        '../Core/Cartographic',
        '../Core/Color',
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
        './StaticPositionProperty'
        ], function(
                createGuid,
                Cartographic,
                Color,
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
                StaticPositionProperty) {
    "use strict";

    var GeoJsonDataSource = function() {
        this._changed = new Event();
        this._error = new Event();
        this._dynamicObjectCollection = new DynamicObjectCollection();
    };

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

        this._dynamicObjectCollection.clear();

        if (typeof geoJson.type === 'undefined') {
            throw new DeveloperError('Invalid GeoJSON.  Type not defined');
        }

        var callback = types[geoJson.type];
        if (typeof callback === 'undefined') {
            throw new DeveloperError('Unsupported feature type: ' + geoJson.type);
        }
        var crsFunction = defaultCrsFunction;
        if (typeof geoJson.crs !== 'undefined') {
            //TODO look up CRS transformation.
        }
        callback(geoJson, this._dynamicObjectCollection, crsFunction, source);
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
        types[feature.geometry.type](feature, dynamicObjectCollection, crsFunction, source);
    }

    function processFeatureCollection(featureCollection, dynamicObjectCollection, crsFunction, source) {
        var features = featureCollection.features;
        for ( var i = 0, len = features.length; i < len; i++) {
            var feature = features[i];
            types[feature.type](feature, dynamicObjectCollection, crsFunction, source);
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
        dynamicObject.feature = feature;

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
            dynamicObject.feature = feature;
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
            dynamicObject.feature = feature;
            dynamicObject.position = new StaticPositionProperty(crsFunction(coordinates[i]));
            applyPointDefaults(dynamicObject);
        }
    }

    function processMultiPolygon(feature, dynamicObjectCollection, crsFunction, source) {
        var polygons = feature.geometry.coordinates;
        for ( var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i];
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.feature = feature;

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
        dynamicObject.feature = feature;

        dynamicObject.position = new StaticPositionProperty(crsFunction(feature.geometry.coordinates));
        applyPointDefaults(dynamicObject);
    }

    function processPolygon(feature, dynamicObjectCollection, crsFunction, source) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.feature = feature;

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