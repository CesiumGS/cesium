import { knockout } from "../../../Source/Cesium.js";
import { ProviderViewModel } from "../../../Source/Cesium.js";
import { createCommand } from "../../../Source/Cesium.js";

describe("Widgets/BaseLayerPicker/ProviderViewModel", function () {
  var spyCreationFunction;
  beforeEach(function () {
    spyCreationFunction = jasmine.createSpy("creationFunction");
  });

  describe("with observables", function () {
    it("constructor sets expected parameters", function () {
      var options = {
        name: knockout.observable("name"),
        tooltip: knockout.observable("tooltip"),
        iconUrl: knockout.observable("iconUrl"),
        category: "mycategory",
        creationFunction: createCommand(spyCreationFunction),
      };

      var viewModel = new ProviderViewModel(options);
      expect(viewModel.name).toBe(options.name());
      expect(viewModel.tooltip).toBe(options.tooltip());
      expect(viewModel.iconUrl).toBe(options.iconUrl());
      expect(viewModel.category).toBe(options.category);

      expect(viewModel.creationCommand).toBeDefined();
      viewModel.creationCommand();
      expect(spyCreationFunction).toHaveBeenCalled();
    });

    it("constructor throws with no name", function () {
      var options = {
        tooltip: knockout.observable("tooltip"),
        iconUrl: knockout.observable("iconUrl"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no tooltip", function () {
      var options = {
        name: knockout.observable("name"),
        iconUrl: knockout.observable("iconUrl"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no iconUrl", function () {
      var options = {
        name: knockout.observable("name"),
        tooltip: knockout.observable("tooltip"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no creationFunction", function () {
      var options = {
        name: knockout.observable("name"),
        tooltip: knockout.observable("tooltip"),
        iconUrl: knockout.observable("iconUrl"),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });
  });

  describe("with values", function () {
    it("constructor sets expected parameters", function () {
      var options = {
        name: "name",
        tooltip: "tooltip",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      var viewModel = new ProviderViewModel(options);
      expect(viewModel.name).toEqual(options.name);
      expect(viewModel.tooltip).toEqual(options.tooltip);
      expect(viewModel.iconUrl).toEqual(options.iconUrl);

      expect(viewModel.creationCommand).toBeDefined();
      viewModel.creationCommand();
      expect(spyCreationFunction).toHaveBeenCalled();
    });

    it("constructor throws with no name", function () {
      var options = {
        tooltip: "tooltip",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no tooltip", function () {
      var options = {
        name: "name",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no iconUrl", function () {
      var options = {
        name: "name",
        tooltip: "tooltip",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no creationFunction", function () {
      var options = {
        name: "name",
        tooltip: "tooltip",
        iconUrl: "iconUrl",
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });
  });
});
