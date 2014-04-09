/*global defineSuite*/
defineSuite([
         'Widgets/BaseLayerPicker/BaseLayerPickerViewModel',
         'Widgets/BaseLayerPicker/ProviderViewModel',
         'Scene/EllipsoidTerrainProvider',
         'Scene/ImageryLayerCollection'
     ], function(
         BaseLayerPickerViewModel,
         ProviderViewModel,
         EllipsoidTerrainProvider,
         ImageryLayerCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var MockCentralBody = function(){
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
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return [testProvider, testProvider2];
        }
    });

    it('constructor sets expected values', function() {
        var array = [];
        var centralBody = new MockCentralBody();
        var imageryLayers = centralBody.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel(centralBody, array);
        expect(viewModel.imageryLayers).toBe(imageryLayers);
        expect(viewModel.imageryProviderViewModels).toEqual(array);
    });

    it('selecting an item closes the dropDown', function() {
        var array = [testProviderViewModel];
        var centralBody = new MockCentralBody();
        var imageryLayers = centralBody.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel(centralBody, array);

        viewModel.dropDownVisible = true;
        viewModel.selectedImagery = testProviderViewModel;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('selectedImageryName, selectedImageryIconUrl, and selectedImagery all return expected values', function() {
        var array = [testProviderViewModel];
        var centralBody = new MockCentralBody();
        var imageryLayers = centralBody.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel(centralBody, array);

        expect(viewModel.selectedImageryName).toBeUndefined();
        expect(viewModel.selectedImageryIconUrl).toBeUndefined();
        expect(viewModel.selectedImagery).toBeUndefined();

        viewModel.selectedImagery = testProviderViewModel;

        expect(viewModel.selectedImageryName).toEqual(testProviderViewModel.name);
        expect(viewModel.selectedImageryIconUrl).toEqual(testProviderViewModel.iconUrl);
        expect(viewModel.selectedImagery).toBe(testProviderViewModel);
    });

    it('selectedImagery actually sets base layer', function() {
        var array = [testProviderViewModel];
        var centralBody = new MockCentralBody();
        var imageryLayers = centralBody.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel(centralBody, array);

        expect(imageryLayers.length).toEqual(0);

        viewModel.selectedImagery = testProviderViewModel;
        expect(imageryLayers.length).toEqual(1);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);

        viewModel.selectedImagery = testProviderViewModel2;
        expect(imageryLayers.length).toEqual(2);
        expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);
        expect(imageryLayers.get(1).imageryProvider).toBe(testProvider2);
    });

    it('settings selectedImagery only removes layers added by view model', function() {
        var array = [testProviderViewModel];
        var centralBody = new MockCentralBody();
        var imageryLayers = centralBody.imageryLayers;
        var viewModel = new BaseLayerPickerViewModel(centralBody, array);

        expect(imageryLayers.length).toEqual(0);

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
        var viewModel = new BaseLayerPickerViewModel(new MockCentralBody());

        expect(viewModel.dropDownVisible).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible).toEqual(true);
        viewModel.dropDownVisible = false;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('constructor throws with no layer collection', function() {
        expect(function() {
            return new BaseLayerPickerViewModel(undefined);
        }).toThrowDeveloperError();
    });

    it('constructor throws if viewModels argument is not an array', function() {
        var centralBody = new MockCentralBody();
        expect(function() {
            return new BaseLayerPickerViewModel(centralBody, {});
        }).toThrowDeveloperError();
    });
});