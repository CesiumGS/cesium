/*global defineSuite*/
defineSuite([
        'DataSources/GeoJsonDataSource',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Event',
        'Core/JulianDate',
        'Core/PolygonHierarchy',
        'DataSources/EntityCollection',
        'Specs/waitsForPromise',
        'ThirdParty/when'
    ], function(
        GeoJsonDataSource,
        Cartesian3,
        Color,
        Event,
        JulianDate,
        PolygonHierarchy,
        EntityCollection,
        waitsForPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var defaultMarkerSize;
    var defaultSymbol;
    var defaultMarkerColor;
    var defaultStroke;
    var defaultStrokeWidth;
    var defaultFill;

    beforeAll(function() {
        defaultMarkerSize = GeoJsonDataSource.markerSize;
        defaultSymbol = GeoJsonDataSource.markerSymbol;
        defaultMarkerColor = GeoJsonDataSource.markerColor;
        defaultStroke = GeoJsonDataSource.stroke;
        defaultStrokeWidth = GeoJsonDataSource.strokeWidth;
        defaultFill = GeoJsonDataSource.fill;
    });

    beforeEach(function() {
        GeoJsonDataSource.markerSize = defaultMarkerSize;
        GeoJsonDataSource.markerSymbol = defaultSymbol;
        GeoJsonDataSource.markerColor = defaultMarkerColor;
        GeoJsonDataSource.stroke = defaultStroke;
        GeoJsonDataSource.strokeWidth = defaultStrokeWidth;
        GeoJsonDataSource.fill = defaultFill;
    });

    var time = new JulianDate();

    function coordinatesToCartesian(coordinates) {
        return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
    }

    function coordinatesArrayToCartesian(coordinates) {
        var result = [];
        for (var i = 0; i < coordinates.length; i++) {
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
        return coordinatesArrayToCartesian(coordinates);
    }

    function multiPolygonCoordinatesToCartesian(coordinates) {
        var result = [];
        for (var i = 0; i < coordinates.length; i++) {
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
        coordinates : [[[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]], [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]]]
    };

    var geometryCollection = {
        type : 'GeometryCollection',
        geometries : [{
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
        geometries : [unknownGeometry]
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

    var mixedGeometries = {
        type : 'GeometryCollection',
        geometries : [lineString, polygon, point]
    };

    it('default constructor has expected values', function() {
        var dataSource = new GeoJsonDataSource();
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.entities.values.length).toEqual(0);
    });

    it('Works with null geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(featureNullGeometry), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(featureNullGeometry.properties);
            expect(entity.position).toBeUndefined();
        });
    });

    it('Works with feature', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(feature), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(feature.properties);
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(feature.geometry.coordinates));
            expect(entity.billboard).toBeDefined();
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
        waitsForPromise(dataSource.load(featureWithProperties), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.description).toBeDefined();
            var description = entity.description.getValue(time);
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
        waitsForPromise(dataSource.load(featureWithDescription), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.description).toBeDefined();
            expect(entity.description.getValue(time)).toEqual(featureWithDescription.properties.description);
        });
    });

    it('Does not use "name" property as the object\'s name if it is null', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(featureWithNullName), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.name).toBeUndefined();
            expect(entity.properties).toBe(featureWithNullName.properties);
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(featureWithNullName.geometry.coordinates));
            expect(entity.billboard).toBeDefined();
        });
    });

    it('Works with feature with id', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(featureWithId), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.id).toEqual(featureWithId.id);
            entity = entityCollection.values[1];
            expect(entity.id).toEqual(featureWithId.id + '_2');
        });
    });

    it('Works with point geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(point), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(point.properties);
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
            expect(entity.billboard).toBeDefined();
            expect(entity.billboard.image).toBeDefined();
        });
    });

    it('Works with multipoint geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(multiPoint), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;
            var expectedPositions = coordinatesArrayToCartesian(multiPoint.coordinates);
            for (var i = 0; i < multiPoint.coordinates.length; i++) {
                var entity = entities[i];
                expect(entity.properties).toBe(multiPoint.properties);
                expect(entity.position.getValue(time)).toEqual(expectedPositions[i]);
                expect(entity.billboard).toBeDefined();
                expect(entity.billboard.image).toBeDefined();
            }
        });
    });

    it('Works with lineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(lineString), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(lineString.properties);
            expect(entity.polyline.positions.getValue(time)).toEqual(coordinatesArrayToCartesian(lineString.coordinates));
            expect(entity.polyline.material.color.getValue(time)).toEqual(GeoJsonDataSource.stroke);
            expect(entity.polyline.width.getValue(time)).toEqual(2);
        });
    });

    it('Works with multiLineString geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(multiLineString), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;
            var lines = multiLineToCartesian(multiLineString);
            for (var i = 0; i < multiLineString.coordinates.length; i++) {
                var entity = entities[i];
                expect(entity.properties).toBe(multiLineString.properties);
                expect(entity.polyline.positions.getValue(time)).toEqual(lines[i]);
                expect(entity.polyline.material.color.getValue(time)).toEqual(Color.YELLOW);
                expect(entity.polyline.width.getValue(time)).toEqual(2);
            }
        });
    });

    it('Works with polygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(polygon), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(polygon.properties);
            expect(entity.polygon.hierarchy.getValue(time)).toEqual(new PolygonHierarchy(polygonCoordinatesToCartesian(polygon.coordinates[0])));
            expect(entity.polygon.perPositionHeight).toBeUndefined();
            expect(entity.polygon.material.color.getValue(time)).toEqual(GeoJsonDataSource.fill);
            expect(entity.polygon.outline.getValue(time)).toEqual(true);
            expect(entity.polygon.outlineWidth.getValue(time)).toEqual(GeoJsonDataSource.strokeWidth);
            expect(entity.polygon.outlineColor.getValue(time)).toEqual(GeoJsonDataSource.stroke);
        });
    });

    it('Works with polygon geometry with Heights', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(polygonWithHeights), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(polygonWithHeights.properties);
            expect(entity.polygon.hierarchy.getValue(time)).toEqual(new PolygonHierarchy(polygonCoordinatesToCartesian(polygonWithHeights.coordinates[0])));
            expect(entity.polygon.perPositionHeight.getValue(time)).toBe(true);
            expect(entity.polygon.material.color.getValue(time)).toEqual(GeoJsonDataSource.fill);
            expect(entity.polygon.outline.getValue(time)).toEqual(true);
            expect(entity.polygon.outlineWidth.getValue(time)).toEqual(GeoJsonDataSource.strokeWidth);
            expect(entity.polygon.outlineColor.getValue(time)).toEqual(GeoJsonDataSource.stroke);
        });
    });

    it('Works with polygon geometry with holes', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(polygonWithHoles), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(polygonWithHoles.properties);
            expect(entity.polygon.hierarchy.getValue(time)).toEqual(new PolygonHierarchy(polygonCoordinatesToCartesian(polygonWithHoles.coordinates[0]), [new PolygonHierarchy(polygonCoordinatesToCartesian(polygonWithHoles.coordinates[1]))]));
        });
    });

    it('Works with multiPolygon geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(multiPolygon), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;
            var positions = multiPolygonCoordinatesToCartesian(multiPolygon.coordinates);
            for (var i = 0; i < multiPolygon.coordinates.length; i++) {
                var entity = entities[i];
                expect(entity.properties).toBe(multiPolygon.properties);
                expect(entity.polygon.hierarchy.getValue(time)).toEqual(new PolygonHierarchy(positions[i]));
            }
        });
    });

    it('Works with topojson geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(topoJson), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;

            var polygon = entities[0];
            expect(polygon.properties).toBe(topoJson.objects.polygon.properties);
            expect(polygon.polygon.hierarchy).toBeDefined();

            var lineString = entities[1];
            expect(lineString.properties).toBe(topoJson.objects.lineString.properties);
            expect(lineString.polyline).toBeDefined();
        });
    });

    it('Can provide base styling options', function() {
        var options = {
            markerSize : 10,
            markerSymbol : 'bus',
            markerColor : Color.GREEN,
            stroke : Color.ORANGE,
            strokeWidth : 8,
            fill : Color.RED
        };

        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(mixedGeometries, options), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;

            var entity = entities[0];
            expect(entity.polyline.material.color.getValue()).toEqual(options.stroke);
            expect(entity.polyline.width.getValue()).toEqual(options.strokeWidth);

            entity = entities[1];
            expect(entity.polygon.material.color.getValue()).toEqual(options.fill);
            expect(entity.polygon.outlineColor.getValue()).toEqual(options.stroke);
            expect(entity.polygon.outlineWidth.getValue()).toEqual(options.strokeWidth);

            entity = entities[2];
            var expectedImage = dataSource._pinBuilder.fromMakiIconId(options.markerSymbol, options.markerColor, options.markerSize);
            expect(entity.billboard.image.getValue()).toEqual(expectedImage);
        });
    });

    it('Can set default graphics', function() {
        GeoJsonDataSource.markerSize = 10;
        GeoJsonDataSource.markerSymbol = 'bus';
        GeoJsonDataSource.markerColor = Color.GREEN;
        GeoJsonDataSource.stroke = Color.ORANGE;
        GeoJsonDataSource.strokeWidth = 8;
        GeoJsonDataSource.fill = Color.RED;

        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(mixedGeometries), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;

            var entity = entities[0];
            expect(entity.polyline.material.color.getValue()).toEqual(GeoJsonDataSource.stroke);
            expect(entity.polyline.width.getValue()).toEqual(GeoJsonDataSource.strokeWidth);

            entity = entities[1];
            expect(entity.polygon.material.color.getValue()).toEqual(GeoJsonDataSource.fill);
            expect(entity.polygon.outlineColor.getValue()).toEqual(GeoJsonDataSource.stroke);
            expect(entity.polygon.outlineWidth.getValue()).toEqual(GeoJsonDataSource.strokeWidth);

            entity = entities[2];
            var expectedImage = dataSource._pinBuilder.fromMakiIconId(GeoJsonDataSource.markerSymbol, GeoJsonDataSource.markerColor, GeoJsonDataSource.markerSize);
            expect(entity.billboard.image.getValue()).toEqual(expectedImage);
        });
    });

    it('Generates description', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(topoJson), function() {
            var entityCollection = dataSource.entities;
            var entities = entityCollection.values;
            var polygon = entities[0];
            expect(polygon.description).toBeDefined();
        });
    });

    it('Works with geometrycollection', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(geometryCollection), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.properties).toBe(geometryCollection.properties);
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(geometryCollection.geometries[0].coordinates));
            expect(entity.billboard).toBeDefined();

            entity = entityCollection.values[1];
            expect(entity.properties).toBe(geometryCollection.properties);
            expect(entity.polyline.positions.getValue(time)).toEqual(coordinatesArrayToCartesian(geometryCollection.geometries[1].coordinates));
        });
    });

    it('Works with named crs', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(pointNamedCrs), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
        });
    });

    it('Works with link crs href', function() {
        var projectedPosition = new Cartesian3(1, 2, 3);
        GeoJsonDataSource.crsLinkHrefs[pointCrsLinkHref.crs.properties.href] = function(properties) {
            expect(properties).toBe(pointCrsLinkHref.crs.properties);
            return when(properties.href).then(function(href) {
                return function(coordinate) {
                    expect(coordinate).toBe(pointCrsLinkHref.coordinates);
                    return projectedPosition;
                };
            });
        };

        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load(pointCrsLinkHref), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.position.getValue(time)).toEqual(projectedPosition);
        });
    });

    it('Works with EPSG crs', function() {
        var dataSource = new GeoJsonDataSource();

        waitsForPromise(dataSource.load(pointCrsEpsg), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.position.getValue(time)).toEqual(coordinatesToCartesian(point.coordinates));
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
        waitsForPromise(dataSource.load(geoJson), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
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
        waitsForPromise(dataSource.load(geoJson), function() {
            var entityCollection = dataSource.entities;
            var entity = entityCollection.values[0];
            expect(entity.name).toEqual(geoJson.properties.title);
            expect(entity.description.getValue(time)).toEqual(geoJson.properties.description);

            var expectedFill = Color.fromCssColorString(geoJson.properties.fill);
            expectedFill.alpha = geoJson.properties['fill-opacity'];

            var expectedOutlineColor = Color.fromCssColorString(geoJson.properties.stroke);
            expectedOutlineColor.alpha = geoJson.properties['stroke-opacity'];

            expect(entity.polygon.material.color.getValue(time)).toEqual(expectedFill);
            expect(entity.polygon.outline.getValue(time)).toEqual(true);
            expect(entity.polygon.outlineWidth.getValue(time)).toEqual(5);
            expect(entity.polygon.outlineColor.getValue(time)).toEqual(expectedOutlineColor);
        });
    });

    it('load works with a URL', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise(dataSource.load('Data/test.geojson'), function() {
            expect(dataSource.name).toEqual('test.geojson');
        });
    });

    it('Fails when encountering unknown geometry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise.toReject(dataSource.load(featureUnknownGeometry));
    });

    it('Fails with undefined geomeetry', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise.toReject(dataSource.load(featureUndefinedGeometry));
    });

    it('Fails with unknown geomeetry in geometryCollection', function() {
        var dataSource = new GeoJsonDataSource();
        waitsForPromise.toReject(dataSource.load(geometryCollectionUnknownType));
    });

    it('load throws with undefined geoJson', function() {
        var dataSource = new GeoJsonDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('rejects unknown geometry', function() {
        waitsForPromise.toReject(GeoJsonDataSource.load(unknownGeometry));
    });

    it('rejects invalid url', function() {
        waitsForPromise.toReject(GeoJsonDataSource.load('invalid.geojson'));
    });

    it('rejects null CRS', function() {
        var featureWithNullCrs = {
            type : 'Feature',
            geometry : point,
            crs : null
        };

        waitsForPromise.toReject(GeoJsonDataSource.load(featureWithNullCrs));
    });

    it('rejects unknown CRS', function() {
        var featureWithUnknownCrsType = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'potato',
                properties : {}
            }
        };

        waitsForPromise.toReject(GeoJsonDataSource.load(featureWithUnknownCrsType));
    });

    it('rejects undefined CRS properties', function() {
        var featureWithUndefinedCrsProperty = {
            type : 'Feature',
            geometry : point,
            crs : {
                type : 'name'
            }
        };

        waitsForPromise.toReject(GeoJsonDataSource.load(featureWithUndefinedCrsProperty));
    });

    it('rejects unknown CRS name', function() {
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

        waitsForPromise.toReject(GeoJsonDataSource.load(featureWithUnknownCrsType));
    });

    it('rejects unknown CRS link', function() {
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

        waitsForPromise.toReject(GeoJsonDataSource.load(featureWithUnknownCrsType));
    });

    it('load rejects loading non json file', function() {
        var dataSource = new GeoJsonDataSource();
        var spy = jasmine.createSpy('errorEvent');
        dataSource.errorEvent.addEventListener(spy);

        waitsForPromise.toReject(dataSource.load('Data/Images/Blue.png'), function() {
            expect(spy).toHaveBeenCalled();
        });
    });

    it('load raises loading event', function() {
        var dataSource = new GeoJsonDataSource();
        var spy = jasmine.createSpy('loadingEvent');
        dataSource.loadingEvent.addEventListener(spy);

        var promise = dataSource.load('Data/test.geojson');
        expect(spy).toHaveBeenCalledWith(dataSource, true);
        expect(dataSource.isLoading).toBe(true);
        spy.reset();

        waitsForPromise(promise, function() {
            expect(spy).toHaveBeenCalledWith(dataSource, false);
            expect(dataSource.isLoading).toBe(false);
        });
    });
});