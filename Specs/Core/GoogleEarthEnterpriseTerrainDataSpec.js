/*global defineSuite*/
defineSuite([
    'Core/GoogleEarthEnterpriseTerrainData',
    'Core/BoundingSphere',
    'Core/Cartesian3',
    'Core/Cartographic',
    'Core/Ellipsoid',
    'Core/GeographicTilingScheme',
    'Core/Math',
    'Core/Matrix4',
    'Core/Rectangle',
    'Core/TerrainData',
    'Core/TerrainMesh',
    'Core/Transforms',
    'ThirdParty/when'
], function(
    GoogleEarthEnterpriseTerrainData,
    BoundingSphere,
    Cartesian3,
    Cartographic,
    Ellipsoid,
    GeographicTilingScheme,
    CesiumMath,
    Matrix4,
    Rectangle,
    TerrainData,
    TerrainMesh,
    Transforms,
    when) {
    'use strict';

    var sizeOfUint8 = Uint8Array.BYTES_PER_ELEMENT;
    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
    var sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;
    var toEarthRadii = 1.0/6371010.0;

    function getBuffer(tilingScheme, x, y, level) {
        var rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        var center = Rectangle.center(rectangle);
        var southwest = Rectangle.southwest(rectangle);
        var stepX = CesiumMath.toDegrees(rectangle.width / 2) / 180.0;
        var stepY = CesiumMath.toDegrees(rectangle.height / 2) / 180.0;

        // 2 Uint8s: x and y values in units of step
        var pointSize = 2 * sizeOfUint8 + sizeOfFloat;

        // 3 shorts
        var faceSize = 3 * sizeOfUint16;

        // Doubles: OriginX, OriginY, SizeX, SizeY
        // Int32s: numPoints, numFaces, level
        // 4 corner points
        // 2 face (3 shorts)
        var quadSize = 4 * sizeOfDouble + 3 * sizeOfInt32 + 4 * pointSize + 2 * faceSize;

        // QuadSize + size of each quad
        var totalSize = 4 * (quadSize + sizeOfUint32);
        var buf = new ArrayBuffer(totalSize);
        var dv = new DataView(buf);

        var altitudeStart = 0;
        var offset = 0;
        for(var i=0;i<4;++i) {
            altitudeStart = 0;
            dv.setUint32(offset, quadSize, true);
            offset += sizeOfUint32;

            // Origin
            var xOrigin = southwest.longitude;
            var yOrigin = southwest.latitude;
            if (i & 1) {
                xOrigin = center.longitude;
                altitudeStart = 10;
            }
            if (i & 2) {
                yOrigin = center.latitude;
            }

            dv.setFloat64(offset, CesiumMath.toDegrees(xOrigin)/180.0, true);
            offset += sizeOfDouble;
            dv.setFloat64(offset, CesiumMath.toDegrees(yOrigin)/180.0, true);
            offset += sizeOfDouble;

            // Step - Each step is a degree
            dv.setFloat64(offset, stepX, true);
            offset += sizeOfDouble;
            dv.setFloat64(offset, stepY, true);
            offset += sizeOfDouble;

            // NumPoints
            dv.setInt32(offset, 4, true);
            offset += sizeOfInt32;

            // NumFaces
            dv.setInt32(offset, 2, true);
            offset += sizeOfInt32;

            // Level
            dv.setInt32(offset, 0, true);
            offset += sizeOfInt32;

            // Points
            for (var j = 0; j < 4; ++j) {
                var xPos = 0;
                var yPos = 0;
                var altitude = altitudeStart;
                if (j & 1) {
                    ++xPos;
                    altitude += 10;
                }
                if (j & 2) {
                    ++yPos;
                }

                dv.setUint8(offset++, xPos);
                dv.setUint8(offset++, yPos);
                dv.setFloat32(offset, altitude * toEarthRadii, true);
                offset += sizeOfFloat;
            }

            // Faces
            var indices = [0,1,2,1,3,2];
            for (j = 0; j < indices.length; ++j) {
                dv.setUint16(offset, indices[j], true);
                offset += sizeOfUint16;
            }
        }

        return buf;
    }

    it('conforms to TerrainData interface', function() {
        expect(GoogleEarthEnterpriseTerrainData).toConformToInterface(TerrainData);
    });

    describe('upsample', function() {
        function findVertexWithCoordinates(uBuffer, vBuffer, u, v) {
            u *= 32767;
            u |= 0;
            v *= 32767;
            v |= 0;
            for (var i = 0; i < uBuffer.length; ++i) {
                if (Math.abs(uBuffer[i] - u) <= 1 && Math.abs(vBuffer[i] - v) <= 1) {
                    return i;
                }
            }
            return -1;
        }

        function hasTriangle(ib, i0, i1, i2) {
            for (var i = 0; i < ib.length; i += 3) {
                if (ib[i] === i0 && ib[i + 1] === i1 && ib[i + 2] === i2 ||
                    ib[i] === i1 && ib[i + 1] === i2 && ib[i + 2] === i0 ||
                    ib[i] === i2 && ib[i + 1] === i0 && ib[i + 2] === i1) {

                    return true;
                }
            }

            return false;
        }

        function intercept(interceptCoordinate1, interceptCoordinate2, otherCoordinate1, otherCoordinate2) {
            return CesiumMath.lerp(otherCoordinate1, otherCoordinate2, (0.5 - interceptCoordinate1) / (interceptCoordinate2 - interceptCoordinate1));
        }

        function horizontalIntercept(u1, v1, u2, v2) {
            return intercept(v1, v2, u1, u2);
        }

        function verticalIntercept(u1, v1, u2, v2) {
            return intercept(u1, u2, v1, v2);
        }

        it('works for all four children of a simple quad', function() {
            var maxShort = 32767;
            tilingScheme = new GeographicTilingScheme();
            var buffer = getBuffer(tilingScheme, 0, 0, 0);
            var data = new GoogleEarthEnterpriseTerrainData({
                buffer : buffer,
                childTileMask : 15
            });

            var tilingScheme = new GeographicTilingScheme();
            var childRectangles = [
                tilingScheme.tileXYToRectangle(0, 0, 1),
                tilingScheme.tileXYToRectangle(1, 0, 1),
                tilingScheme.tileXYToRectangle(0, 1, 1),
                tilingScheme.tileXYToRectangle(1, 1, 1)
            ];

            return when(data.createMesh(tilingScheme, 0, 0, 0, 1)).then(function() {
                var swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
                var sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
                var nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
                var nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);
                return when.join(swPromise, sePromise, nwPromise, nePromise);
            }).then(function(upsampleResults) {
                expect(upsampleResults.length).toBe(4);

                for (var i = 0; i < upsampleResults.length; ++i) {
                    var upsampled = upsampleResults[i];
                    expect(upsampled).toBeDefined();

                    var uBuffer = upsampled._uValues;
                    var vBuffer = upsampled._vValues;
                    var ib = upsampled._indices;
                    var heights = upsampled._heightValues;

                    expect(uBuffer.length).toBe(4);
                    expect(vBuffer.length).toBe(4);
                    expect(heights.length).toBe(4);
                    expect(ib.length).toBe(6);

                    var rectangle = childRectangles[i];
                    var north = 0;
                    var south = 0;
                    var east = 0;
                    var west = 0;
                    var index, u, v, h;
                    for (var j = 0; j < ib.length; ++j) {
                        index = ib[j];
                        u = (uBuffer[index] / maxShort) * rectangle.width + rectangle.west;
                        v = (vBuffer[index] / maxShort) * rectangle.height + rectangle.south;
                        if (CesiumMath.equalsEpsilon(u, rectangle.west, CesiumMath.EPSILON7)) {
                            ++west;
                        } else if (CesiumMath.equalsEpsilon(u, rectangle.east, CesiumMath.EPSILON7)) {
                            ++east;
                        }

                        if (CesiumMath.equalsEpsilon(v, rectangle.south, CesiumMath.EPSILON7)) {
                            ++south;
                        } else if (CesiumMath.equalsEpsilon(v, rectangle.north, CesiumMath.EPSILON7)) {
                            ++north;
                        }
                    }

                    // Each one is made up of 2 triangles
                    expect(north).toEqual(3);
                    expect(south).toEqual(3);
                    expect(east).toEqual(3);
                    expect(west).toEqual(3);

                    // Each side of quad has 2 edge points
                    expect(upsampled._westIndices.length).toEqual(2);
                    expect(upsampled._southIndices.length).toEqual(2);
                    expect(upsampled._eastIndices.length).toEqual(2);
                    expect(upsampled._northIndices.length).toEqual(2);
                }
            });
        });
/*
        it('works for a quad with an extra vertex in the northwest child', function() {
            var data = new GoogleEarthEnterpriseTerrainData({
                minimumHeight : 0.0,
                maximumHeight : 6.0,
                quantizedVertices : new Uint16Array([ // order is sw, nw, se, ne, extra vertex in nw quadrant
                    // u
                    0, 0, 32767, 32767, 0.125 * 32767,
                    // v
                    0, 32767, 0, 32767, 0.75 * 32767,
                    // heights
                    32767 / 6.0, 2.0 * 32767 / 6.0, 3.0 * 32767 / 6.0, 4.0 * 32767 / 6.0, 32767
                ]),
                indices : new Uint16Array([
                    0, 4, 1,
                    0, 2, 4,
                    1, 4, 3,
                    3, 4, 2
                ]),
                boundingSphere : new BoundingSphere(),
                horizonOcclusionPoint : new Cartesian3(),
                westIndices : [],
                southIndices : [],
                eastIndices : [],
                northIndices : [],
                westSkirtHeight : 1.0,
                southSkirtHeight : 1.0,
                eastSkirtHeight : 1.0,
                northSkirtHeight : 1.0,
                childTileMask : 15
            });

            var tilingScheme = new GeographicTilingScheme();
            return when(data.createMesh(tilingScheme, 0, 0, 0, 1)).then(function() {
                return data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
            }).then(function(upsampled) {
                var uBuffer = upsampled._uValues;
                var vBuffer = upsampled._vValues;
                var ib = upsampled._indices;

                expect(uBuffer.length).toBe(9);
                expect(vBuffer.length).toBe(9);
                expect(upsampled._heightValues.length).toBe(9);
                expect(ib.length).toBe(8 * 3);

                var sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
                expect(sw).not.toBe(-1);
                var nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
                expect(nw).not.toBe(-1);
                var se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
                expect(se).not.toBe(-1);
                var ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
                expect(ne).not.toBe(-1);
                var extra = findVertexWithCoordinates(uBuffer, vBuffer, 0.25, 0.5);
                expect(extra).not.toBe(-1);
                var v40 = findVertexWithCoordinates(uBuffer, vBuffer, horizontalIntercept(0.0, 0.0, 0.125, 0.75) * 2.0, 0.0);
                expect(v40).not.toBe(-1);
                var v42 = findVertexWithCoordinates(uBuffer, vBuffer, horizontalIntercept(0.5, verticalIntercept(1.0, 0.0, 0.125, 0.75), 0.125, 0.75) * 2.0, 0.0);
                expect(v42).not.toBe(-1);
                var v402 = findVertexWithCoordinates(uBuffer, vBuffer, horizontalIntercept(0.5, 0.0, 0.125, 0.75) * 2.0, 0.0);
                expect(v402).not.toBe(-1);
                var v43 = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, verticalIntercept(1.0, 1.0, 0.125, 0.75) * 2.0 - 1.0);
                expect(v43).not.toBe(-1);

                expect(hasTriangle(ib, sw, extra, nw)).toBe(true);
                expect(hasTriangle(ib, sw, v40, extra)).toBe(true);
                expect(hasTriangle(ib, v40, v402, extra)).toBe(true);
                expect(hasTriangle(ib, v402, v42, extra)).toBe(true);
                expect(hasTriangle(ib, extra, v42, v43)).toBe(true);
                expect(hasTriangle(ib, v42, se, v43)).toBe(true);
                expect(hasTriangle(ib, nw, v43, ne)).toBe(true);
                expect(hasTriangle(ib, nw, extra, v43)).toBe(true);
            });
        });

        it('works for a quad with an extra vertex on the splitting plane', function() {
            var data = new GoogleEarthEnterpriseTerrainData({
                minimumHeight : 0.0,
                maximumHeight : 6.0,
                quantizedVertices : new Uint16Array([ // order is sw, nw, se, ne, extra vertex in nw quadrant
                    // u
                    0, 0, 32767, 32767, 0.5 * 32767,
                    // v
                    0, 32767, 0, 32767, 0.75 * 32767,
                    // heights
                    32767 / 6.0, 2.0 * 32767 / 6.0, 3.0 * 32767 / 6.0, 4.0 * 32767 / 6.0, 32767
                ]),
                indices : new Uint16Array([
                    0, 4, 1,
                    1, 4, 3,
                    0, 2, 4,
                    3, 4, 2
                ]),
                boundingSphere : new BoundingSphere(),
                horizonOcclusionPoint : new Cartesian3(),
                westIndices : [],
                southIndices : [],
                eastIndices : [],
                northIndices : [],
                westSkirtHeight : 1.0,
                southSkirtHeight : 1.0,
                eastSkirtHeight : 1.0,
                northSkirtHeight : 1.0,
                childTileMask : 15
            });

            var tilingScheme = new GeographicTilingScheme();
            return when(data.createMesh(tilingScheme, 0, 0, 0, 1)).then(function() {
                var nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
                var nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
                return when.join(nwPromise, nePromise);
            }).then(function(upsampleResults){
                expect(upsampleResults.length).toBe(2);
                var uBuffer, vBuffer;
                for (var i = 0; i < upsampleResults.length; i++) {
                    var upsampled = upsampleResults[i];
                    expect(upsampled).toBeDefined();

                    uBuffer = upsampled._uValues;
                    vBuffer = upsampled._vValues;
                    var ib = upsampled._indices;

                    expect(uBuffer.length).toBe(6);
                    expect(vBuffer.length).toBe(6);
                    expect(upsampled._heightValues.length).toBe(6);
                    expect(ib.length).toBe(4 * 3);

                    var sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
                    expect(sw).not.toBe(-1);
                    var nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
                    expect(nw).not.toBe(-1);
                    var se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
                    expect(se).not.toBe(-1);
                    var ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
                    expect(ne).not.toBe(-1);
                }

                // northwest
                uBuffer = upsampleResults[0]._uValues;
                vBuffer = upsampleResults[0]._vValues;
                var extra = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.5);
                expect(extra).not.toBe(-1);
                var v40 = findVertexWithCoordinates(uBuffer, vBuffer, horizontalIntercept(0.0, 0.0, 0.5, 0.75) * 2.0, 0.0);
                expect(v40).not.toBe(-1);
                expect(upsampleResults[0]._westIndices.length).toBe(2);
                expect(upsampleResults[0]._eastIndices.length).toBe(3);
                expect(upsampleResults[0]._northIndices.length).toBe(2);
                expect(upsampleResults[0]._southIndices.length).toBe(3);

                // northeast
                uBuffer = upsampleResults[1]._uValues;
                vBuffer = upsampleResults[1]._vValues;
                extra = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.5);
                expect(extra).not.toBe(-1);
                var v42 = findVertexWithCoordinates(uBuffer, vBuffer, horizontalIntercept(1.0, 0.0, 0.5, 0.75) * 0.5, 0.0);
                expect(v42).not.toBe(-1);
                expect(upsampleResults[1]._westIndices.length).toBe(3);
                expect(upsampleResults[1]._eastIndices.length).toBe(2);
                expect(upsampleResults[1]._northIndices.length).toBe(2);
                expect(upsampleResults[1]._southIndices.length).toBe(3);
            });
        });
        */
    });

    describe('createMesh', function() {
        var data;
        var tilingScheme;
        var buffer;

        beforeEach(function() {
            tilingScheme = new GeographicTilingScheme();
            buffer = getBuffer(tilingScheme, 0, 0, 0);
            data = new GoogleEarthEnterpriseTerrainData({
                buffer : buffer,
                childTileMask : 15
            });
        });

        it('requires tilingScheme', function() {
            expect(function() {
                data.createMesh(undefined, 0, 0, 0);
            }).toThrowDeveloperError();
        });

        it('requires x', function() {
            expect(function() {
                data.createMesh(tilingScheme, undefined, 0, 0);
            }).toThrowDeveloperError();
        });

        it('requires y', function() {
            expect(function() {
                data.createMesh(tilingScheme, 0, undefined, 0);
            }).toThrowDeveloperError();
        });

        it('requires level', function() {
            expect(function() {
                data.createMesh(tilingScheme, 0, 0, undefined);
            }).toThrowDeveloperError();
        });

        it('creates specified vertices plus skirt vertices', function() {
            var rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);

            var wgs84 = Ellipsoid.WGS84;
            return data.createMesh(tilingScheme, 0, 0, 0).then(function(mesh) {
                expect(mesh).toBeInstanceOf(TerrainMesh);
                expect(mesh.vertices.length).toBe(17 * mesh.encoding.getStride()); // 9 regular + 8 skirt vertices
                expect(mesh.indices.length).toBe(4 * 6 * 3); // 2 regular + 4 skirt triangles per quad
                expect(mesh.minimumHeight).toBe(0);
                expect(mesh.maximumHeight).toBeCloseTo(20, 5);

                var encoding = mesh.encoding;
                var cartesian = new Cartesian3();
                var cartographic = new Cartographic();
                var count = mesh.vertices.length / mesh.encoding.getStride();
                for (var i = 0; i < count; ++i) {
                    var height = encoding.decodeHeight(mesh.vertices, i);
                    if (i < 9) { // Original vertices
                        expect(height).toBeBetween(0, 20);

                        // Only test on original positions as the skirts angle outward
                        encoding.decodePosition(mesh.vertices, i, cartesian);
                        wgs84.cartesianToCartographic(cartesian, cartographic);
                        cartographic.longitude = CesiumMath.convertLongitudeRange(cartographic.longitude);
                        expect(Rectangle.contains(rectangle,cartographic)).toBe(true);
                    } else { // Skirts
                        expect(height).toBeBetween(-1000, -980);
                    }
                }
            });
        });

        it('exaggerates mesh', function() {
            return data.createMesh(tilingScheme, 0, 0, 0, 2).then(function(mesh) {
                expect(mesh).toBeInstanceOf(TerrainMesh);
                expect(mesh.vertices.length).toBe(17 * mesh.encoding.getStride()); // 9 regular + 8 skirt vertices
                expect(mesh.indices.length).toBe(4 * 6 * 3); // 2 regular + 4 skirt triangles per quad
                expect(mesh.minimumHeight).toBe(0);
                expect(mesh.maximumHeight).toBeCloseTo(40, 5);

                var encoding = mesh.encoding;
                var count = mesh.vertices.length / mesh.encoding.getStride();
                for (var i = 0; i < count; ++i) {
                    var height = encoding.decodeHeight(mesh.vertices, i);
                    if (i < 9) { // Original vertices
                        expect(height).toBeBetween(0, 40);
                    } else { // Skirts
                        expect(height).toBeBetween(-1000, -960);
                    }
                }
            });
        });
    });

    /*
    describe('interpolateHeight', function() {
        var tilingScheme;
        var rectangle;

        beforeEach(function() {
            tilingScheme = new GeographicTilingScheme();
            rectangle = tilingScheme.tileXYToRectangle(7, 6, 5);
        });

        it('clamps coordinates if given a position outside the mesh', function() {
            var mesh = new QuantizedMeshTerrainData({
                minimumHeight : 0.0,
                maximumHeight : 4.0,
                quantizedVertices : new Uint16Array([ // order is sw nw se ne
                    // u
                    0, 0, 32767, 32767,
                    // v
                    0, 32767, 0, 32767,
                    // heights
                    32767 / 4.0, 2.0 * 32767 / 4.0, 3.0 * 32767 / 4.0, 32767
                ]),
                indices : new Uint16Array([
                    0, 3, 1,
                    0, 2, 3
                ]),
                boundingSphere : new BoundingSphere(),
                horizonOcclusionPoint : new Cartesian3(),
                westIndices : [0, 1],
                southIndices : [0, 1],
                eastIndices : [2, 3],
                northIndices : [1, 3],
                westSkirtHeight : 1.0,
                southSkirtHeight : 1.0,
                eastSkirtHeight : 1.0,
                northSkirtHeight : 1.0,
                childTileMask : 15
            });

            expect(mesh.interpolateHeight(rectangle, 0.0, 0.0)).toBe(mesh.interpolateHeight(rectangle, rectangle.east, rectangle.south));
        });

        it('returns a height interpolated from the correct triangle', function() {
            // zero height along line between southwest and northeast corners.
            // Negative height in the northwest corner, positive height in the southeast.
            var mesh = new QuantizedMeshTerrainData({
                minimumHeight : -16384,
                maximumHeight : 16383,
                quantizedVertices : new Uint16Array([ // order is sw nw se ne
                    // u
                    0, 0, 32767, 32767,
                    // v
                    0, 32767, 0, 32767,
                    // heights
                    16384, 0, 32767, 16384
                ]),
                indices : new Uint16Array([
                    0, 3, 1,
                    0, 2, 3
                ]),
                boundingSphere : new BoundingSphere(),
                horizonOcclusionPoint : new Cartesian3(),
                westIndices : [0, 1],
                southIndices : [0, 1],
                eastIndices : [2, 3],
                northIndices : [1, 3],
                westSkirtHeight : 1.0,
                southSkirtHeight : 1.0,
                eastSkirtHeight : 1.0,
                northSkirtHeight : 1.0,
                childTileMask : 15
            });


            // position in the northwest quadrant of the tile.
            var longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.25;
            var latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.75;

            var result = mesh.interpolateHeight(rectangle, longitude, latitude);
            expect(result).toBeLessThan(0.0);

            // position in the southeast quadrant of the tile.
            longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.75;
            latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.25;

            result = mesh.interpolateHeight(rectangle, longitude, latitude);
            expect(result).toBeGreaterThan(0.0);

            // position on the line between the southwest and northeast corners.
            longitude = rectangle.west + (rectangle.east - rectangle.west) * 0.5;
            latitude = rectangle.south + (rectangle.north - rectangle.south) * 0.5;

            result = mesh.interpolateHeight(rectangle, longitude, latitude);
            expect(result).toEqualEpsilon(0.0, 1e-10);
        });
    });
    */

    describe('isChildAvailable', function() {
        var data;

        beforeEach(function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1),
                childTileMask : 15
            });
        });

        it('requires thisX', function() {
            expect(function() {
                data.isChildAvailable(undefined, 0, 0, 0);
            }).toThrowDeveloperError();
        });

        it('requires thisY', function() {
            expect(function() {
                data.isChildAvailable(0, undefined, 0, 0);
            }).toThrowDeveloperError();
        });

        it('requires childX', function() {
            expect(function() {
                data.isChildAvailable(0, 0, undefined, 0);
            }).toThrowDeveloperError();
        });

        it('requires childY', function() {
            expect(function() {
                data.isChildAvailable(0, 0, 0, undefined);
            }).toThrowDeveloperError();
        });

        it('returns true for all children when child mask is not explicitly specified', function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1)
            });

            expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
            expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
            expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
            expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
        });

        it('works when only southwest child is available', function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1),
                childTileMask : 1
            });

            expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
            expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
        });

        it('works when only southeast child is available', function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1),
                childTileMask : 2
            });

            expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
        });

        it('works when only northeast child is available', function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1),
                childTileMask : 4
            });

            expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
            expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
        });

        it('works when only northwest child is available', function() {
            data = new GoogleEarthEnterpriseTerrainData({
                buffer: new ArrayBuffer(1),
                childTileMask : 8
            });

            expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
            expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
            expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
            expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
        });
    });
});
