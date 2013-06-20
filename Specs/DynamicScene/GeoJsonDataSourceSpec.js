/*global defineSuite*/
defineSuite(['DynamicScene/GeoJsonDataSource',
             'DynamicScene/DynamicObjectCollection',
             'Core/Cartographic',
             'Core/Ellipsoid',
             'Core/Event'
            ], function(
                    GeoJsonDataSource,
                    DynamicObjectCollection,
                    Cartographic,
                    Ellipsoid,
                    Event) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function coordinatesToCartesian(coordinates) {
        return Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(coordinates[0], coordinates[1]));
    }

    function coordinatesArrayToCartesian(coordinates) {
        var result = [];
        for ( var i = 0; i < coordinates.length; i++) {
            result.push(coordinatesToCartesian(coordinates[i]));
        }
        return result;
    }

    function multiLineToCartesian(geometry) {
        var coordinates = geometry.coordinates;
        var result = [];
        for (var i = 0; i < coordinates.length; i++) {
            result.push(coordinatesArrayToCartesian(coordinates[i]));
        }
        return result;
    }

    function polygonCoordinatesToCartesian(coordinates) {
        return coordinatesArrayToCartesian(coordinates[0]);
    }

    function multiPolygonCoordinatesToCartesian(coordinates) {
        var result = [];
        for (var i = 0; i < coordinates.length; i++) {
            result.push(coordinatesArrayToCartesian(coordinates[i][0]));
        }
        return result;
    }

    //All values are lon/lat degrees
    var point = {
        type : 'Point',
        coordinates : [102.0, 0.5]
    };

    var lineString = {
        type : 'LineString',
        coordinates : [[100.0, 0.0], [101.0, 1.0]]
    };

    var polygon = {
        type : 'Polygon',
        coordinates : [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]
    };

    var polygonWithHoles = {
        type : 'Polygon',
        coordinates : [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]], [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
    };

    var multiPoint = {
        type : 'MultiPoint',
        coordinates : [[100.0, 0.0], [101.0, 1.0], [101.0, 3.0]]
    };

    var multiLineString = {
        type : 'MultiLineString',
        coordinates : [[[100.0, 0.0], [101.0, 1.0]], [[102.0, 2.0], [103.0, 3.0]]]
    };

    var multiPolygon = {
        type : 'MultiPolygon',
        coordinates : [[[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
                         [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                          [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]]
    };

    var geometryCollection = {
        type : 'GeometryCollection',
        'geometries' : [{
            type : 'Point',
            coordinates : [100.0, 0.0]
        }, {
            type : 'LineString',
            coordinates : [[101.0, 0.0], [102.0, 1.0]]
        }]
    };

    var feature = {
        type : 'Feature',
        geometry : point
    };

    var featureWithId = {
        id : 'myId',
        type : 'Feature',
        geometry : point
    };

    var featureUndefinedGeometry = {
        type : 'Feature'
    };

    var featureNullGeometry = {
        type : 'Feature',
        geometry : null
    };

    var unknownGeometry = {
        type : 'TimeyWimey',
        coordinates : [0, 0]
    };

    var featureUnknownGeometry = {
        type : 'Feature',
        geometry : unknownGeometry
    };

    var geometryCollectionUnknownType = {
        type : 'GeometryCollection',
        'geometries' : [unknownGeometry]
    };

    it('default constructor has expected values', function() {
        var dataSource = new GeoJsonDataSource();
        expect(dataSource.getChangedEvent()).toBeInstanceOf(Event);
        expect(dataSource.getErrorEvent()).toBeInstanceOf(Event);
        expect(dataSource.getClock()).toBeUndefined();
        expect(dataSource.getDynamicObjectCollection()).toBeInstanceOf(DynamicObjectCollection);
        expect(dataSource.getDynamicObjectCollection().getObjects().length).toEqual(0);
        expect(dataSource.getIsTimeVarying()).toEqual(false);
    });

    it('Works with null geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureNullGeometry);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.geoJson).toBe(featureNullGeometry);
            expect(pointObject.position).toBeUndefined();
        });
    });

    it('Works with feature', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(feature);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.geoJson).toBe(feature);
            expect(pointObject.position.getValueCartesian()).toEqual(coordinatesToCartesian(feature.geometry.coordinates));
            expect(pointObject.point).toBeDefined();
        });
    });

    it('Works with feature with id', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureWithId);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.id).toEqual(featureWithId.id);
        });
    });

    it('Works with point geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(point);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var pointObject = dynamicObjectCollection.getObjects()[0];
            expect(pointObject.geoJson).toBe(point);
            expect(pointObject.position.getValueCartesian()).toEqual(coordinatesToCartesian(point.coordinates));
            expect(pointObject.point).toBeDefined();
        });
    });

    it('Works with multipoint geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiPoint);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === multiPoint.coordinates.length;
        });
        runs(function() {
            var objects = dynamicObjectCollection.getObjects();
            var expectedPositions = coordinatesArrayToCartesian(multiPoint.coordinates);
            for ( var i = 0; i < multiPoint.coordinates.length; i++) {
                var object = objects[i];
                expect(object.geoJson).toBe(multiPoint);
                expect(object.position.getValueCartesian()).toEqual(expectedPositions[i]);
                expect(object.point).toBeDefined();
            }
        });
    });

    it('Works with lineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(lineString);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var object = dynamicObjectCollection.getObjects()[0];
            expect(object.geoJson).toBe(lineString);
            expect(object.vertexPositions.getValueCartesian()).toEqual(coordinatesArrayToCartesian(lineString.coordinates));
            expect(object.polyline).toBeDefined();
        });
    });

    it('Works with multiLineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiLineString);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 2;
        });
        runs(function() {
            var objects = dynamicObjectCollection.getObjects();
            var lines = multiLineToCartesian(multiLineString);
            for ( var i = 0; i < multiLineString.coordinates.length; i++) {
                var object = objects[i];
                expect(object.geoJson).toBe(multiLineString);
                expect(object.vertexPositions.getValueCartesian()).toEqual(lines[i]);
                expect(object.polyline).toBeDefined();
            }
        });
    });

    it('Works with polygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(polygon);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var object = dynamicObjectCollection.getObjects()[0];
            expect(object.geoJson).toBe(polygon);
            expect(object.vertexPositions.getValueCartesian()).toEqual(polygonCoordinatesToCartesian(polygon.coordinates));
            expect(object.polyline).toBeDefined();
            expect(object.polygon).toBeDefined();
        });
    });

    it('Works with polygon geometry with holes', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(polygonWithHoles);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 1;
        });
        runs(function() {
            var object = dynamicObjectCollection.getObjects()[0];
            expect(object.geoJson).toBe(polygonWithHoles);
            expect(object.vertexPositions.getValueCartesian()).toEqual(polygonCoordinatesToCartesian(polygonWithHoles.coordinates));
            expect(object.polyline).toBeDefined();
            expect(object.polygon).toBeDefined();
        });
    });

    it('Works with multiPolygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiPolygon);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 2;
        });
        runs(function() {
            var objects = dynamicObjectCollection.getObjects();
            var positions = multiPolygonCoordinatesToCartesian(multiPolygon.coordinates);
            for ( var i = 0; i < multiPolygon.coordinates.length; i++) {
                var object = objects[i];
                expect(object.geoJson).toBe(multiPolygon);
                expect(object.vertexPositions.getValueCartesian()).toEqual(positions[i]);
                expect(object.polyline).toBeDefined();
                expect(object.polygon).toBeDefined();
            }
        });
    });

    it('Works with geometrycollection', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(geometryCollection);

        var dynamicObjectCollection = dataSource.getDynamicObjectCollection();
        waitsFor(function() {
            return dynamicObjectCollection.getObjects().length === 2;
        });
        runs(function() {
            var object = dynamicObjectCollection.getObjects()[0];
            expect(object.geoJson).toBe(geometryCollection);
            expect(object.position.getValueCartesian()).toEqual(coordinatesToCartesian(geometryCollection.geometries[0].coordinates));
            expect(object.point).toBeDefined();

            object = dynamicObjectCollection.getObjects()[1];
            expect(object.geoJson).toBe(geometryCollection);
            expect(object.vertexPositions.getValueCartesian()).toEqual(coordinatesArrayToCartesian(geometryCollection.geometries[1].coordinates));
            expect(object.polyline).toBeDefined();
        });
    });

    it('loadUrl works', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.loadUrl('Data/test.geojson');

        waitsFor(function() {
            return dataSource.getDynamicObjectCollection().getObjects().length === 3;
        });
    });

    it('Fails when encountering unknown geometry', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(featureUnknownGeometry).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('Fails with undefined geomeetry', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(featureUndefinedGeometry).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('Fails with unknown geomeetry in geometryCollection', function() {
        var dataSource = new GeoJsonDataSource();

        var failed = false;
        dataSource.load(geometryCollectionUnknownType).then(undefined, function(e) {
            failed = true;
        });

        waitsFor(function() {
            return failed;
        });
    });

    it('load throws with undefined geojson', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrow();
    });

    it('load throws with unknown geometry', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(unknownGeometry);
        }).toThrow();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrow();
    });

    it('load throws with null crs', function() {
        var featureWithNullCrs = {
            type : 'Feature',
            geometry : point,
            crs : null
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithNullCrs);
        }).toThrow();
    });

    it('load throws with unknown crs type', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'potato'
            }
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithUnknownCrsType);
        }).toThrow();
    });

    it('load throws with undefined crs properties', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'name'
            }
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithUnknownCrsType);
        }).toThrow();
    });

    it('load throws with unknown crs', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'name',
                properties : {
                    name : 'failMe'
                }
            }
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithUnknownCrsType);
        }).toThrow();
    });

    it('load throws with unknown crs link', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'link',
                properties : {
                    href : 'failMe',
                    type : 'failMeTwice'
                }
            }
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithUnknownCrsType);
        }).toThrow();
    });
});
