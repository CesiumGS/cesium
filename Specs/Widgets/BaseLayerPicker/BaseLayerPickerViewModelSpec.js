/*global defineSuite*/
defineSuite(['Widgets/BaseLayerPicker/BaseLayerPickerViewModel',
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

    var testProviderViewModel = ImageryProviderViewModel.fromConstants({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    var testProvider2 = {
        isReady : function() {
            return false;
        }
    };

    var testProviderViewModel2 = ImageryProviderViewModel.fromConstants({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider2;
        }
    });

    it('constructor sets expected values', function() {
        var array = [];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);
        expect(viewModel.imageryLayers).toBe(imageryLayers);
        expect(viewModel.imageryProviderViewModels()).toBe(array);
    });

    it('selecting an item closes the dropDown', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        viewModel.dropDownVisible(true);
        viewModel.selectedItem(testProviderViewModel);
        expect(viewModel.dropDownVisible()).toEqual(false);
    });

    it('selectedName, selectedIconUrl, and selectedItem all return expected values', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        expect(viewModel.selectedName()).toBeUndefined();
        expect(viewModel.selectedIconUrl()).toBeUndefined();
        expect(viewModel.selectedItem()).toBeUndefined();

        viewModel.selectedItem(testProviderViewModel);

        expect(viewModel.selectedName()).toEqual(testProviderViewModel.name());
        expect(viewModel.selectedIconUrl()).toEqual(testProviderViewModel.iconUrl());
        expect(viewModel.selectedItem()).toBe(testProviderViewModel);
    });

    it('selectedItem actually sets base layer', function() {
        var array = [testProviderViewModel];
        var imageryLayers = new ImageryLayerCollection();
        var viewModel = new BaseLayerPickerViewModel(imageryLayers, array);

        expect(imageryLayers.getLength()).toEqual(0);

        viewModel.selectedItem(testProviderViewModel);
        expect(imageryLayers.getLength()).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider);

        viewModel.selectedItem(testProviderViewModel2);
        expect(imageryLayers.getLength()).toEqual(1);
        expect(imageryLayers.get(0).getImageryProvider()).toBe(testProvider2);
    });

    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new BaseLayerPickerViewModel(new ImageryLayerCollection());

        expect(viewModel.dropDownVisible()).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible()).toEqual(true);
        viewModel.dropDownVisible(false);
        expect(viewModel.dropDownVisible()).toEqual(false);
    });

    it('constructor throws with no layer collection', function() {
        expect(function() {
            return new BaseLayerPickerViewModel(undefined);
        }).toThrow();
    });

    it('constructor throws if viewModels argument is not an array', function() {
        var imageryLayers = new ImageryLayerCollection();
        expect(function() {
            return new BaseLayerPickerViewModel(imageryLayers, {});
        }).toThrow();
    });
});