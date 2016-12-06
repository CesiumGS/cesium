/*global defineSuite*/
defineSuite([
        'Widgets/Geocoder/GeocoderViewModel',
        'Core/Cartesian3',
        'Scene/Camera',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        GeocoderViewModel,
        Cartesian3,
        Camera,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
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
        expect(viewModel.keepExpanded).toBe(false);
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

        return pollToPromise(function() {
            scene.tweens.update();
            return !Cartesian3.equals(cameraPosition, scene.camera.position);
        });
    });

    it('Zooms to longitude, latitude, height', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene
        });

        spyOn(Camera.prototype, 'flyTo');

        viewModel.searchText = ' 1.0, 2.0, 3.0 ';
        viewModel.search();
        expect(Camera.prototype.flyTo).toHaveBeenCalled();
        expect(Camera.prototype.flyTo.calls.mostRecent().args[0].destination).toEqual(Cartesian3.fromDegrees(1.0, 2.0, 3.0));

        viewModel.searchText = '1.0   2.0   3.0';
        viewModel.search();
        expect(Camera.prototype.flyTo.calls.mostRecent().args[0].destination).toEqual(Cartesian3.fromDegrees(1.0, 2.0, 3.0));

        viewModel.searchText = '-1.0, -2.0';
        viewModel.search();
        expect(Camera.prototype.flyTo.calls.mostRecent().args[0].destination).toEqual(Cartesian3.fromDegrees(-1.0, -2.0, 300.0));
    });

    it('constructor throws without scene', function() {
        expect(function() {
            return new GeocoderViewModel();
        }).toThrowDeveloperError();
    });

    it('raises the complete event camera finished', function() {
        var viewModel = new GeocoderViewModel({
            scene : scene,
            flightDuration : 0
        });

        var spyListener = jasmine.createSpy('listener');
        viewModel.complete.addEventListener(spyListener);

        viewModel.searchText = '-1.0, -2.0';
        viewModel.search();

        expect(spyListener.calls.count()).toBe(1);

        viewModel.flightDuration = 1.5;
        viewModel.serachText = '2.0, 2.0';
        viewModel.search();

        return pollToPromise(function() {
            scene.tweens.update();
            return spyListener.calls.count() === 2;
        });
    });

    it('can be created with a custom geocoder', function() {
        expect(function() {
            return new GeocoderViewModel({
                scene : scene,
                customGeocoder : {
                    geocode : function (input) {
                        return 'fake';
                    },
                    getSuggestions : function (input) {
                        return [];
                    }
                }
            });
        }).not.toThrowDeveloperError();
    });

    fit('automatic suggestions can be retrieved', function() {
        var geocoder = new GeocoderViewModel({
            scene : scene,
            customGeocoder : {
                geocode : function (input, callback) {
                    callback(undefined, ['a', 'b', 'c']);
                },
                getSuggestions : function (input) {
                    return ['a', 'b', 'c'];
                }
            }
        });
        geocoder._searchText = 'some_text';
        geocoder.updateSearchSuggestions();
        expect(geocoder._suggestions().length).toEqual(3);
    });

    fit('automatic suggestions can be navigated by arrow up/down keys', function() {
        var geocoder = new GeocoderViewModel({
            scene : scene,
            customGeocoder : {
                geocode : function (input, callback) {
                    callback(undefined, ['a', 'b', 'c']);
                },
                getSuggestions : function (input) {
                    return ['a', 'b', 'c'];
                }
            }
        });
        geocoder._searchText = 'some_text';
        geocoder.updateSearchSuggestions();

        expect(geocoder._selectedSuggestion()).toEqual(undefined);
        geocoder.handleArrowDown();
        expect(geocoder._selectedSuggestion()).toEqual('a');
        geocoder.handleArrowDown();
        geocoder.handleArrowDown();
        expect(geocoder._selectedSuggestion()).toEqual('c');
        geocoder.handleArrowDown();
        expect(geocoder._selectedSuggestion()).toEqual('a');
        geocoder.handleArrowUp();
        expect(geocoder._selectedSuggestion()).toEqual('c');
        geocoder.handleArrowUp();
        expect(geocoder._selectedSuggestion()).toEqual('b');
    });

}, 'WebGL');
