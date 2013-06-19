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

    var staticColorCzml = {
        solidColor : {
            color : {
                rgba : [0, 0, 255, 25.5]
            }
        }
    };

    var material = new DynamicMaterialProperty();
    material.processCzmlIntervals(staticColorCzml, undefined, undefined);

    function applyPolygonDefaults(dynamicObject) {
        var polyline = new DynamicPolyline();
        polyline.color = new StaticProperty(Color.BLUE);
        polyline.width = new StaticProperty(1);
        polyline.outlineColor = new StaticProperty(Color.BLACK);
        polyline.outlineWidth = new StaticProperty(0);
        dynamicObject.polyline = polyline;

        var polygon = new DynamicPolygon();
        polygon.material = material;
        dynamicObject.polygon = polygon;
    }

    function processFeature(feature, dynamicObjectCollection) {
        processors[feature.geometry.type](feature, dynamicObjectCollection);
    }

    function processFeatureCollection(featureCollection, dynamicObjectCollection) {
        var features = featureCollection.features;
        for ( var i = 0, len = features.length; i < len; i++) {
            var feature = features[i];
            processors[feature.type](feature, dynamicObjectCollection);
        }
    }

    function processGeometryCollection(geometryCollection, dynamicObjectCollection) {
        var geometries = geometryCollection.geometries;
        for ( var i = 0, len = geometries.length; i < len; i++) {
            var geometry = geometries[i];
            processors[geometry.type](geometry, dynamicObjectCollection);
        }
    }

    function processLineString(feature, dynamicObjectCollection) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.feature = feature;

        var coordinates = feature.geometry.coordinates;
        var positions = new Array(coordinates.length);
        for ( var i = 0; i < coordinates.length; i++) {
            positions[i] = Cartographic.fromDegrees(coordinates[i][0], coordinates[i][1]);
        }
        dynamicObject.vertexPositions = new StaticPositionProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions));
        applyPolylineDefaults(dynamicObject);
    }

    function processMultiLineString(feature, dynamicObjectCollection) {
        var lineStrings = feature.geometry.coordinates;
        for ( var i = 0; i < lineStrings.length; i++) {
            var lineString = lineStrings[i];
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.feature = feature;

            for ( var q = 0; q < lineString.length; q++) {
                var positions = new Array(lineString.length);
                var index = 0;
                for ( var z = 0; z < lineString.length; z++) {
                    positions[index++] = Cartographic.fromDegrees(lineString[i][0], lineString[i][1]);
                }
                dynamicObject.vertexPositions = new StaticPositionProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions));
                applyPolylineDefaults(dynamicObject);
            }
        }
    }

    function processMultiPoint(feature, dynamicObjectCollection) {
        var coordinates = feature.geometry.coordinates;
        for ( var i = 0; i < coordinates.length; i++) {
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.feature = feature;

            var position = Cartographic.fromDegrees(coordinates[i][0], coordinates[i][1]);
            dynamicObject.position = new StaticPositionProperty(Ellipsoid.WGS84.cartographicToCartesian(position));
            applyPointDefaults(dynamicObject);
        }
    }

    function processMultiPolygon(feature, dynamicObjectCollection) {
        var polygons = feature.geometry.coordinates;
        for ( var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i];
            var dynamicObject = dynamicObjectCollection.getOrCreateObject(createGuid());
            dynamicObject.feature = feature;

            //TODO holes
            var vertexPositions = polygon[0];
            for ( var q = 0; q < vertexPositions.length; q++) {
                var positions = new Array(vertexPositions.length);
                var index = 0;
                for ( var z = 0; z < vertexPositions.length; z++) {
                    positions[index++] = Cartographic.fromDegrees(vertexPositions[i][0], vertexPositions[i][1]);
                }
                dynamicObject.vertexPositions = new StaticPositionProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions));
                applyPolygonDefaults(dynamicObject);
            }
        }
    }

    function processPoint(feature, dynamicObjectCollection) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.feature = feature;

        var coordinates = feature.geometry.coordinates;
        var position = Cartographic.fromDegrees(coordinates[0], coordinates[1]);
        dynamicObject.position = new StaticPositionProperty(Ellipsoid.WGS84.cartographicToCartesian(position));
        applyPointDefaults(dynamicObject);
    }

    function processPolygon(feature, dynamicObjectCollection) {
        var id = feature.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.feature = feature;

        //TODO Holes
        var coordinates = feature.geometry.coordinates[0];
        var positions = new Array(coordinates.length);
        var index = 0;
        for ( var i = 0; i < coordinates.length; i++) {
            positions[index++] = Cartographic.fromDegrees(coordinates[i][0], coordinates[i][1]);
        }
        dynamicObject.vertexPositions = new StaticPositionProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions));
        applyPolygonDefaults(dynamicObject);
    }

    var processors = {
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

    GeoJsonDataSource.prototype.load = function(geoJson) {
        if (typeof geoJson === 'undefined') {
            throw new DeveloperError('geoJson is required.');
        }

        this._dynamicObjectCollection.clear();

        if (typeof geoJson.type === 'undefined') {
            throw new DeveloperError('Invalid GeoJSON.  Type not defined');
        }

        var callback = processors[geoJson.type];
        if (typeof callback === 'undefined') {
            throw new DeveloperError('Unsupported feature type: ' + geoJson.type);
        }
        callback(geoJson, this._dynamicObjectCollection);
    };

    GeoJsonDataSource.prototype.loadUrl = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return loadJson(url).then(function(geoJson) {
            dataSource.load(geoJson);
        }, function(error) {
            this._error.raiseEvent(this, error);
        });
    };

    return GeoJsonDataSource;
});