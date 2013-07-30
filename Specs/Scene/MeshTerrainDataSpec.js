/*global defineSuite*/
defineSuite([
         'Scene/MeshTerrainData',
         'Core/Cartesian3',
         'Scene/GeographicTilingScheme',
         'Scene/TerrainData',
         'ThirdParty/when'
     ], function(
         MeshTerrainData,
         Cartesian3,
         GeographicTilingScheme,
         TerrainData,
         when) {
     "use strict";
     /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

     it('conforms to TerrainData interface', function() {
         expect(MeshTerrainData).toConformToInterface(TerrainData);
     });

     describe('upsample', function() {
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

         var upsampled = data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1);
         expect(upsampled._vertexBuffer.length).toBe(6 * 4);
     });
});