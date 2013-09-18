/*global defineSuite*/
defineSuite([
         'Widgets/GeocodingWidget/GeocodingWidgetViewModel',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         GeocodingWidgetViewModel,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('moves camera when search command invoked', function() {
        var scene = createScene();

        var viewModel = new GeocodingWidgetViewModel({
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

    it('moves camera when enter pressed in the textbox', function() {
        var scene = createScene();

        var viewModel = new GeocodingWidgetViewModel({
            scene : scene
        });

        var cameraPosition = scene.getCamera().position;

        viewModel.searchText = '220 Valley Creek Blvd, Exton, PA';
        viewModel.inputKeypress({}, { which: 13 });

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