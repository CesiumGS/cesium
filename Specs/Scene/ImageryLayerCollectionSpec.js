/*global defineSuite*/
defineSuite([
         'Scene/ImageryLayerCollection',
         'Scene/ImageryLayer'
     ], function(
         ImageryLayerCollection,
         ImageryLayer) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var fakeProvider = {
            isReady : function() { return false; }
        };

    it('tracks the base layer on add', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        expect(layer1.isBaseLayer()).toEqual(false);

        collection.add(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);

        collection.add(layer2);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);

        collection.add(layer3, 0);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(true);
    });

    it('tracks the base layer on remove', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.remove(layer1);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.remove(layer3);
        expect(layer2.isBaseLayer()).toEqual(true);
    });

    it('updates isBaseLayer on re-add', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        layer1._isBaseLayer = true;
        layer2._isBaseLayer = true;

        collection.add(layer1);
        collection.add(layer2);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
    });

    it('does not crash when raising and lowering a single layer.', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();
        collection.add(layer1);

        collection.raise(layer1);
        collection.lower(layer1);

        collection.raiseToTop(layer1);
        collection.lowerToBottom(layer1);
    });

    it('tracks the base layer on raise and lower', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lower(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.raise(layer1);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lower(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);
    });

    it('tracks the base layer on raiseToTop to lowerToBottom', function() {
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);
        var layer3 = new ImageryLayer(fakeProvider);
        var collection = new ImageryLayerCollection();

        collection.add(layer1);
        collection.add(layer2);
        collection.add(layer3);

        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.raiseToTop(layer1);
        expect(layer1.isBaseLayer()).toEqual(false);
        expect(layer2.isBaseLayer()).toEqual(true);
        expect(layer3.isBaseLayer()).toEqual(false);

        collection.lowerToBottom(layer1);
        expect(layer1.isBaseLayer()).toEqual(true);
        expect(layer2.isBaseLayer()).toEqual(false);
        expect(layer3.isBaseLayer()).toEqual(false);
    });
});
