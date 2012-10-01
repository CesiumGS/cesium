/*global defineSuite*/
defineSuite([
         'Scene/CameraSpindleController',
         'Core/Ellipsoid',
         'Core/Cartographic',
         'Core/Transforms',
         'Scene/Camera'
     ], function(
         CameraSpindleController,
         Ellipsoid,
         Cartographic,
         Transforms,
         Camera) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var camera;
    var csc;

    beforeEach(function() {
        camera = new Camera(document);
        csc = new CameraSpindleController(document, camera, Ellipsoid.WGS84);
    });

    afterEach(function() {
        csc = csc && !csc.isDestroyed() && csc.destroy();
    });

    it('setEllipsoid', function() {
        expect(csc.getEllipsoid()).toEqual(Ellipsoid.WGS84);
        csc.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        expect(csc.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it('setReferenceFrame', function() {
        var transform = Transforms.eastNorthUpToFixedFrame(Ellipsoid.UNIT_SPHERE.cartographicToCartesian(Cartographic.fromDegrees(-76.0, 40.0)));
        csc.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
        expect(csc.getEllipsoid()).toEqual(Ellipsoid.UNIT_SPHERE);
        expect(camera.transform.equals(transform)).toEqual(true);
    });

    it('isDestroyed', function() {
        expect(csc.isDestroyed()).toEqual(false);
        csc.destroy();
        expect(csc.isDestroyed()).toEqual(true);
    });
});