/*global defineSuite*/
defineSuite([
        'Core/QuantizedMeshTerrainData',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/Math',
        'Core/TerrainData',
        'Core/TerrainMesh',
        'ThirdParty/when'
    ], function(
        QuantizedMeshTerrainData,
        BoundingSphere,
        Cartesian3,
        defined,
        GeographicTilingScheme,
        CesiumMath,
        TerrainData,
        TerrainMesh,
        when) {
     'use strict';

     it('conforms to TerrainData interface', function() {
         expect(QuantizedMeshTerrainData).toConformToInterface(TerrainData);
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
             var data = new QuantizedMeshTerrainData({
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

                     expect(uBuffer.length).toBe(4);
                     expect(vBuffer.length).toBe(4);
                     expect(upsampled._heightValues.length).toBe(4);
                     expect(ib.length).toBe(6);

                     var sw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 0.0);
                     expect(sw).not.toBe(-1);
                     var nw = findVertexWithCoordinates(uBuffer, vBuffer, 0.0, 1.0);
                     expect(nw).not.toBe(-1);
                     var se = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 0.0);
                     expect(se).not.toBe(-1);
                     var ne = findVertexWithCoordinates(uBuffer, vBuffer, 1.0, 1.0);
                     expect(ne).not.toBe(-1);

                     var nwToSe = hasTriangle(ib, sw, se, nw) && hasTriangle(ib, nw, se, ne);
                     var swToNe = hasTriangle(ib, sw, ne, nw) && hasTriangle(ib, sw, se, ne);
                     expect(nwToSe || swToNe).toBe(true);
                 }
             });
         });

         it('oct-encoded normals works for all four children of a simple quad', function() {
             var data = new QuantizedMeshTerrainData({
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
                 encodedNormals : new Uint8Array([
                                                  // fun property of oct-encoded normals: the octrahedron is projected onto a plane
                                                  // and unfolded into a unit square.  The 4 corners of this unit square are encoded values
                                                  // of the same Cartesian normal, vec3(0.0, 0.0, 1.0).
                                                  // Therefore, all 4 normals below are actually oct-encoded representations of vec3(0.0, 0.0, 1.0)
                                                  255, 0,     // sw
                                                  255, 255,   // nw
                                                  255, 0,   // se
                                                  255, 255  // ne
                                                  ]),
                 indices : new Uint16Array([
                                                0, 3, 1,
                                                0, 2, 3
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

                     var encodedNormals = upsampled._encodedNormals;

                     expect(encodedNormals.length).toBe(8);

                     // All 4 normals should remain oct-encoded representations of vec3(0.0, 0.0, -1.0)
                     for (var n = 0; n < encodedNormals.length; ++n) {
                         expect(encodedNormals[i]).toBe(255);
                     }
                 }
             });
         });

         it('works for a quad with an extra vertex in the northwest child', function() {
             var data = new QuantizedMeshTerrainData({
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
             var data = new QuantizedMeshTerrainData({
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
     });

     describe('createMesh', function() {
         var data;
         var tilingScheme;

         beforeEach(function() {
             tilingScheme = new GeographicTilingScheme();
             data = new QuantizedMeshTerrainData({
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
             return data.createMesh(tilingScheme, 0, 0, 0).then(function(mesh) {
                 expect(mesh).toBeInstanceOf(TerrainMesh);
                 expect(mesh.vertices.length).toBe(12 * mesh.encoding.getStride()); // 4 regular vertices, 8 skirt vertices.
                 expect(mesh.indices.length).toBe(10 * 3); // 2 regular triangles, 8 skirt triangles.
                 expect(mesh.minimumHeight).toBe(data._minimumHeight);
                 expect(mesh.maximumHeight).toBe(data._maximumHeight);
                 expect(mesh.boundingSphere3D).toEqual(data._boundingSphere);
             });
         });

         it('exaggerates mesh', function() {
             return data.createMesh(tilingScheme, 0, 0, 0, 2).then(function(mesh) {
                 expect(mesh).toBeInstanceOf(TerrainMesh);
                 expect(mesh.vertices.length).toBe(12 * mesh.encoding.getStride()); // 4 regular vertices, 8 skirt vertices.
                 expect(mesh.indices.length).toBe(10 * 3); // 2 regular triangles, 8 skirt triangles.
                 expect(mesh.minimumHeight).toBe(data._minimumHeight);
                 expect(mesh.maximumHeight).toBeGreaterThan(data._maximumHeight);
                 expect(mesh.boundingSphere3D.radius).toBeGreaterThan(data._boundingSphere.radius);
             });
         });

         it('requires 32bit indices for large meshes', function() {
             var tilingScheme = new GeographicTilingScheme();
             var quantizedVertices = [];
             var i;
             for (i = 0; i < 65 * 1024; i++) {
                 quantizedVertices.push(i % 32767); // u
             }
             for (i = 0; i < 65 * 1024; i++) {
                 quantizedVertices.push(Math.floor(i / 32767)); // v
             }
             for (i = 0; i < 65 * 1024; i++) {
                 quantizedVertices.push(0.0);       // height
             }
             var data = new QuantizedMeshTerrainData({
                 minimumHeight : 0.0,
                 maximumHeight : 4.0,
                 quantizedVertices : new Uint16Array(quantizedVertices),
                 indices : new Uint32Array([ 0, 3, 1,
                                             0, 2, 3,
                                             65000, 65002, 65003]),
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

             return data.createMesh(tilingScheme, 0, 0, 0).then(function(mesh) {
                 expect(mesh).toBeInstanceOf(TerrainMesh);
                 expect(mesh.indices.BYTES_PER_ELEMENT).toBe(4);
             });
         });
     });

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

     describe('isChildAvailable', function() {
         var data;

         beforeEach(function() {
             data = new QuantizedMeshTerrainData({
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
             data = new QuantizedMeshTerrainData({
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
                 northSkirtHeight : 1.0
             });

             expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
             expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
             expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
             expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
         });

         it('works when only southwest child is available', function() {
             data = new QuantizedMeshTerrainData({
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
                 childTileMask : 1
             });

             expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 20, 41)).toBe(true);
             expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
         });

         it('works when only southeast child is available', function() {
             data = new QuantizedMeshTerrainData({
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
                 childTileMask : 2
             });

             expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 41)).toBe(true);
         });

         it('works when only northwest child is available', function() {
             data = new QuantizedMeshTerrainData({
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
                 childTileMask : 4
             });

             expect(data.isChildAvailable(10, 20, 20, 40)).toBe(true);
             expect(data.isChildAvailable(10, 20, 21, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
         });

         it('works when only northeast child is available', function() {
             data = new QuantizedMeshTerrainData({
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
                 childTileMask : 8
             });

             expect(data.isChildAvailable(10, 20, 20, 40)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 40)).toBe(true);
             expect(data.isChildAvailable(10, 20, 20, 41)).toBe(false);
             expect(data.isChildAvailable(10, 20, 21, 41)).toBe(false);
         });
     });
});
