import {
  EllipsoidTerrainProvider,
  Event,
  GeographicTilingScheme,
  ImageryLayerCollection,
} from "@cesium/engine";

import { BaseLayerPickerViewModel, ProviderViewModel } from "../../index.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Widgets/BaseLayerPicker/BaseLayerPickerViewModel", function () {
  function MockGlobe() {
    this.imageryLayers = new ImageryLayerCollection();
    this.terrainProvider = new EllipsoidTerrainProvider();
    this.terrainProviderChanged = new Event();
    this.depthTestAgainstTerrain = false;
  }
  MockGlobe.prototype.isDestroyed = () => false;

  const testProvider = {
    tilingScheme: new GeographicTilingScheme(),
  };
  const testProvider2 = {
    tilingScheme: new GeographicTilingScheme(),
  };
  const testProvider3 = {
    tilingScheme: new GeographicTilingScheme(),
  };

  const testEllipsoidProviderViewModel = new ProviderViewModel({
    name: "name",
    tooltip: "tooltip",
    iconUrl: "url",
    creationFunction: function () {
      return new EllipsoidTerrainProvider();
    },
  });

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

  const testProviderViewModelAsync = new ProviderViewModel({
    name: "name3",
    tooltip: "tooltip3",
    iconUrl: "url3",
    creationFunction: async function () {
      return testProvider;
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

  it("selecting terrain closes the dropDown", async function () {
    const imageryViewModels = [testProviderViewModel];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
    });

    viewModel.dropDownVisible = true;
    viewModel.selectedTerrain = testProviderViewModel;
    await testProviderViewModel.creationCommand();
    expect(viewModel.dropDownVisible).toEqual(false);
  });

  it("tooltip, buttonImageUrl, and selectedImagery all return expected values", async function () {
    const imageryViewModels = [testProviderViewModel];
    const terrainViewModels = [testProviderViewModel3];
    const globe = new MockGlobe();

    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      imageryProviderViewModels: imageryViewModels,
      terrainProviderViewModels: terrainViewModels,
    });

    viewModel.selectedImagery = testProviderViewModel;
    await testProviderViewModel.creationCommand();
    expect(viewModel.buttonTooltip).toEqual(
      `${testProviderViewModel.name}\n${testProviderViewModel3.name}`
    );

    viewModel.selectedImagery = undefined;
    expect(viewModel.buttonTooltip).toEqual(testProviderViewModel3.name);

    viewModel.selectedImagery = testProviderViewModel;
    await testProviderViewModel.creationCommand();
    viewModel.selectedTerrain = undefined;
    expect(viewModel.buttonTooltip).toEqual(testProviderViewModel.name);

    expect(viewModel.buttonImageUrl).toEqual(testProviderViewModel.iconUrl);
  });

  it("selectedImagery actually sets base layer", async function () {
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
    await pollToPromise(() => imageryLayers.get(0).ready);
    expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);

    viewModel.selectedImagery = testProviderViewModel2;
    expect(imageryLayers.length).toEqual(2);
    await pollToPromise(() => imageryLayers.get(0).ready);
    expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);
    await pollToPromise(() => imageryLayers.get(1).ready);
    expect(imageryLayers.get(1).imageryProvider).toBe(testProvider2);
  });

  it("selectedTerrain actually sets terrainProvider", async function () {
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
    await testProviderViewModel3.creationCommand();
    expect(globe.terrainProvider).toBe(testProvider3);
  });

  it("selectedTerrain actually sets async terrainProvider", async function () {
    const terrainProviderViewModels = [
      testProviderViewModel,
      testProviderViewModelAsync,
    ];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      terrainProviderViewModels: terrainProviderViewModels,
    });

    viewModel.selectedTerrain = testProviderViewModelAsync;
    await testProviderViewModelAsync.creationCommand();
    expect(globe.terrainProvider).toBe(testProvider);
    expect(globe.depthTestAgainstTerrain).toBeTrue();
  });

  it("selectedTerrain sets ellipsoid terrain provider", async function () {
    const terrainProviderViewModels = [testEllipsoidProviderViewModel];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      terrainProviderViewModels: terrainProviderViewModels,
    });

    viewModel.selectedTerrain = testEllipsoidProviderViewModel;
    await testProviderViewModelAsync.creationCommand();
    expect(globe.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
    expect(globe.depthTestAgainstTerrain).toBeFalse();
  });

  it("default does not override default value of depthTestAgainstTerrain", async function () {
    const terrainProviderViewModels = [testEllipsoidProviderViewModel];
    const globe = new MockGlobe();
    // eslint-disable-next-line no-unused-vars
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      terrainProviderViewModels: terrainProviderViewModels,
    });

    globe.depthTestAgainstTerrain = true;

    await testEllipsoidProviderViewModel.creationCommand();
    expect(globe.terrainProvider).toBeInstanceOf(EllipsoidTerrainProvider);
    expect(globe.depthTestAgainstTerrain).toBeTrue();
  });

  it("selectedTerrain cancels update if terrainProvider is set externally", async function () {
    const terrainProviderViewModels = [testProviderViewModel3];
    const globe = new MockGlobe();
    const viewModel = new BaseLayerPickerViewModel({
      globe: globe,
      terrainProviderViewModels: terrainProviderViewModels,
    });

    viewModel.selectedTerrain = testProviderViewModelAsync;
    globe.terrainProviderChanged.raiseEvent();
    await testProviderViewModelAsync.creationCommand();
    expect(globe.terrainProvider).not.toBe(testProvider);
  });

  it("settings selectedImagery only removes layers added by view model", async function () {
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
    await pollToPromise(() => imageryLayers.get(0).ready);
    expect(imageryLayers.get(0).imageryProvider).toBe(testProvider);
    await pollToPromise(() => imageryLayers.get(1).ready);
    expect(imageryLayers.get(1).imageryProvider).toBe(testProvider2);

    imageryLayers.addImageryProvider(testProvider3, 1);
    imageryLayers.remove(imageryLayers.get(0));

    viewModel.selectedImagery = undefined;

    expect(imageryLayers.length).toEqual(1);
    await pollToPromise(() => imageryLayers.get(0).ready);
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
