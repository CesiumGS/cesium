/*global defineSuite*/
defineSuite([
        'Widgets/Geocoder/GeocoderViewModel',
        'Core/Cartesian3',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        GeocoderViewModel,
        Cartesian3,
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
        var flightDuration = 1234;
        var url = 'bing.invalid/';
        var key = 'testKey';

        var viewModel = new GeocoderViewModel({
            scene : scene,
            flightDuration : flightDuration,
            url : url,
            key : key
        });

        expect(viewModel.scene).toBe(scene);
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
        }).toThrowDeveloperError();
    });

    it('throws is searchText is not a string', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });
        expect(function() {
            viewModel.searchText = undefined;
        }).toThrowDeveloperError();
    });

    it('moves camera when search command invoked', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });

        var cameraPosition = Cartesian3.clone(scene.camera.position);

        viewModel.searchText = '220 Valley Creek Blvd, Exton, PA';
        viewModel.search();

        waitsFor(function() {
            scene.tweens.update();
            return !Cartesian3.equals(cameraPosition, scene.camera.position);
        });
    });

    it('constructor throws without scene', function() {
        expect(function() {
            return new GeocoderViewModel();
        }).toThrowDeveloperError();
    });
}, 'WebGL');
