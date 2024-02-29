import { I3SBuildingSceneLayerExplorer } from "../../index.js";
import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";

describe("Widgets/I3SBuildingSceneLayerExplorer/I3SBuildingSceneLayerExplorer", function () {
  const i3sProvider = {
    sublayers: [
      {
        name: "Overview",
        modelName: "Overview",
        visibility: true,
        sublayers: [],
      },
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
    ],
    getAttributeNames: function () {
      return ["BldgLevel", "testAttr"];
    },
    getAttributeValues: function () {
      return [1, 0];
    },
  };

  it("can create bsl explorer ui", function () {
    const container = document.createElement("div");
    container.id = "testContainer";
    document.body.appendChild(container);

    const widget = new I3SBuildingSceneLayerExplorer("testContainer", {
      sublayers: [],
    });
    expect(widget).toBeInstanceOf(I3SBuildingSceneLayerExplorer);

    expect(container.childElementCount).toEqual(1);
    expect(container.children[0].childElementCount).toEqual(3);
    expect(container.children[0].children[0].localName).toEqual("h3");
    expect(container.children[0].children[0].textContent).toEqual(
      "Building explorer"
    );
    expect(container.children[0].children[1].localName).toEqual("select");
    expect(container.children[0].children[1].textContent).toEqual(
      "Building layers not found"
    );
    expect(container.children[0].children[2].localName).toEqual("div");
    expect(container.children[0].children[2].id).toEqual("bsl-wrapper");

    document.body.removeChild(container);
  });

  it("throws dev error with no container", function () {
    expect(function () {
      return new I3SBuildingSceneLayerExplorer();
    }).toThrowDeveloperError();
  });

  it("throws dev error with no i3sdataprovider", function () {
    const container = document.createElement("div");
    container.id = "testContainer";
    document.body.appendChild(container);

    expect(function () {
      return new I3SBuildingSceneLayerExplorer("testContainer");
    }).toThrowDeveloperError();
    document.body.removeChild(container);
  });

  it("can expand/collapse bsl tree", function () {
    const container = document.createElement("div");
    container.id = "testContainer";
    document.body.appendChild(container);

    i3sProvider.filterByAttributes = jasmine.createSpy();
    const widget = new I3SBuildingSceneLayerExplorer(
      "testContainer",
      i3sProvider
    );
    expect(widget).toBeInstanceOf(I3SBuildingSceneLayerExplorer);

    const expander = document.querySelector(".expandItem");
    const nestedList = expander.parentElement.parentElement.querySelector(
      "#Cat1-expander"
    );
    expect(expander.textContent).toEqual("+");
    expect(nestedList.className).toEqual("nested");
    DomEventSimulator.fireClick(expander);
    expect(expander.textContent).toEqual("-");
    expect(nestedList.className).toEqual("nested active");
    DomEventSimulator.fireClick(expander);
    expect(expander.textContent).toEqual("+");
    expect(nestedList.className).toEqual("nested");

    document.body.removeChild(container);
  });
});
