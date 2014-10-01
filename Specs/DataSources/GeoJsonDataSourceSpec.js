/*global defineSuite*/
defineSuite([
        'DataSources/GeoJsonDataSource',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Event',
        'Core/JulianDate',
        'DataSources/EntityCollection',
        'ThirdParty/when'
    ], function(
        GeoJsonDataSource,
        Cartesian3,
        Color,
        Event,
        JulianDate,
        EntityCollection,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();

    function coordinatesToCartesian(coordinates) {
        return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
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
        for ( var i = 0; i < coordinates.length; i++) {
            result.push(coordinatesArrayToCartesian(coordinates[i]));
        }
        return result;
    }

    function polygonCoordinatesToCartesian(coordinates) {
        return coordinatesArrayToCartesian(coordinates[0]);
    }

    function multiPolygonCoordinatesToCartesian(coordinates) {
        var result = [];
        for ( var i = 0; i < coordinates.length; i++) {
            result.push(coordinatesArrayToCartesian(coordinates[i][0]));
        }
        return result;
    }

    var point = {
        type : 'Point',
        coordinates : [102.0, 0.5]
    };

    var pointNamedCrs = {
        type : 'Point',
        coordinates : [102.0, 0.5],
        crs : {
            type : 'name',
            properties : {
                name : 'EPSG:4326'
            }
        }
    };

    var pointCrsLinkHref = {
        type : 'Point',
        coordinates : [102.0, 0.5],
        crs : {
            type : 'link',
            properties : {
                href : 'http://crs.invalid'
            }
        }
    };

    var pointCrsEpsg = {
        type : 'Point',
        coordinates : [102.0, 0.5],
        crs : {
            type : 'EPSG',
            properties : {
                code : 4326
            }
        }
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

    var polygonWithHeights = {
            type : 'Polygon',
            coordinates : [[[100.0, 0.0, 1.0], [101.0, 0.0, 2.0], [101.0, 1.0, 1.0], [100.0, 1.0, 2.0], [100.0, 0.0, 3.0]]]
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

    var featureWithNullName = {
        type : 'Feature',
        geometry : point,
        properties : {
            name : null
        }
    };

    var featureWithId = {
        id : 'myId',
        type : 'Feature',
        geometry : geometryCollection
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

    var topoJson = {
        type : 'Topology',
        transform : {
            scale : [1, 1],
            translate : [0, 0]
        },
        objects : {
            polygon : {
                type : 'Polygon',
                arcs : [[0, 1, 2, 3]],
                properties : {
                    myProps : 0
                }
            },
            lineString : {
                type : 'LineString',
                arcs : [4],
                properties : {
                    myProps : 1
                }
            }
        },
        arcs : [[[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]], [[0, 0], [1, 0], [0, 1]], [[1, 1], [-1, 0], [0, -1]], [[1, 1]], [[0, 0]]]
    };

    it('default constructor has expected values', function() {
        var dataSource = new GeoJsonDataSource();
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.entities.entities.length).toEqual(0);
    });

    it('Works with null geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureNullGeometry);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.properties).toBe(featureNullGeometry.properties);
            expect(pointObject.position).toBeUndefined();
        });
    });

    it('Works with feature', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(feature);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.properties).toBe(feature.properties);
            expect(pointObject.position.getValue(time)).toEqual(coordinatesToCartesian(feature.geometry.coordinates));
            expect(pointObject.billboard).toBeDefined();
        });
    });

    it('Creates description from properties', function() {
        var featureWithProperties = {
            type : 'Feature',
            geometry : point,
            properties : {
                prop1 : 'dog',
                prop2 : 'cat',
                prop3 : 'liger'
            }
        };

        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureWithProperties);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.description).toBeDefined();
            var description = pointObject.description.getValue(time);
            expect(description).toContain('prop1');
            expect(description).toContain('prop2');
            expect(description).toContain('prop3');
            expect(description).toContain('dog');
            expect(description).toContain('cat');
            expect(description).toContain('liger');
        });
    });

    it('Uses description if present', function() {
        var featureWithDescription = {
            type : 'Feature',
            geometry : point,
            properties : {
                prop1 : 'dog',
                prop2 : 'cat',
                prop3 : 'liger',
                description : 'This is my descriptiong!'
            }
        };

        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureWithDescription);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.description).toBeDefined();
            expect(pointObject.description.getValue(time)).toEqual(featureWithDescription.properties.description);
        });
    });

    it('Does not use "name" property as the object\'s name if it is null', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureWithNullName);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.name).toBeUndefined();
            expect(pointObject.properties).toBe(featureWithNullName.properties);
            expect(pointObject.position.getValue(time)).toEqual(coordinatesToCartesian(featureWithNullName.geometry.coordinates));
            expect(pointObject.billboard).toBeDefined();
        });
    });

    it('Works with feature with id', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(featureWithId);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.id).toEqual(featureWithId.id);
            var lineString = entityCollection.entities[1];
            expect(lineString.id).toEqual(featureWithId.id + '_2');
        });
    });

    it('Works with point geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(point);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.properties).toBe(point.properties);
            expect(pointObject.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
            expect(pointObject.billboard).toBeDefined();
            expect(pointObject.billboard.image).toBeDefined();
        });
    });

    it('Works with multipoint geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiPoint);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === multiPoint.coordinates.length;
        });
        runs(function() {
            var objects = entityCollection.entities;
            var expectedPositions = coordinatesArrayToCartesian(multiPoint.coordinates);
            for ( var i = 0; i < multiPoint.coordinates.length; i++) {
                var object = objects[i];
                expect(object.properties).toBe(multiPoint.properties);
                expect(object.position.getValue(time)).toEqual(expectedPositions[i]);
                expect(object.billboard).toBeDefined();
                expect(object.billboard.image).toBeDefined();
            }
        });
    });

    it('Works with lineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(lineString);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var object = entityCollection.entities[0];
            expect(object.properties).toBe(lineString.properties);
            expect(object.polyline.positions.getValue(time)).toEqual(coordinatesArrayToCartesian(lineString.coordinates));
            expect(object.polyline.material.color.getValue(time)).toEqual(Color.YELLOW);
            expect(object.polyline.width.getValue(time)).toEqual(2);
        });
    });

    it('Works with multiLineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiLineString);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var objects = entityCollection.entities;
            var lines = multiLineToCartesian(multiLineString);
            for ( var i = 0; i < multiLineString.coordinates.length; i++) {
                var object = objects[i];
                expect(object.properties).toBe(multiLineString.properties);
                expect(object.polyline.positions.getValue(time)).toEqual(lines[i]);
                expect(object.polyline.material.color.getValue(time)).toEqual(Color.YELLOW);
                expect(object.polyline.width.getValue(time)).toEqual(2);
            }
        });
    });

    it('Works with polygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(polygon);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var object = entityCollection.entities[0];
            expect(object.properties).toBe(polygon.properties);
            expect(object.polygon.positions.getValue(time)).toEqual(polygonCoordinatesToCartesian(polygon.coordinates));
            expect(object.polygon.perPositionHeight).toBeUndefined();
            expect(object.polygon.material.color.getValue(time)).toEqual(Color.fromBytes(255, 255, 0, 100));
            expect(object.polygon.outline.getValue(time)).toEqual(true);
            expect(object.polygon.outlineColor.getValue(time)).toEqual(Color.BLACK);
        });
    });

    it('Works with polygon geometry with Heights', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(polygonWithHeights);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var object = entityCollection.entities[0];
            expect(object.properties).toBe(polygonWithHeights.properties);
            expect(object.polygon.positions.getValue(time)).toEqual(polygonCoordinatesToCartesian(polygonWithHeights.coordinates));
            expect(object.polygon.perPositionHeight.getValue(time)).toBe(true);
            expect(object.polygon.material.color.getValue(time)).toEqual(Color.fromBytes(255, 255, 0, 100));
            expect(object.polygon.outline.getValue(time)).toEqual(true);
            expect(object.polygon.outlineColor.getValue(time)).toEqual(Color.BLACK);
        });
    });

    it('Works with polygon geometry with holes', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(polygonWithHoles);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var object = entityCollection.entities[0];
            expect(object.properties).toBe(polygonWithHoles.properties);
            expect(object.polygon.positions.getValue(time)).toEqual(polygonCoordinatesToCartesian(polygonWithHoles.coordinates));
        });
    });

    it('Works with multiPolygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(multiPolygon);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var objects = entityCollection.entities;
            var positions = multiPolygonCoordinatesToCartesian(multiPolygon.coordinates);
            for ( var i = 0; i < multiPolygon.coordinates.length; i++) {
                var object = objects[i];
                expect(object.properties).toBe(multiPolygon.properties);
                expect(object.polygon.positions.getValue(time)).toEqual(positions[i]);
            }
        });
    });

    it('Works with topojson geometry', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(topoJson);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var objects = entityCollection.entities;

            var polygon = objects[0];
            expect(polygon.properties).toBe(topoJson.objects.polygon.properties);
            expect(polygon.polygon.positions).toBeDefined();

            var lineString = objects[1];
            expect(lineString.properties).toBe(topoJson.objects.lineString.properties);
            expect(lineString.polyline).toBeDefined();
        });
    });

    it('Generates description', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(topoJson);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var objects = entityCollection.entities;
            var polygon = objects[0];
            expect(polygon.description).toBeDefined();
        });
    });

    it('Works with geometrycollection', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(geometryCollection);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 2;
        });
        runs(function() {
            var object = entityCollection.entities[0];
            expect(object.properties).toBe(geometryCollection.properties);
            expect(object.position.getValue(time)).toEqual(coordinatesToCartesian(geometryCollection.geometries[0].coordinates));
            expect(object.billboard).toBeDefined();

            object = entityCollection.entities[1];
            expect(object.properties).toBe(geometryCollection.properties);
            expect(object.polyline.positions.getValue(time)).toEqual(coordinatesArrayToCartesian(geometryCollection.geometries[1].coordinates));
        });
    });

    it('Works with named crs', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(pointNamedCrs);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
        });
    });

    it('Works with link crs href', function() {
        var projectedPosition = new Cartesian3(1, 2, 3);

        var dataSource = new GeoJsonDataSource();
        GeoJsonDataSource.crsLinkHrefs[pointCrsLinkHref.crs.properties.href] = function(properties) {
            expect(properties).toBe(pointCrsLinkHref.crs.properties);
            return when(properties.href, function(href) {
                return function(coordinate) {
                    expect(coordinate).toBe(pointCrsLinkHref.coordinates);
                    return projectedPosition;
                };
            });
        };
        dataSource.load(pointCrsLinkHref);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.position.getValue(time)).toEqual(projectedPosition);
        });
    });

    it('Works with EPSG crs', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.load(pointCrsEpsg);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var pointObject = entityCollection.entities[0];
            expect(pointObject.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
        });
    });

    it('Works with polyline using simplestyle', function() {
        var geoJson = {
            type : 'Feature',
            geometry : {
                type : 'LineString',
                coordinates : [[100.0, 0.0], [101.0, 1.0]]
            },
            properties : {
                title : 'textMarker',
                description : 'My description',
                stroke : '#aabbcc',
                'stroke-opacity' : 0.5,
                'stroke-width' : 5
            }
        };

        var dataSource = new GeoJsonDataSource();
        dataSource.load(geoJson);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var entity = entityCollection.entities[0];
            expect(entity.name).toEqual(geoJson.properties.title);
            expect(entity.description.getValue(time)).toEqual(geoJson.properties.description);

            var expectedColor = Color.fromCssColorString(geoJson.properties.stroke);
            expectedColor.alpha = geoJson.properties['stroke-opacity'];
            expect(entity.polyline.material.color.getValue(time)).toEqual(expectedColor);
            expect(entity.polyline.width.getValue(time)).toEqual(geoJson.properties['stroke-width']);
        });
    });


    it('Works with polygon using simplestyle', function() {
        var geoJson = {
            type : 'Feature',
            geometry : {
                type : 'Polygon',
                coordinates : [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]
            },
            properties : {
                title : 'textMarker',
                description : 'My description',
                stroke : '#aabbcc',
                'stroke-opacity' : 0.5,
                'stroke-width' : 5,
                fill : '#ccaabb',
                'fill-opacity' : 0.25
            }
        };

        var dataSource = new GeoJsonDataSource();
        dataSource.load(geoJson);

        var entityCollection = dataSource.entities;
        waitsFor(function() {
            return entityCollection.entities.length === 1;
        });
        runs(function() {
            var entity = entityCollection.entities[0];
            expect(entity.name).toEqual(geoJson.properties.title);
            expect(entity.description.getValue(time)).toEqual(geoJson.properties.description);

            var expectedFill = Color.fromCssColorString(geoJson.properties.fill);
            expectedFill.alpha = geoJson.properties['fill-opacity'];

            var expectedOutlineColor = Color.fromCssColorString(geoJson.properties.stroke);
            expectedOutlineColor.alpha = geoJson.properties['stroke-opacity'];

            expect(entity.polygon.material.color.getValue(time)).toEqual(expectedFill);
            expect(entity.polygon.outline.getValue(time)).toEqual(true);
            expect(entity.polygon.outlineColor.getValue(time)).toEqual(expectedOutlineColor);
        });
    });

    it('loadUrl works', function() {
        var dataSource = new GeoJsonDataSource();
        dataSource.loadUrl('Data/test.geojson');

        waitsFor(function() {
            return dataSource.entities.entities.length === 4;
        });

        runs(function() {
            expect(dataSource.name).toEqual('test.geojson');
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

    it('load throws with undefined geoJson', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('load throws with unknown geometry', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(unknownGeometry);
        }).toThrowDeveloperError();
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrowDeveloperError();
    });

    it('loadUrl raises error with invalud url', function() {
        var dataSource = new GeoJsonDataSource();
        var thrown = false;
        dataSource.errorEvent.addEventListener(function() {
            thrown = true;
        });
        dataSource.loadUrl('invalid.geojson');
        waitsFor(function() {
            return thrown;
        });
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
        }).toThrowRuntimeError();
    });

    it('load throws with unknown crs type', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'potato',
                properties : {}
            }
        };

        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(featureWithUnknownCrsType);
        }).toThrowRuntimeError();
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
        }).toThrowRuntimeError();
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
        }).toThrowRuntimeError();
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
        }).toThrowRuntimeError();
    });

    it('raises error when an error occurs in loadUrl', function() {
        var dataSource = new GeoJsonDataSource();

        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        var promise = dataSource.loadUrl('Data/Images/Blue.png'); //not JSON

        var resolveSpy = jasmine.createSpy('resolve');
        var rejectSpy = jasmine.createSpy('reject');
        when(promise, resolveSpy, rejectSpy);

        waitsFor(function() {
            return rejectSpy.wasCalled;
        });

        runs(function() {
            expect(spy).toHaveBeenCalledWith(dataSource, jasmine.any(Error));
            expect(rejectSpy).toHaveBeenCalledWith(jasmine.any(Error));
            expect(resolveSpy).not.toHaveBeenCalled();
        });
    });
});