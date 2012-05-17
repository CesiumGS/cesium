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
        camera.position = new Cartesian3();
        camera.up = Cartesian3.UNIT_Y;
        camera.direction = Cartesian3.UNIT_Z.negate();

        controller = new CameraColumbusViewController(document, camera);
    });

    afterEach(function() {
        try {
            controller = controller && controller.destroy();
        } catch(e) {}
    });

    it("updateReferenceFrame", function() {
        controller._updateReferenceFrame();
        expect(camera.position.equalsEpsilon(new Cartesian3(), CesiumMath.EPSILON10)).toEqual(true);
    });

    it("isDestroyed", function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});