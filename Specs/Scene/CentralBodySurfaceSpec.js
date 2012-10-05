/*global defineSuite*/
defineSuite([
         'Scene/CentralBodySurface',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/frameState',
         'Specs/render',
         'Scene/CentralBody',
         'Scene/EllipsoidTerrainProvider',
         'Scene/ImageryLayerCollection'
     ], function(
         CentralBodySurface,
         createContext,
         destroyContext,
         frameState,
         render,
         CentralBody,
         EllipsoidTerrainProvider,
         ImageryLayerCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
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

    describe('layer updating', function() {
        it('removing a layer removes it from all tiles', function() {
            var cb = new CentralBody();
            var surface = cb._surface;
            expect(surface).not.toBeUndefined();

            var commandLists;

            // update until the load queue is empty.
            waitsFor(function() {
                commandLists = [];
                cb.update(context, frameState, commandLists);
                return typeof surface._tileLoadQueue.head === 'undefined';
            });

            runs(function() {
                cb.destroy();
            });
        });
    });
});
