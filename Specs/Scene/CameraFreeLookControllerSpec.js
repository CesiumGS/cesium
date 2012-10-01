/*global defineSuite*/
defineSuite([
         'Scene/CameraFreeLookController',
         'Scene/Camera'
     ], function(
         CameraFreeLookController,
         Camera) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('isDestroyed', function() {
        var camera = new Camera(document);
        var cflc = new CameraFreeLookController(document, camera);
        expect(cflc.isDestroyed()).toEqual(false);
        cflc.destroy();
        expect(cflc.isDestroyed()).toEqual(true);
    });
});
