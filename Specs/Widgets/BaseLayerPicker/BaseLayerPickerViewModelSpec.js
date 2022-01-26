import { EllipsoidTerrainProvider } from "../../../Source/Cesium.js";
import { ImageryLayerCollection } from "../../../Source/Cesium.js";
import { BaseLayerPickerViewModel } from "../../../Source/Cesium.js";
import { ProviderViewModel } from "../../../Source/Cesium.js";

describe("Widgets/BaseLayerPicker/BaseLayerPickerViewModel", function () {
  function MockGlobe() {
    this.imageryLayers = new ImageryLayerCollection();
    this.terrainProvider = new EllipsoidTerrainProvider();
  }

  const testProvider = {
    isReady: function () {
      return false;
    },
  };

  const testProvider2 = {
    isReady: function () {
      return false;
    },
  };

  const testProvider3 = {
    isReady: function () {
      return false;
    },
  };

  const testProviderViewModel = new ProviderViewModel({
    name: "name",
    tooltip: "tooltip",
    iconUrl: "url",
    creationFunction: function () {
      return testProvider;
    },
  });

  const testProviderViewModel2 = new ProviderViewModel({
    name: "name2",
    tooltip: "tooltip2",
    iconUrl: "url2",
    creationFunction: function () {
      return [testProvider, testProvider2];
    },
  });

  const testProviderViewModel3 = new ProviderViewModel({
    name: "name3",
    tooltip: "tooltip3",
    iconUrl: "url3",
    creationFunction: function () {
      return testProvider3;
    },
  });

  it("constructor sets expected values", function () {
    const imageryViewModels = [];
    const terrainViewModels = [];

    const globe = new MockGlobe();

    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
      terrainProviderViewModels: terrainViewModels,
    });
    expect(viewModel.globe).toBe(globe);
    expect(viewModel.imageryProviderViewModels.length).toBe(0);
    expect(viewModel.terrainProviderViewModels.length).toBe(0);
  });

  it("separates providers into categories", function () {
    const imageryProviders = [
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat1",
        creationFunction: function () {
          return testProvider;
        },
      }),
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat1",
        creationFunction: function () {
          return testProvider;
        },
      }),
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat2",
        creationFunction: function () {
          return testProvider;
        },
      }),
    ];
    const terrainProviders = [
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat1",
        creationFunction: function () {
          return testProvider;
        },
      }),
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat2",
        creationFunction: function () {
          return testProvider;
        },
      }),
      new ProviderViewModel({
        name: "name",
        tooltip: "tooltip",
        iconUrl: "url",
        category: "cat2",
        creationFunction: function () {
          return testProvider;
        },
      }),
    ];

    const viewModel = new BaseLayerPickerViewModel({
      globe: new MockGlobe(),
      imageryProviderViewModels: imageryProviders,
      terrainProviderViewModels: terrainProviders,
    });

    expect(viewModel._imageryProviders).toBeDefined();
    expect(viewModel._imageryProviders().length).toBe(2);
    expect(viewModel._imageryProviders()[0].providers.length).toBe(2);
    expect(viewModel._imageryProviders()[0].name).toBe("cat1");
    expect(viewModel._imageryProviders()[1].providers.length).toBe(1);
    expect(viewModel._imageryProviders()[1].name).toBe("cat2");

    expect(viewModel._terrainProviders).toBeDefined();
    expect(viewModel._terrainProviders().length).toBe(2);
    expect(viewModel._terrainProviders()[0].providers.length).toBe(1);
    expect(viewModel._terrainProviders()[0].name).toBe("cat1");
    expect(viewModel._terrainProviders()[1].providers.length).toBe(2);
    expect(viewModel._terrainProviders()[1].name).toBe("cat2");
  });

  it("selecting imagery closes the dropDown", function () {
    const imageryViewModels = [testProviderViewModel];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
    });

    viewModel.dropDownVisible = true;
    viewModel.selectedImagery = testProviderViewModel;
    expect(viewModel.dropDownVisible).toEqual(false);
  });

  it("selecting terrain closes the dropDown", function () {
    const imageryViewModels = [testProviderViewModel];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
    });

    viewModel.dropDownVisible = true;
    viewModel.selectedTerrain = testProviderViewModel;
    expect(viewModel.dropDownVisible).toEqual(false);
  });

  it("tooltip, buttonImageUrl, and selectedImagery all return expected values", function () {
    const imageryViewModels = [testProviderViewModel];
    const terrainViewModels = [testProviderViewModel3];
    const globe = new MockGlobe();

    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
      terrainProviderViewModels: terrainViewModels,
    });

    viewModel.selectedImagery = testProviderViewModel;
    expect(viewModel.buttonTooltip).toEqual(
      testProviderViewModel.name + "\n" + testProviderViewModel3.name
    );

    viewModel.selectedImagery = undefined;
    expect(viewModel.buttonTooltip).toEqual(testProviderViewModel3.name);

    viewModel.selectedImagery = testProviderViewModel;
    viewModel.selectedTerrain = undefined;
    expect(viewModel.buttonTooltip).toEqual(testProviderViewModel.name);

    expect(viewModel.buttonImageUrl).toEqual(testProviderViewModel.iconUrl);
  });

  it("selectedImagery actually sets base layer", function () {
    const imageryViewModels = [testProviderViewModel];
    const globe = new MockGlobe();
    const imageryLayers = globe.imageryLayers;
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
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

  it("selectedTerrain actually sets terrainPRovider", function () {
    const terrainProviderViewModels = [
      testProviderViewModel,
      testProviderViewModel3,
    ];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      terrainProviderViewModels: terrainProviderViewModels,
    });

    viewModel.selectedTerrain = testProviderViewModel3;
    expect(globe.terrainProvider).toBe(testProvider3);
  });

  it("settings selectedImagery only removes layers added by view model", function () {
    const imageryViewModels = [testProviderViewModel];
    const globe = new MockGlobe();
    const imageryLayers = globe.imageryLayers;
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
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

  it("dropDownVisible and toggleDropDown work", function () {
    const viewModel = new BaseLayerPickerViewModel({
      globe: new MockGlobe(),
    });

    expect(viewModel.dropDownVisible).toEqual(false);
    viewModel.toggleDropDown();
    expect(viewModel.dropDownVisible).toEqual(true);
    viewModel.dropDownVisible = false;
    expect(viewModel.dropDownVisible).toEqual(false);
  });

  it("constructor throws with no globe", function () {
    expect(function () {
      return new BaseLayerPickerViewModel({});
    }).toThrowDeveloperError();
  });
});
