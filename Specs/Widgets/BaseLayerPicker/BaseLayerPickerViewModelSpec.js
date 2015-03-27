/*global defineSuite*/
defineSuite([
        'Widgets/BaseLayerPicker/BaseLayerPickerViewModel',
        'Core/EllipsoidTerrainProvider',
        'Scene/ImageryLayerCollection',
        'Widgets/BaseLayerPicker/ProviderViewModel'
    ], function(
        BaseLayerPickerViewModel,
        EllipsoidTerrainProvider,
        ImageryLayerCollection,
        ProviderViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var MockGlobe = function() {
        this.imageryLayers = new ImageryLayerCollection();
        this.terrainProvider = new EllipsoidTerrainProvider();
    };

    var testProvider = {
        isReady : function() {
            return false;
        }
    };

    var testProvider2 = {
        isReady : function() {
            return false;
        }
    };

    var testProvider3 = {
        isReady : function() {
            return false;
        }
    };

    var testProviderViewModel = new ProviderViewModel({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    var testProviderViewModel2 = new ProviderViewModel({
        name : 'name2',
        tooltip : 'tooltip2',
        iconUrl : 'url2',
        creationFunction : function() {
            return [testProvider, testProvider2];
        }
    });

    var testProviderViewModel3 = new ProviderViewModel({
        name : 'name3',
        tooltip : 'tooltip3',
        iconUrl : 'url3',
        creationFunction : function() {
            return testProvider3;
        }
    });

    it('constructor sets expected values', function() {
        var imageryViewModels = [];
        var terrainViewModels = [];

        var globe = new MockGlobe();

        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels,
            terrainProviderViewModels : terrainViewModels
        });
        expect(viewModel.globe).toBe(globe);
        expect(viewModel.imageryProviderViewModels.length).toBe(0);
        expect(viewModel.terrainProviderViewModels.length).toBe(0);
    });

    it('selecting imagery closes the dropDown', function() {
        var imageryViewModels = [testProviderViewModel];
        var globe = new MockGlobe();
        var imageryLayers = globe.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels
        });

        viewModel.dropDownVisible = true;
        viewModel.selectedImagery = testProviderViewModel;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('selecting terrain closes the dropDown', function() {
        var imageryViewModels = [testProviderViewModel];
        var globe = new MockGlobe();
        var imageryLayers = globe.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels
        });

        viewModel.dropDownVisible = true;
        viewModel.selectedTerrain = testProviderViewModel;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('tooltip, buttonImageUrl, and selectedImagery all return expected values', function() {
        var imageryViewModels = [testProviderViewModel];
        var terrainViewModels = [testProviderViewModel3];
        var globe = new MockGlobe();
        var imageryLayers = globe.imageryLayers;

        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels,
            terrainProviderViewModels : terrainViewModels
        });

        viewModel.selectedImagery = testProviderViewModel;
        expect(viewModel.buttonTooltip).toEqual(testProviderViewModel.name + '\n' + testProviderViewModel3.name);

        viewModel.selectedImagery = undefined;
        expect(viewModel.buttonTooltip).toEqual(testProviderViewModel3.name);

        viewModel.selectedImagery = testProviderViewModel;
        viewModel.selectedTerrain = undefined;
        expect(viewModel.buttonTooltip).toEqual(testProviderViewModel.name);

        expect(viewModel.buttonImageUrl).toEqual(testProviderViewModel.iconUrl);
    });

    it('selectedImagery actually sets base layer', function() {
        var imageryViewModels = [testProviderViewModel];
        var globe = new MockGlobe();
        var imageryLayers = globe.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels
        });

        expect(imageryLayers.length).toEqual(1);

        viewModel.selectedImagery = testProviderViewModel;
        expect(imageryLayers.length).toEqual(1);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);

        viewModel.selectedImagery = testProviderViewModel2;
        expect(imageryLayers.length).toEqual(2);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);
        expect(imageryLayers.get(1).imageryProvider).toBe(testProvider2);
    });

    it('selectedTerrain actually sets terrainPRovider', function() {
        var terrainProviderViewModels = [testProviderViewModel, testProviderViewModel3];
        var globe = new MockGlobe();
        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            terrainProviderViewModels : terrainProviderViewModels
        });

        viewModel.selectedTerrain = testProviderViewModel3;
        expect(globe.terrainProvider).toBe(testProvider3);
    });

    it('settings selectedImagery only removes layers added by view model', function() {
        var imageryViewModels = [testProviderViewModel];
        var globe = new MockGlobe();
        var imageryLayers = globe.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel({
            globe : globe,
            imageryProviderViewModels : imageryViewModels
        });

        expect(imageryLayers.length).toEqual(1);

        viewModel.selectedImagery = testProviderViewModel2;
        expect(imageryLayers.length).toEqual(2);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);
        expect(imageryLayers.get(1).imageryProvider).toBe(testProvider2);

        imageryLayers.addImageryProvider(testProvider3, 1);
        imageryLayers.remove(imageryLayers.get(0));

        viewModel.selectedImagery = undefined;

        expect(imageryLayers.length).toEqual(1);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider3);
    });

    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new BaseLayerPickerViewModel({
            globe : new MockGlobe()
        });

        expect(viewModel.dropDownVisible).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible).toEqual(true);
        viewModel.dropDownVisible = false;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('constructor throws with no globe', function() {
        expect(function() {
            return new BaseLayerPickerViewModel({});
        }).toThrowDeveloperError();
    });
});