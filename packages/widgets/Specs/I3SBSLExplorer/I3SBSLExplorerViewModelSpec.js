import {
  I3SBuildingSceneLayerExplorerViewModel,
  knockout,
} from "../../index.js";

describe("Widgets/I3SBuildingSceneLayerExplorer/I3SBuildingSceneLayerExplorerViewModel", function () {
  const i3sProvider = {
    sublayers: [
      {
        name: "Full Model",
        modelName: "FullModel",
        visibility: true,
        sublayers: [
          {
            name: "Cat1",
            visibility: false,
            sublayers: [
              { name: "SubCat1", visibility: true, sublayers: [] },
              { name: "SubCat2", visibility: false, sublayers: [] },
            ],
          },
        ],
      },
      {
        name: "Overview",
        modelName: "Overview",
        visibility: true,
        sublayers: [],
      },
    ],
    getAttributeNames: function () {
      return ["BldgLevel", "testAttr"];
    },
    getAttributeValues: function () {
      return [1, 0];
    },
  };

  const i3sProviderWithoutOverview = {
    sublayers: [
      {
        name: "Cat1",
        visibility: false,
        sublayers: [
          { name: "SubCat1", visibility: true, sublayers: [] },
          { name: "SubCat2", visibility: false, sublayers: [] },
        ],
      },
    ],
  };

  it("can create bsl explorer ViewModel", function () {
    const viewModel = new I3SBuildingSceneLayerExplorerViewModel(i3sProvider);
    expect(viewModel.levels).toEqual(["All", 0, 1]);
    expect(viewModel.selectedLevel).toEqual("All");

    expect(viewModel.sublayers.length).toEqual(2);
    expect(viewModel.sublayers[1].name).toEqual("Overview");
    expect(viewModel.sublayers[1].modelName).toEqual("Overview");
    expect(viewModel.sublayers[1].visibility).toEqual(false);
    expect(viewModel.sublayers[1].sublayers.length).toEqual(0);
    expect(viewModel.sublayers[0].name).toEqual("Full Model");
    expect(viewModel.sublayers[0].modelName).toEqual("FullModel");
    expect(viewModel.sublayers[0].visibility).toEqual(false);
    expect(viewModel.sublayers[0].sublayers.length).toEqual(1);
    expect(viewModel.sublayers[0].sublayers[0].name).toEqual("Cat1");
    expect(viewModel.sublayers[0].sublayers[0].visibility).toEqual(true);
    expect(viewModel.sublayers[0].sublayers[0].sublayers.length).toEqual(2);
    expect(viewModel.sublayers[0].sublayers[0].sublayers[0].name).toEqual(
      "SubCat1"
    );
    expect(viewModel.sublayers[0].sublayers[0].sublayers[0].visibility).toEqual(
      true
    );
    expect(
      viewModel.sublayers[0].sublayers[0].sublayers[0].sublayers.length
    ).toEqual(0);
    expect(viewModel.sublayers[0].sublayers[0].sublayers[1].name).toEqual(
      "SubCat2"
    );
    expect(viewModel.sublayers[0].sublayers[0].sublayers[1].visibility).toEqual(
      false
    );
    expect(
      viewModel.sublayers[0].sublayers[0].sublayers[1].sublayers.length
    ).toEqual(0);

    expect(viewModel.topLayers.length).toEqual(3);
    expect(viewModel.defaultLayer.modelName).toEqual("Overview");
  });

  it("can create bsl explorer ViewModel if no Overview", function () {
    const viewModel = new I3SBuildingSceneLayerExplorerViewModel(
      i3sProviderWithoutOverview
    );
    expect(viewModel.sublayers.length).toEqual(1);
    expect(viewModel.sublayers[0].name).toEqual("Full Model");
    expect(viewModel.sublayers[0].modelName).toEqual("FullModel");
    expect(viewModel.sublayers[0].visibility).toEqual(false);
    expect(viewModel.sublayers[0].sublayers.length).toEqual(1);
    expect(viewModel.sublayers[0].sublayers[0].name).toEqual("Cat1");
    expect(viewModel.sublayers[0].sublayers[0].visibility).toEqual(true);
    expect(viewModel.sublayers[0].sublayers[0].sublayers.length).toEqual(2);
    expect(viewModel.sublayers[0].sublayers[0].sublayers[0].name).toEqual(
      "SubCat1"
    );
    expect(viewModel.sublayers[0].sublayers[0].sublayers[0].visibility).toEqual(
      true
    );
    expect(
      viewModel.sublayers[0].sublayers[0].sublayers[0].sublayers.length
    ).toEqual(0);
    expect(viewModel.sublayers[0].sublayers[0].sublayers[1].name).toEqual(
      "SubCat2"
    );
    expect(viewModel.sublayers[0].sublayers[0].sublayers[1].visibility).toEqual(
      false
    );
    expect(
      viewModel.sublayers[0].sublayers[0].sublayers[1].sublayers.length
    ).toEqual(0);

    expect(viewModel.topLayers.length).toEqual(2);
    expect(viewModel.defaultLayer.modelName).toEqual("FullModel");
  });

  it("can handle filtering by level", function () {
    i3sProvider.filterByAttributes = jasmine.createSpy();
    const viewModel = new I3SBuildingSceneLayerExplorerViewModel(i3sProvider);
    knockout.track(viewModel);

    viewModel.currentLevel = 1;
    expect(i3sProvider.filterByAttributes).toHaveBeenCalledWith([
      {
        name: "BldgLevel",
        values: [1],
      },
    ]);

    viewModel.currentLevel = "All";
    expect(i3sProvider.filterByAttributes).toHaveBeenCalledWith();
  });

  it("can handle top layer selection", function () {
    const bslWrapper = document.createElement("div");
    bslWrapper.id = "bsl-wrapper";
    document.body.appendChild(bslWrapper);

    i3sProvider.filterByAttributes = jasmine.createSpy();
    const viewModel = new I3SBuildingSceneLayerExplorerViewModel(i3sProvider);
    knockout.track(viewModel);

    viewModel.currentLayer = {
      name: "Full Model",
      modelName: "FullModel",
      index: 1,
    };
    viewModel.currentLevel = 1;
    viewModel.currentLayer = {
      name: "Overview",
      modelName: "Overview",
      index: 0,
    };
    expect(viewModel.sublayers[0].visibility).toEqual(true);
    expect(viewModel.sublayers[1].visibility).toEqual(false);
    expect(viewModel.selectedLevel).toEqual(1);
    expect(viewModel.currentLevel).toEqual("All");
    expect(bslWrapper.style.display).toEqual("none");

    viewModel.currentLayer = {
      name: "Full Model",
      modelName: "FullModel",
      index: 1,
    };
    expect(viewModel.sublayers[0].visibility).toEqual(false);
    expect(viewModel.sublayers[1].visibility).toEqual(true);
    expect(viewModel.currentLevel).toEqual(1);
    expect(bslWrapper.style.display).toEqual("block");

    document.body.removeChild(bslWrapper);
  });

  it("can handle top layer selection if no Overview", function () {
    const bslWrapper = document.createElement("div");
    bslWrapper.id = "bsl-wrapper";
    document.body.appendChild(bslWrapper);

    i3sProviderWithoutOverview.filterByAttributes = jasmine.createSpy();
    const viewModel = new I3SBuildingSceneLayerExplorerViewModel(
      i3sProviderWithoutOverview
    );
    knockout.track(viewModel);

    viewModel.currentLayer = {
      name: "Full Model",
      modelName: "FullModel",
      index: 0,
    };
    expect(viewModel.sublayers[0].visibility).toEqual(true);
    expect(bslWrapper.style.display).toEqual("block");

    document.body.removeChild(bslWrapper);
  });
});
