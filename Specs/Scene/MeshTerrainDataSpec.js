/*global defineSuite*/
defineSuite([
         'Scene/MeshTerrainData',
         'Core/Cartesian3',
         'Core/Math',
         'Scene/GeographicTilingScheme',
         'Scene/TerrainData',
         'ThirdParty/when'
     ], function(
         MeshTerrainData,
         Cartesian3,
         CesiumMath,
         GeographicTilingScheme,
         TerrainData,
         when) {
     "use strict";
     /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

     it('conforms to TerrainData interface', function() {
         expect(MeshTerrainData).toConformToInterface(TerrainData);
     });

     describe('upsample', function() {
         function findVertexWithCoordinates(vb, u, v) {
             for (var i = 0; i < vb.length; i += 6) {
                 if (Math.abs(vb[i + 4] - u) < 1e-6 && Math.abs(vb[i + 5] - v) < 1e-6) {
                     return i / 6;
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
             var data = new MeshTerrainData({
                 center : new Cartesian3(0.0, 0.0, 0.0),
                 vertexBuffer : new Float32Array([
                                                  0.0, 0.0, 0.0, 1.0, 0.0, 0.0, // sw
                                                  0.0, 1.0, 0.0, 2.0, 0.0, 1.0, // nw
                                                  1.0, 0.0, 0.0, 3.0, 1.0, 0.0, // se
                                                  1.0, 1.0, 0.0, 4.0, 1.0, 1.0  // ne
                                                  ]),
                 indexBuffer : new Uint32Array([
                                                0, 3, 1,
                                                0, 2, 3
                                                ])
             });

             var tilingScheme = new GeographicTilingScheme();

             for (var y = 0; y <= 1; ++y) {
                 for (var x = 0; x <= 1; ++x) {
                     var upsampled = data.upsample(tilingScheme, 0, 0, 0, x, y, 1);
                     var vb = upsampled._vertexBuffer;
                     var ib = upsampled._indexBuffer;

                     expect(vb.length).toBe(4 * 6);
                     expect(ib.length).toBe(6);

                     var sw = findVertexWithCoordinates(vb, 0.0, 0.0);
                     expect(sw).not.toBe(-1);
                     var nw = findVertexWithCoordinates(vb, 0.0, 1.0);
                     expect(nw).not.toBe(-1);
                     var se = findVertexWithCoordinates(vb, 1.0, 0.0);
                     expect(se).not.toBe(-1);
                     var ne = findVertexWithCoordinates(vb, 1.0, 1.0);
                     expect(ne).not.toBe(-1);

                     var nwToSe = hasTriangle(ib, sw, se, nw) && hasTriangle(ib, nw, se, ne);
                     var swToNe = hasTriangle(ib, sw, ne, nw) && hasTriangle(ib, sw, se, ne);
                     expect(nwToSe || swToNe).toBe(true);
                 }
             }
         });

         it('works for a quad with an extra vertex in the northwest child', function() {
             var data = new MeshTerrainData({
                 center : new Cartesian3(0.0, 0.0, 0.0),
                 vertexBuffer : new Float32Array([
                                                  0.0, 0.0, 0.0, 1.0, 0.0, 0.0, // sw
                                                  0.0, 1.0, 0.0, 2.0, 0.0, 1.0, // nw
                                                  1.0, 0.0, 0.0, 3.0, 1.0, 0.0, // se
                                                  1.0, 1.0, 0.0, 4.0, 1.0, 1.0,  // ne
                                                  0.125, 0.75, 0.0, 6.0, 0.125, 0.75 // extra vertex in nw quadrant
                                                  ]),
                 indexBuffer : new Uint32Array([
                                                0, 4, 1,
                                                0, 2, 4,
                                                1, 4, 3,
                                                3, 4, 2
                                                ])
             });

             var tilingScheme = new GeographicTilingScheme();

             var upsampled = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
             var vb = upsampled._vertexBuffer;
             var ib = upsampled._indexBuffer;

             expect(vb.length).toBe(9 * 6);
             expect(ib.length).toBe(8 * 3);

             var sw = findVertexWithCoordinates(vb, 0.0, 0.0);
             expect(sw).not.toBe(-1);
             var nw = findVertexWithCoordinates(vb, 0.0, 1.0);
             expect(nw).not.toBe(-1);
             var se = findVertexWithCoordinates(vb, 1.0, 0.0);
             expect(se).not.toBe(-1);
             var ne = findVertexWithCoordinates(vb, 1.0, 1.0);
             expect(ne).not.toBe(-1);
             var extra = findVertexWithCoordinates(vb, 0.25, 0.5);
             expect(extra).not.toBe(-1);
             var v40 = findVertexWithCoordinates(vb, horizontalIntercept(0.0, 0.0, 0.125, 0.75) * 2.0, 0.0);
             expect(v40).not.toBe(-1);
             var v42 = findVertexWithCoordinates(vb, horizontalIntercept(0.5, verticalIntercept(1.0, 0.0, 0.125, 0.75), 0.125, 0.75) * 2.0, 0.0);
             expect(v42).not.toBe(-1);
             var v402 = findVertexWithCoordinates(vb, horizontalIntercept(0.5, 0.0, 0.125, 0.75) * 2.0, 0.0);
             expect(v402).not.toBe(-1);
             var v43 = findVertexWithCoordinates(vb, 1.0, verticalIntercept(1.0, 1.0, 0.125, 0.75) * 2.0 - 1.0);
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

         it('works when a triangle has two vertices on the boundary and a third outside', function() {
             var data = new MeshTerrainData({
                 center : new Cartesian3(0.0, 0.0, 0.0),
                 vertexBuffer : new Float32Array([
                                                  0.0, 0.0, 0.0, 1.0, 0.0, 0.0, // sw
                                                  0.0, 1.0, 0.0, 2.0, 0.0, 1.0, // nw
                                                  1.0, 0.0, 0.0, 3.0, 1.0, 0.0, // se
                                                  1.0, 1.0, 0.0, 4.0, 1.0, 1.0,  // ne
                                                  0.6, 0.875, 0.0, 5.0, 0.5, 0.875, // extra vertex on boundary
                                                  0.6, 0.75, 0.0, 6.0, 0.5, 0.75 // extra vertex on boundary
                                                  ]),
                 indexBuffer : new Uint32Array([
                                                5, 2, 4,
                                                0, 5, 1,
                                                0, 2, 5,
                                                1, 5, 4,
                                                1, 4, 3,
                                                4, 2, 3
                                                ])
             });

             var tilingScheme = new GeographicTilingScheme();

             var upsampled = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
             var vb = upsampled._vertexBuffer;
             var ib = upsampled._indexBuffer;

             expect(vb.length).toBe(7 * 6);
             expect(ib.length).toBe(5 * 3);
         });
     });
});