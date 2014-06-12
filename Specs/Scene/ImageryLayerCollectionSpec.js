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

    it('add throws when layer is undefined', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.add(undefined);
        }).toThrowDeveloperError();
    });

    it('addImageryProvider throws when imageryProvider is undefined', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.addImageryProvider(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws when index is outside valid range', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);

        expect(function() {
            collection.add(layer1, 1);
        }).toThrowDeveloperError();

        expect(function() {
            collection.add(layer1, -1);
        }).toThrowDeveloperError();

        collection.add(layer1, 0);

        expect(function() {
            collection.add(layer2, -1);
        }).toThrowDeveloperError();

        expect(function() {
            collection.add(layer2, 2);
        }).toThrowDeveloperError();

        collection.add(layer2, 0);
    });

    it('remove ignores request to remove a layer that does not exist in the collection', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        expect(collection.remove(layer1)).toBe(false);
    });

    it('contains works as expected', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);
        var layer2 = new ImageryLayer(fakeProvider);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(false);

        collection.add(layer1);

        expect(collection.contains(layer1)).toEqual(true);
        expect(collection.contains(layer2)).toEqual(false);

        collection.add(layer2);

        expect(collection.contains(layer1)).toEqual(true);
        expect(collection.contains(layer2)).toEqual(true);

        collection.remove(layer1);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(true);

        collection.remove(layer2);

        expect(collection.contains(layer1)).toEqual(false);
        expect(collection.contains(layer2)).toEqual(false);
    });

    it('get throws if index is not provided', function() {
        var collection = new ImageryLayerCollection();
        expect(function() {
            collection.get();
        }).toThrowDeveloperError();
    });

    it('throws when raising an undefined layer', function() {
        var collection = new ImageryLayerCollection();

        expect(function() {
            collection.raise(undefined);
        }).toThrowDeveloperError();
    });

    it('throws when raising a layer not in the collection', function() {
        var collection = new ImageryLayerCollection();
        var layer1 = new ImageryLayer(fakeProvider);

        expect(function() {
            collection.raise(layer1);
        }).toThrowDeveloperError();
    });

    it('reports whether or not it is destroyed', function() {
        var collection = new ImageryLayerCollection();
        expect(collection.isDestroyed()).toEqual(false);
        collection.destroy();
        expect(collection.isDestroyed()).toEqual(true);
    });
});
