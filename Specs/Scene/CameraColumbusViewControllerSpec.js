/*global defineSuite*/
defineSuite([
         'Scene/CameraColumbusViewController',
         'Scene/Camera',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         CameraColumbusViewController,
         Camera,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global document,describe,it,expect,beforeEach,afterEach*/

    var controller;
    var camera;

    beforeEach(function() {
        camera = new Camera(document);
        camera.position = Cartesian3.ZERO;
        camera.up = Cartesian3.UNIT_Y;
        camera.direction = Cartesian3.UNIT_Z.negate();

        controller = new CameraColumbusViewController(document, camera);
    });

    afterEach(function() {
        controller = controller && !controller.isDestroyed() && controller.destroy();
    });

    it('updateReferenceFrame', function() {
        controller._updateReferenceFrame();
        expect(camera.position.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON10)).toEqual(true);
    });

    it('isDestroyed', function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});