/*global defineSuite*/
defineSuite([
         'Scene/QuantizedMeshTerrainData',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/defined',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/TerrainData',
         'ThirdParty/when'
     ], function(
         QuantizedMeshTerrainData,
         BoundingSphere,
         Cartesian3,
         defined,
         CesiumMath,
         GeographicTilingScheme,
         TerrainData,
         when) {
     "use strict";
     /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

             var swPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
             var sePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1);
             var nwPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 1, 1);
             var nePromise = data.upsample(tilingScheme, 0, 0, 0, 1, 1, 1);

             var upsampleResults;

             when.all([swPromise, sePromise, nwPromise, nePromise], function(results) {
                 upsampleResults = results;
             });

             waitsFor(function() {
                 return defined(upsampleResults);
             });

             runs(function() {
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

             var upsampledPromise = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);

             var upsampled;
             when(upsampledPromise, function(result) {
                 upsampled = result;
             });

             waitsFor(function() {
                 return defined(upsampled);
             });

             runs(function() {
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
     });
});