/*global defineSuite*/
defineSuite([
        'Widgets/Geocoder/Geocoder',
        'Core/Cartesian3',
        'Specs/createScene',
        'ThirdParty/when'
    ], function(
        Geocoder,
        Cartesian3,
        createScene,
        when) {
    'use strict';

    var scene;

    var mockDestination = new Cartesian3(1.0, 2.0, 3.0);
    var geocoderResults = [{
        displayName: 'a',
        destination: mockDestination
    }, {
        displayName: 'b',
        destination: mockDestination
    }, {
        displayName: 'c',
        destination: mockDestination
    }];

    var customGeocoderOptions = {
        autoComplete : true,
        geocode : function (input) {
            return when.resolve(geocoderResults);
        }
    };
    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        scene.destroyForSpecs();
    });

    it('constructor sets expected properties', function() {
        var flightDuration = 1234;

        var geocoder = new Geocoder({
            container : document.body,
            scene : scene,
            flightDuration : flightDuration
        });

        var viewModel = geocoder.viewModel;
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.flightDuration).toBe(flightDuration);
        geocoder.destroy();
    });

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new Geocoder({
            container : 'testContainer',
            scene : scene
        });
        expect(widget.container).toBe(container);
        expect(widget.isDestroyed()).toEqual(false);
        expect(container.children.length).not.toEqual(0);
        widget.destroy();
        expect(container.children.length).toEqual(0);
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('constructor throws with no scene', function() {
        expect(function() {
            return new Geocoder({
                container : document.body
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with no element', function() {
        expect(function() {
            return new Geocoder({
                scene : scene
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new Geocoder({
                container : 'does not exist',
                scene : scene
            });
        }).toThrowDeveloperError();
    });

    it('automatic suggestions can be navigated by arrow up/down keys', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);
        var geocoder = new Geocoder({
            container : 'testContainer',
            scene : scene,
            geocoderServices : [customGeocoderOptions]
        });
        var viewModel = geocoder._viewModel;
        viewModel._searchText = 'some_text';
        viewModel._updateSearchSuggestions(viewModel);

        expect(viewModel._selectedSuggestion).toEqual(undefined);
        viewModel._handleArrowDown(viewModel);
        expect(viewModel._selectedSuggestion.displayName).toEqual('a');
        viewModel._handleArrowDown(viewModel);
        viewModel._handleArrowDown(viewModel);
        expect(viewModel._selectedSuggestion.displayName).toEqual('c');
        viewModel._handleArrowDown(viewModel);
        expect(viewModel._selectedSuggestion.displayName).toEqual('a');
        viewModel._handleArrowDown(viewModel);
        viewModel._handleArrowUp(viewModel);
        expect(viewModel._selectedSuggestion.displayName).toEqual('a');
        viewModel._handleArrowUp(viewModel);
        expect(viewModel._selectedSuggestion).toBeUndefined();
        document.body.removeChild(container);
    });

}, 'WebGL');
