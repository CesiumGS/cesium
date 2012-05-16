defineSuite([
         'Scene/CameraColumbusViewController',
         'Scene/Camera'
     ], function(
         CameraColumbusViewController,
         Camera) {
    "use strict";
    /*global document,describe,it,expect,beforeEach,afterEach*/

    var controller;
    var camera;

    beforeEach(function() {
        camera = new Camera(document);
        controller = new CameraColumbusViewController(document, camera);
    });

    afterEach(function() {
        try {
            controller = controller && controller.destroy();
        } catch(e) {}
    });

    it("isDestroyed", function() {
        expect(controller.isDestroyed()).toEqual(false);
        controller.destroy();
        expect(controller.isDestroyed()).toEqual(true);
    });
});