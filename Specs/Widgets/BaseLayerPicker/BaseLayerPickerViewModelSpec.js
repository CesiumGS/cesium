/*global defineSuite*/
defineSuite([
         'Widgets/BaseLayerPicker/BaseLayerPickerViewModel',
         'Widgets/BaseLayerPicker/ImageryProviderViewModel',
         'Scene/ImageryLayerCollection'
     ], function(
         BaseLayerPickerViewModel,
         ImageryProviderViewModel,
         ImageryLayerCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    var testProviderViewModel = new ImageryProviderViewModel({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    var testProviderViewModel2 = new ImageryProviderViewModel({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return [testProvider, testProvider2];
        }
    });

    it('constructor sets expected values', function() {
        var array = [];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);
        expect(viewModel.imageryLayers).toBe(imageryLayers);
        expect(viewModel.imageryProviderViewModels).toEqual(array);
    });

    it('selecting an item closes the dropDown', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        viewModel.dropDownVisible = true;
        viewModel.selectedItem = testProviderViewModel;
        expect(viewModel.dropDownVisible).toEqual(false);
    });

    it('selectedName, selectedIconUrl, and selectedItem all return expected values', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        expect(viewModel.selectedName).toBeUndefined();
        expect(viewModel.selectedIconUrl).toBeUndefined();
        expect(viewModel.selectedItem).toBeUndefined();

        viewModel.selectedItem = testProviderViewModel;

        expect(viewModel.selectedName).toEqual(testProviderViewModel.name);
        expect(viewModel.selectedIconUrl).toEqual(testProviderViewModel.iconUrl);
        expect(viewModel.selectedItem).toBe(testProviderViewModel);
    });

    it('selectedItem actually sets base layer', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        expect(imageryLayers.length).toEqual(0);

        viewModel.selectedItem = testProviderViewModel;
        expect(imageryLayers.length).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider);

        viewModel.selectedItem = testProviderViewModel2;
        expect(imageryLayers.length).toEqual(2);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider);
        expect(imageryLayers.get(1).getImageryProvider()).toBe(testProvider2);
    });

    it('settings selectedItem only removes layers added by view model', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        expect(imageryLayers.length).toEqual(0);

        viewModel.selectedItem = testProviderViewModel2;
        expect(imageryLayers.length).toEqual(2);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider);
        expect(imageryLayers.get(1).getImageryProvider()).toBe(testProvider2);

        imageryLayers.addImageryProvider(testProvider3, 1);
        imageryLayers.remove(imageryLayers.get(0));

        viewModel.selectedItem = undefined;

        expect(imageryLayers.length).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider3);
    });


    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new BaseLayerPickerViewModel(new ImageryLayerCollection());

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
        var imageryLayers = new ImageryLayerCollection();
        expect(function() {
            return new BaseLayerPickerViewModel(imageryLayers, {});
        }).toThrowDeveloperError();
    });
});