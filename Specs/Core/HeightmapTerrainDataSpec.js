/*global defineSuite*/
defineSuite([
        'Core/HeightmapTerrainData',
        'Core/defined',
        'Core/GeographicTilingScheme',
        'Core/TerrainData',
        'ThirdParty/when'
    ], function(
        HeightmapTerrainData,
        defined,
        GeographicTilingScheme,
        TerrainData,
        when) {
     "use strict";
     /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

     it('conforms to TerrainData interface', function() {
         expect(HeightmapTerrainData).toConformToInterface(TerrainData);
     });

     describe('constructor', function() {
         it('requires buffer', function() {
             expect(function() {
                 return new HeightmapTerrainData();
             }).toThrowDeveloperError();

             expect(function() {
                 return new HeightmapTerrainData({
                     width : 5,
                     height : 5
                 });
             }).toThrowDeveloperError();
         });

         it('requires width', function() {
             expect(function() {
                 return new HeightmapTerrainData({
                     buffer : new Float32Array(25),
                     height : 5
                 });
             }).toThrowDeveloperError();
         });

         it('requires height', function() {
             expect(function() {
                 return new HeightmapTerrainData({
                     buffer : new Float32Array(25),
                     width : 5
                 });
             }).toThrowDeveloperError();
         });
     });

     describe('createMesh', function() {
         var data;
         var tilingScheme;

         beforeEach(function() {
             tilingScheme = new GeographicTilingScheme();
             data = new HeightmapTerrainData({
                 buffer : new Float32Array(25),
                 width : 5,
                 height : 5
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
     });

     describe('upsample', function() {
         var data;
         var tilingScheme;

         beforeEach(function() {
             tilingScheme = new GeographicTilingScheme();
             data = new HeightmapTerrainData({
                 buffer : new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]),
                 width : 3,
                 height : 3
             });
         });

         it('requires tilingScheme', function() {
             expect(function() {
                 data.upsample(undefined, 0, 0, 0, 0, 0, 0);
             }).toThrowDeveloperError();
         });

         it('requires thisX', function() {
             expect(function() {
                 data.upsample(tilingScheme, undefined, 0, 0, 0, 0, 0);
             }).toThrowDeveloperError();
         });

         it('requires thisY', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, undefined, 0, 0, 0, 0);
             }).toThrowDeveloperError();
         });

         it('requires thisLevel', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, 0, undefined, 0, 0, 0);
             }).toThrowDeveloperError();
         });

         it('requires descendantX', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, 0, 0, undefined, 0, 0);
             }).toThrowDeveloperError();
         });

         it('requires descendantY', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, 0, 0, 0, undefined, 0);
             }).toThrowDeveloperError();
         });

         it('requires descendantLevel', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, 0, 0, 0, 0, undefined);
             }).toThrowDeveloperError();
         });

         it('can only upsample cross one level', function() {
             expect(function() {
                 data.upsample(tilingScheme, 0, 0, 0, 0, 0, 2);
             }).toThrowDeveloperError();
         });

         it('upsamples by subsetting when number of samples is odd in each direction', function() {
             return when(data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(2);
                 expect(upsampled._height).toBe(2);
                 expect(upsampled._buffer).toEqual([1.0, 2.0, 4.0, 5.0]);
             });
         });

         it('upsamples by interpolating when number of samples is even in either direction', function() {
             data = new HeightmapTerrainData({
                 buffer : new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0]),
                 width : 4,
                 height : 4
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(4);
                 expect(upsampled._height).toBe(4);
                 expect(upsampled._buffer).toEqual([1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5]);
             });
         });

         it('upsample by subsetting works with a stride', function() {
             data = new HeightmapTerrainData({
                 buffer : new Uint8Array([1, 1, 10, 2, 1, 10, 3, 1, 10, 4, 1, 10, 5, 1, 10, 6, 1, 10, 7, 1, 10, 8, 1, 10, 9, 1, 10]),
                 width : 3,
                 height : 3,
                 structure : {
                     stride : 3,
                     elementsPerHeight : 2
                 }
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(2);
                 expect(upsampled._height).toBe(2);
                 expect(upsampled._buffer).toEqual([1, 1, 10, 2, 1, 10, 4, 1, 10, 5, 1, 10]);
             });
         });

         it('upsample by interpolating works with a stride', function() {
             data = new HeightmapTerrainData({
                 buffer : new Uint8Array([1, 1, 10, 2, 1, 10, 3, 1, 10, 4, 1, 10, 5, 1, 10, 6, 1, 10, 7, 1, 10, 8, 1, 10, 9, 1, 10, 10, 1, 10, 11, 1, 10, 12, 1, 10, 13, 1, 10, 14, 1, 10, 15, 1, 10, 16, 1, 10]),
                 width : 4,
                 height : 4,
                 structure : {
                     stride : 3,
                     elementsPerHeight : 2
                 }
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(4);
                 expect(upsampled._height).toBe(4);
                 expect(upsampled._buffer).toEqual([1, 1, 0, 1, 1, 0, 2, 1, 0, 2, 1, 0, 3, 1, 0, 3, 1, 0, 4, 1, 0, 4, 1, 0, 5, 1, 0, 5, 1, 0, 6, 1, 0, 6, 1, 0, 7, 1, 0, 7, 1, 0, 8, 1, 0, 8, 1, 0]);
             });
         });

         it('upsample by interpolating works with a big endian stride', function() {
             data = new HeightmapTerrainData({
                 buffer : new Uint8Array([1, 1, 10, 1, 2, 10, 1, 3, 10, 1, 4, 10, 1, 5, 10, 1, 6, 10, 1, 7, 10, 1, 8, 10, 1, 9, 10, 1, 10, 10, 1, 11, 10, 1, 12, 10, 1, 13, 10, 1, 14, 10, 1, 15, 10, 1, 16, 10]),
                 width : 4,
                 height : 4,
                 structure : {
                     stride : 3,
                     elementsPerHeight : 2,
                     isBigEndian : true
                 }
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 0, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(4);
                 expect(upsampled._height).toBe(4);
                 expect(upsampled._buffer).toEqual([1, 1, 0, 1, 1, 0, 1, 2, 0, 1, 2, 0, 1, 3, 0, 1, 3, 0, 1, 4, 0, 1, 4, 0, 1, 5, 0, 1, 5, 0, 1, 6, 0, 1, 6, 0, 1, 7, 0, 1, 7, 0, 1, 8, 0, 1, 8, 0]);
             });
         });

         it('upsample by interpolating works for an eastern child', function() {
             data = new HeightmapTerrainData({
                 buffer : new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0]),
                 width : 4,
                 height : 4
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(4);
                 expect(upsampled._height).toBe(4);
                 expect(upsampled._buffer).toEqual([2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0]);
             });
         });

         it('upsample by interpolating works with a stride for an eastern child', function() {
             data = new HeightmapTerrainData({
                 buffer : new Uint8Array([1, 1, 10, 2, 1, 10, 3, 1, 10, 4, 1, 10, 5, 1, 10, 6, 1, 10, 7, 1, 10, 8, 1, 10, 9, 1, 10, 10, 1, 10, 11, 1, 10, 12, 1, 10, 13, 1, 10, 14, 1, 10, 15, 1, 10, 16, 1, 10]),
                 width : 4,
                 height : 4,
                 structure : {
                     stride : 3,
                     elementsPerHeight : 2
                 }
             });

             return when(data.upsample(tilingScheme, 0, 0, 0, 1, 0, 1), function(upsampled) {
                 expect(upsampled.wasCreatedByUpsampling()).toBe(true);
                 expect(upsampled._width).toBe(4);
                 expect(upsampled._height).toBe(4);
                 expect(upsampled._buffer).toEqual([2, 1, 0, 3, 1, 0, 3, 1, 0, 4, 1, 0, 4, 1, 0, 5, 1, 0, 5, 1, 0, 6, 1, 0, 6, 1, 0, 7, 1, 0, 7, 1, 0, 8, 1, 0, 8, 1, 0, 9, 1, 0, 9, 1, 0, 10, 1, 0]);
             });
         });
     });

     describe('isChildAvailable', function() {
         var data;

         beforeEach(function() {
             data = new HeightmapTerrainData({
                 buffer : new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]),
                 width : 3,
                 height : 3
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
     });
});