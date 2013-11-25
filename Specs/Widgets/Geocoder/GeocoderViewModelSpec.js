/*global defineSuite*/
defineSuite([
         'Widgets/Geocoder/GeocoderViewModel',
         'Core/Ellipsoid',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         GeocoderViewModel,
         Ellipsoid,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('constructor sets expected properties', function() {
        var ellipsoid = new Ellipsoid();
        var flightDuration = 1234;
        var url = 'bing.invalid/';
        var key = 'testKey';

        var viewModel = new GeocoderViewModel({
            scene : scene,
            ellipsoid : ellipsoid,
            flightDuration : flightDuration,
            url : url,
            key : key
        });

        expect(viewModel.scene).toBe(scene);
        expect(viewModel.ellipsoid).toBe(ellipsoid);
        expect(viewModel.flightDuration).toBe(flightDuration);
        expect(viewModel.url).toBe(url);
        expect(viewModel.key).toBe(key);
    });

    it('can get and set flight duration', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });
        viewModel.flightDuration = 324;
        expect(viewModel.flightDuration).toEqual(324);

        expect(function() {
            viewModel.flightDuration = -123;
        }).toThrow();
    });

    it('throws is searchText is not a string', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });
        expect(function() {
            viewModel.searchText = undefined;
        }).toThrow();
    });

    it('moves camera when search command invoked', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });

        var cameraPosition = scene.getCamera().position;

        viewModel.searchText = '220 Valley Creek Blvd, Exton, PA';
        viewModel.search();

        waitsFor(function() {
            scene.getAnimations().update();
            var newCameraPosition = scene.getCamera().position;
            return cameraPosition.x !== newCameraPosition.x || cameraPosition.y !== newCameraPosition.y || cameraPosition.z !== newCameraPosition.z;
        });
    });

    it('constructor throws without scene', function() {
        expect(function() {
            return new GeocoderViewModel();
        }).toThrow();
    });
}, 'WebGL');