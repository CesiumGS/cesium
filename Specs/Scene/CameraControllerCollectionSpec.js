/*global defineSuite*/
defineSuite([
         'Scene/CameraControllerCollection',
         'Scene/Camera',
         'Scene/CameraFreeLookController',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/MercatorProjection'
     ], function(
         CameraControllerCollection,
         Camera,
         CameraFreeLookController,
         Cartographic,
         Ellipsoid,
         MercatorProjection) {
    "use strict";
    /*global document,describe,it,expect,beforeEach,afterEach*/

    var camera;
    var collection;

    beforeEach(function() {
        camera = new Camera(document);
        collection = camera.getControllers();
    });

    afterEach(function() {
        collection = collection && !collection.isDestroyed() && collection.destroy();
    });

    it('add2D', function() {
        expect(function() {
            var mercator = new MercatorProjection();
            collection.add2D(mercator);
        }).not.toThrow();
        expect(collection.getLength()).toEqual(1);
    });

    it('addSpindle', function() {
        expect(function() {
            collection.addSpindle();
        }).not.toThrow();
        expect(collection.getLength()).toEqual(1);
    });

    it('addFreeLook', function() {
        expect(function() {
            collection.addFreeLook();
        }).not.toThrow();
        expect(collection.getLength()).toEqual(1);
    });

    it('addColumbusView', function() {
        expect(function() {
            collection.addColumbusView();
        }).not.toThrow();
        expect(collection.getLength()).toEqual(1);
    });

    it('addFlight', function() {
        expect(function() {
            collection.addFlight({
                destination : Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-118.26, 34.19, 100000.0)), // Los Angeles
                duration : 4.0
            });
        }).not.toThrow();
        expect(collection.getLength()).toEqual(1);
    });

    it('get throws without index', function() {
        expect(function() {
            collection.get();
        }).toThrow();
    });

    it('get', function() {
        expect(collection.addSpindle()).toBe(collection.get(0));
    });

    it('contains', function() {
        var spindle = collection.addSpindle();
        expect(collection.contains(spindle)).toEqual(true);
        collection.remove(spindle);
        expect(collection.contains(spindle)).toEqual(false);
    });

    it('does not contain', function() {
        expect(collection.contains(new CameraFreeLookController(document, camera))).toEqual(false);
        expect(collection.contains()).toEqual(false);
    });

    it('update', function() {
        collection.addSpindle();
        collection.addFreeLook();
        expect(function() {
            collection.update();
        }).not.toThrow();
        expect(collection.getLength()).toEqual(2);
    });

    it('update removes expired controllers', function() {
        var flight = collection.addFlight({
            destination : Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-118.26, 34.19, 100000.0)), // Los Angeles
            duration : 4.0
        });
        flight._canceled = true;
        expect(collection.getLength()).toEqual(1);
        collection.update();
        expect(collection.getLength()).toEqual(0);
    });

    it('remove', function() {
        expect(collection.remove(collection.addSpindle())).toEqual(true);
    });

    it('remove returns false without controller', function() {
        expect(collection.remove()).toEqual(false);
    });

    it('removeAll', function() {
        collection.addSpindle();
        collection.addFreeLook();
        expect(collection.getLength()).toEqual(2);
        collection.removeAll();
        expect(collection.getLength()).toEqual(0);
    });

    it('isDestroyed', function() {
        expect(collection.isDestroyed()).toEqual(false);
        collection.destroy();
        expect(collection.isDestroyed()).toEqual(true);
    });
});