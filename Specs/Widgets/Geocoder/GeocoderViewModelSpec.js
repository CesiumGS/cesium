/*global defineSuite*/
defineSuite([
         'Widgets/Geocoder/GeocoderViewModel',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         GeocoderViewModel,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('moves camera when search command invoked', function() {
        var scene = createScene();

        var viewModel = new GeocoderViewModel({
            scene : scene
        });

        var cameraPosition = scene.getCamera().position;

        viewModel.searchText = '220 Valley Creek Blvd, Exton, PA';
        viewModel.search();

        waitsFor(function() {
            scene.getAnimations().update();
            var newCameraPosition = scene.getCamera().position;
            return cameraPosition.x !== newCameraPosition.x ||
                   cameraPosition.y !== newCameraPosition.y ||
                   cameraPosition.z !== newCameraPosition.z;
        });

        runs(function() {
            destroyScene(scene);
        });
    });
}, 'WebGL');