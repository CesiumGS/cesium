defineSuite([
        'Core/HeightmapTessellator',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/GeographicProjection',
        'Core/Math',
        'Core/Proj4Projection',
        'Core/Rectangle',
        'Core/WebMercatorProjection'
    ], function(
        HeightmapTessellator,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        GeographicProjection,
        CesiumMath,
        Proj4Projection,
        Rectangle,
        WebMercatorProjection) {
    'use strict';

    var geographicProjection = new GeographicProjection();

    it('throws when heightmap is not provided', function() {
        expect(function() {
            HeightmapTessellator.computeVertices(undefined, geographicProjection);
        }).toThrowDeveloperError();

        expect(function() {
            HeightmapTessellator.computeVertices({
                width : 2,
                height : 2,
                vertices : [],
                nativeRectangle : {
                    west : 10.0,
                    south : 20.0,
                    east : 20.0,
                    north : 30.0
                },
                skirtHeight : 10.0
            }, geographicProjection);
        }).toThrowDeveloperError();
    });

    it('throws when width or height is not provided', function() {
        expect(function() {
            HeightmapTessellator.computeVertices({
                heightmap : [1.0, 2.0, 3.0, 4.0],
                height : 2,
                vertices : [],
                nativeRectangle : {
                    west : 10.0,
                    south : 20.0,
                    east : 20.0,
                    north : 30.0
                },
                skirtHeight : 10.0
            }, geographicProjection);
        }).toThrowDeveloperError();

        expect(function() {
            HeightmapTessellator.computeVertices({
                heightmap : [1.0, 2.0, 3.0, 4.0],
                width : 2,
                vertices : [],
                nativeRectangle : {
                    west : 10.0,
                    south : 20.0,
                    east : 20.0,
                    north : 30.0
                },
                skirtHeight : 10.0
            }, geographicProjection);
        }).toThrowDeveloperError();
    });

    it('throws when nativeRectangle is not provided', function() {
        expect(function() {
            HeightmapTessellator.computeVertices({
                heightmap : [1.0, 2.0, 3.0, 4.0],
                width : 2,
                height : 2,
                vertices : [],
                skirtHeight : 10.0
            }, geographicProjection);
        }).toThrowDeveloperError();
    });

    it('throws when skirtHeight is not provided', function() {
        expect(function() {
            HeightmapTessellator.computeVertices({
                heightmap : [1.0, 2.0, 3.0, 4.0],
                width : 2,
                height : 2,
                vertices : [],
                nativeRectangle : {
                    west : 10.0,
                    south : 20.0,
                    east : 20.0,
                    north : 30.0
                }
            }, geographicProjection);
        }).toThrowDeveloperError();
    });

    it('throws when mapProjection is not provided', function() {
        expect(function() {
            HeightmapTessellator.computeVertices({
                heightmap : [1.0, 2.0, 3.0, 4.0],
                width : 2,
                height : 2,
                vertices : [],
                skirtHeight : 10.0,
                nativeRectangle : {
                    west : 10.0,
                    south : 20.0,
                    east : 20.0,
                    north : 30.0
                }
            });
        }).toThrowDeveloperError();
    });

    it('creates mesh without skirt', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 10.0,
                south : 30.0,
                east : 20.0,
                north : 40.0
            },
            rectangle : new Rectangle(
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(30.0),
                CesiumMath.toRadians(20.0),
                CesiumMath.toRadians(40.0))
        };
        var results = HeightmapTessellator.computeVertices(options, geographicProjection);
        var vertices = results.vertices;

        var ellipsoid = Ellipsoid.WGS84;
        var nativeRectangle = options.nativeRectangle;

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, j / (height - 1));
            latitude = CesiumMath.toRadians(latitude);
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, i / (width - 1));
                longitude = CesiumMath.toRadians(longitude);

                var heightSample = options.heightmap[j * width + i];

                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                    longitude : longitude,
                    latitude : latitude,
                    height : heightSample
                });

                var index = (j * width + i) * 6;
                var vertexPosition = new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]);

                expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
                expect(vertices[index + 3]).toEqual(heightSample);
                expect(vertices[index + 4]).toEqualEpsilon(i / (width - 1), CesiumMath.EPSILON7);
                expect(vertices[index + 5]).toEqualEpsilon(1.0 - j / (height - 1), CesiumMath.EPSILON7);
            }
        }
    });

    it('creates mesh with skirt', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 10.0,
            nativeRectangle : {
                west : 10.0,
                east : 20.0,
                south : 30.0,
                north : 40.0
            }
        };
        var results = HeightmapTessellator.computeVertices(options, geographicProjection);
        var vertices = results.vertices;

        var ellipsoid = Ellipsoid.WGS84;
        var nativeRectangle = options.nativeRectangle;

        for (var j = -1; j <= height; ++j) {
            var realJ = CesiumMath.clamp(j, 0, height - 1);
            var latitude = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, realJ / (height - 1));
            latitude = CesiumMath.toRadians(latitude);
            for (var i = -1; i <= width; ++i) {
                var realI = CesiumMath.clamp(i, 0, width - 1);
                var longitude = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, realI / (width - 1));
                longitude = CesiumMath.toRadians(longitude);

                var heightSample = options.heightmap[realJ * width + realI];

                if (realI !== i || realJ !== j) {
                    heightSample -= options.skirtHeight;
                }

                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                                                                                   longitude : longitude,
                                                                                   latitude : latitude,
                                                                                   height : heightSample
                                                                               });

                var index = ((j + 1) * (width + 2) + i + 1) * 6;
                var vertexPosition = new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]);

                expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
                expect(vertices[index + 3]).toEqual(heightSample);
                expect(vertices[index + 4]).toEqualEpsilon(realI / (width - 1), CesiumMath.EPSILON7);
                expect(vertices[index + 5]).toEqualEpsilon(1.0 - realJ / (height - 1), CesiumMath.EPSILON7);
            }
        }
    });

    it('creates quantized mesh', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 10.0,
            nativeRectangle : {
                west : 0.01,
                east : 0.02,
                south : 0.01,
                north : 0.02
            }
        };
        var results = HeightmapTessellator.computeVertices(options, geographicProjection);
        var vertices = results.vertices;

        var ellipsoid = Ellipsoid.WGS84;
        var nativeRectangle = options.nativeRectangle;

        for (var j = -1; j <= height; ++j) {
            var realJ = CesiumMath.clamp(j, 0, height - 1);
            var latitude = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, realJ / (height - 1));
            latitude = CesiumMath.toRadians(latitude);
            for (var i = -1; i <= width; ++i) {
                var realI = CesiumMath.clamp(i, 0, width - 1);
                var longitude = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, realI / (width - 1));
                longitude = CesiumMath.toRadians(longitude);

                var heightSample = options.heightmap[realJ * width + realI];

                if (realI !== i || realJ !== j) {
                    heightSample -= options.skirtHeight;
                }

                var index = ((j + 1) * (width + 2) + i + 1);
                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                                                                                   longitude : longitude,
                                                                                   latitude : latitude,
                                                                                   height : heightSample
                                                                               });
                expect(results.encoding.decodePosition(vertices, index)).toEqualEpsilon(expectedVertexPosition, 1.0);
            }
        }
    });

    it('tessellates web mercator heightmaps', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 1000000.0,
                east : 2000000.0,
                south : 3000000.0,
                north : 4000000.0
            },
            isGeographic : false
        };
        var ellipsoid = Ellipsoid.WGS84;
        var projection = new WebMercatorProjection(ellipsoid);
        var results = HeightmapTessellator.computeVertices(options, projection);
        var vertices = results.vertices;

        var nativeRectangle = options.nativeRectangle;

        var geographicSouthwest = projection.unproject(new Cartesian2(nativeRectangle.west, nativeRectangle.south));
        var geographicNortheast = projection.unproject(new Cartesian2(nativeRectangle.east, nativeRectangle.north));

        for (var j = 0; j < height; ++j) {
            var y = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, j / (height - 1));
            for (var i = 0; i < width; ++i) {
                var x = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, i / (width - 1));

                var latLon = projection.unproject(new Cartesian2(x, y));
                var longitude = latLon.longitude;
                var latitude = latLon.latitude;

                var heightSample = options.heightmap[j * width + i];

                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                    longitude : longitude,
                    latitude : latitude,
                    height : heightSample
                });

                var index = (j * width + i) * 6;
                var vertexPosition = new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]);

                var expectedU = (longitude - geographicSouthwest.longitude) / (geographicNortheast.longitude - geographicSouthwest.longitude);
                var expectedV = (latitude - geographicSouthwest.latitude) / (geographicNortheast.latitude - geographicSouthwest.latitude);

                expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
                expect(vertices[index + 3]).toEqual(heightSample);
                expect(vertices[index + 4]).toEqualEpsilon(expectedU, CesiumMath.EPSILON7);
                expect(vertices[index + 5]).toEqualEpsilon(expectedV, CesiumMath.EPSILON7);
            }
        }
    });

    it('generates 2D position attributes for projections other than Geographic and Web Mercator', function() {
        var width = 3;
        var height = 3;
        var projection = new Proj4Projection('+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs');

        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 10.0,
                south : 30.0,
                east : 20.0,
                north : 40.0
            },
            rectangle : new Rectangle(
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(30.0),
                CesiumMath.toRadians(20.0),
                CesiumMath.toRadians(40.0))
        };
        var results = HeightmapTessellator.computeVertices(options, projection);
        var vertices = results.vertices;

        var rectangle = options.rectangle;

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(rectangle.north, rectangle.south, j / (height - 1));
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(rectangle.west, rectangle.east, i / (width - 1));

                var expectedVertexPosition2d = projection.project(new Cartographic(longitude, latitude));

                var index = (j * width + i) * 9 + 6;
                var vertexPosition2d = new Cartesian3(vertices[index], vertices[index + 1], 0.0);

                expect(Cartesian3.equalsEpsilon(vertexPosition2d, expectedVertexPosition2d, CesiumMath.EPSILON7)).toBe(true);
            }
        }
    });

    it('generates 2D position attributes with relative-to-center', function() {
        var width = 3;
        var height = 3;
        var projection = new Proj4Projection('+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs');

        var rectangle = new Rectangle(
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(30.0),
            CesiumMath.toRadians(20.0),
            CesiumMath.toRadians(40.0));

        var options = {
            heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 10.0,
                south : 30.0,
                east : 20.0,
                north : 40.0
            },
            rectangle : rectangle,
            relativeToCenter : projection.ellipsoid.cartographicToCartesian(Rectangle.center(rectangle))
        };
        var results = HeightmapTessellator.computeVertices(options, projection);
        var vertices = results.vertices;
        var center2D = results.encoding.center2D;

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(rectangle.north, rectangle.south, j / (height - 1));
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(rectangle.west, rectangle.east, i / (width - 1));

                var expectedVertexPosition2d = projection.project(new Cartographic(longitude, latitude));

                var index = (j * width + i) * 9 + 6;
                var vertexPosition2d = new Cartesian3(vertices[index], vertices[index + 1], 0.0);
                vertexPosition2d.x += center2D.x;
                vertexPosition2d.y += center2D.y;

                expect(Cartesian3.equalsEpsilon(vertexPosition2d, expectedVertexPosition2d, CesiumMath.EPSILON7)).toBe(true);
            }
        }
    });

    it('supports multi-element little endian heights', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 100.0,
                         3.0, 4.0, 100.0,
                         5.0, 6.0, 100.0,
                         7.0, 8.0, 100.0,
                         9.0, 10.0, 100.0,
                         11.0, 12.0, 100.0,
                         13.0, 14.0, 100.0,
                         15.0, 16.0, 100.0,
                         17.0, 18.0, 100.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 10.0,
                south : 30.0,
                east : 20.0,
                north : 40.0
            },
            rectangle : new Rectangle(
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(30.0),
                CesiumMath.toRadians(20.0),
                CesiumMath.toRadians(40.0)),
            structure : {
                stride : 3,
                elementsPerHeight : 2,
                elementMultiplier : 10
            }
        };
        var results = HeightmapTessellator.computeVertices(options, geographicProjection);
        var vertices = results.vertices;

        var ellipsoid = Ellipsoid.WGS84;
        var nativeRectangle = options.nativeRectangle;

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, j / (height - 1));
            latitude = CesiumMath.toRadians(latitude);
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, i / (width - 1));
                longitude = CesiumMath.toRadians(longitude);

                var heightSampleIndex = (j * width + i) * options.structure.stride;
                var heightSample = options.heightmap[heightSampleIndex] + options.heightmap[heightSampleIndex + 1] * 10.0;

                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                    longitude : longitude,
                    latitude : latitude,
                    height : heightSample
                });

                var index = (j * width + i) * 6;
                var vertexPosition = new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]);

                expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
                expect(vertices[index + 3]).toEqual(heightSample);
                expect(vertices[index + 4]).toEqualEpsilon(i / (width - 1), CesiumMath.EPSILON7);
                expect(vertices[index + 5]).toEqualEpsilon(1.0 - j / (height - 1), CesiumMath.EPSILON7);
            }
        }
    });

    it('supports multi-element big endian heights', function() {
        var width = 3;
        var height = 3;
        var options = {
            heightmap : [1.0, 2.0, 100.0,
                         3.0, 4.0, 100.0,
                         5.0, 6.0, 100.0,
                         7.0, 8.0, 100.0,
                         9.0, 10.0, 100.0,
                         11.0, 12.0, 100.0,
                         13.0, 14.0, 100.0,
                         15.0, 16.0, 100.0,
                         17.0, 18.0, 100.0],
            width : width,
            height : height,
            skirtHeight : 0.0,
            nativeRectangle : {
                west : 10.0,
                south : 30.0,
                east : 20.0,
                north : 40.0
            },
            rectangle : new Rectangle(
                CesiumMath.toRadians(10.0),
                CesiumMath.toRadians(30.0),
                CesiumMath.toRadians(20.0),
                CesiumMath.toRadians(40.0)),
            structure : {
                stride : 3,
                elementsPerHeight : 2,
                elementMultiplier : 10,
                isBigEndian : true
            }
        };
        var results = HeightmapTessellator.computeVertices(options, geographicProjection);
        var vertices = results.vertices;

        var ellipsoid = Ellipsoid.WGS84;
        var nativeRectangle = options.nativeRectangle;

        for (var j = 0; j < height; ++j) {
            var latitude = CesiumMath.lerp(nativeRectangle.north, nativeRectangle.south, j / (height - 1));
            latitude = CesiumMath.toRadians(latitude);
            for (var i = 0; i < width; ++i) {
                var longitude = CesiumMath.lerp(nativeRectangle.west, nativeRectangle.east, i / (width - 1));
                longitude = CesiumMath.toRadians(longitude);

                var heightSampleIndex = (j * width + i) * options.structure.stride;
                var heightSample = options.heightmap[heightSampleIndex] * 10.0 + options.heightmap[heightSampleIndex + 1];

                var expectedVertexPosition = ellipsoid.cartographicToCartesian({
                    longitude : longitude,
                    latitude : latitude,
                    height : heightSample
                });

                var index = (j * width + i) * 6;
                var vertexPosition = new Cartesian3(vertices[index], vertices[index + 1], vertices[index + 2]);

                expect(vertexPosition).toEqualEpsilon(expectedVertexPosition, 1.0);
                expect(vertices[index + 3]).toEqual(heightSample);
                expect(vertices[index + 4]).toEqualEpsilon(i / (width - 1), CesiumMath.EPSILON7);
                expect(vertices[index + 5]).toEqualEpsilon(1.0 - j / (height - 1), CesiumMath.EPSILON7);
            }
        }
    });
});
