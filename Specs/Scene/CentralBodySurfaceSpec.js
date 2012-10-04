/*global defineSuite*/
defineSuite([
         'Scene/CentralBodySurface',
         'Scene/EllipsoidTerrainProvider',
         'Scene/ImageryLayerCollection'
     ], function(
         CentralBodySurface,
         EllipsoidTerrainProvider,
         ImageryLayerCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    beforeAll(function() {
    });

    afterAll(function() {
    });

    beforeEach(function() {
    });

    afterEach(function() {
    });

    describe('construction', function() {
        it('throws if an terrain provider is not provided', function() {
            var surface;
            function constructWithoutTerrainProvider() {
                surface = new CentralBodySurface({
                    imageryLayerCollection : new ImageryLayerCollection()
                });
            }
            expect(constructWithoutTerrainProvider).toThrow();
            expect(surface).toBeUndefined();
        });

        it('throws if a ImageryLayerCollection is not provided', function() {
            var surface;
            function constructWithoutImageryLayerCollection() {
                surface = new CentralBodySurface({
                    terrainProvider : new EllipsoidTerrainProvider()
                });
            }
            expect(constructWithoutImageryLayerCollection).toThrow();
            expect(surface).toBeUndefined();
        });
    });
});
