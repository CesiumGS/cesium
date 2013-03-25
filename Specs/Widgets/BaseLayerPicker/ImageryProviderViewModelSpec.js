/*global defineSuite*/
defineSuite(['Widgets/BaseLayerPicker/ImageryProviderViewModel'
            ], function(
              ImageryProviderViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected parameters', function() {
        var name = 'name';
        var tooltip = 'tooltip';
        var iconUrl = 'iconUrl';
        var createProvider = function() {
        };

        var viewModel = new ImageryProviderViewModel(name, tooltip, iconUrl, createProvider);
        expect(viewModel.name()).toEqual(name);
        expect(viewModel.tooltip()).toEqual(tooltip);
        expect(viewModel.iconUrl()).toEqual(iconUrl);
        expect(viewModel.createProvider).toBe(createProvider);
    });

    it('constructor throws with no name', function() {
        var tooltip = 'tooltip';
        var iconUrl = 'iconUrl';
        var createProvider = function() {
        };

        expect(function() {
            return new ImageryProviderViewModel(undefined, tooltip, iconUrl, createProvider);
        }).toThrow();
    });

    it('constructor throws with no tooltip', function() {
        var name = 'name';
        var iconUrl = 'iconUrl';
        var createProvider = function() {
        };

        expect(function() {
            return new ImageryProviderViewModel(name, undefined, iconUrl, createProvider);
        }).toThrow();
    });

    it('constructor throws with no iconUrl', function() {
        var name = 'name';
        var tooltip = 'tooltip';
        var createProvider = function() {
        };

        expect(function() {
            return new ImageryProviderViewModel(name, tooltip, undefined, createProvider);
        }).toThrow();
    });

    it('constructor throws with no createProvider', function() {
        var name = 'name';
        var tooltip = 'tooltip';
        var iconUrl = 'iconUrl';

        expect(function() {
            return new ImageryProviderViewModel(name, tooltip, iconUrl, undefined);
        }).toThrow();
    });
});