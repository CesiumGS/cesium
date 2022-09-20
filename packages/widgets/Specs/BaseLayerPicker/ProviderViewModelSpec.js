import {
  knockout,
  ProviderViewModel,
  createCommand,
} from "../../index.js";

describe("Widgets/BaseLayerPicker/ProviderViewModel", function () {
  let spyCreationFunction;
  beforeEach(function () {
    spyCreationFunction = jasmine.createSpy("creationFunction");
  });

  describe("with observables", function () {
    it("constructor sets expected parameters", function () {
      const options = {
        name: knockout.observable("name"),
        tooltip: knockout.observable("tooltip"),
        iconUrl: knockout.observable("iconUrl"),
        category: "mycategory",
        creationFunction: createCommand(spyCreationFunction),
      };

      const viewModel = new ProviderViewModel(options);
      expect(viewModel.name).toBe(options.name());
      expect(viewModel.tooltip).toBe(options.tooltip());
      expect(viewModel.iconUrl).toBe(options.iconUrl());
      expect(viewModel.category).toBe(options.category);

      expect(viewModel.creationCommand).toBeDefined();
      viewModel.creationCommand();
      expect(spyCreationFunction).toHaveBeenCalled();
    });

    it("constructor throws with no name", function () {
      const options = {
        tooltip: knockout.observable("tooltip"),
        iconUrl: knockout.observable("iconUrl"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no tooltip", function () {
      const options = {
        name: knockout.observable("name"),
        iconUrl: knockout.observable("iconUrl"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no iconUrl", function () {
      const options = {
        name: knockout.observable("name"),
        tooltip: knockout.observable("tooltip"),
        creationFunction: createCommand(spyCreationFunction),
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no creationFunction", function () {
      const options = {
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
      const options = {
        name: "name",
        tooltip: "tooltip",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      const viewModel = new ProviderViewModel(options);
      expect(viewModel.name).toEqual(options.name);
      expect(viewModel.tooltip).toEqual(options.tooltip);
      expect(viewModel.iconUrl).toEqual(options.iconUrl);

      expect(viewModel.creationCommand).toBeDefined();
      viewModel.creationCommand();
      expect(spyCreationFunction).toHaveBeenCalled();
    });

    it("constructor throws with no name", function () {
      const options = {
        tooltip: "tooltip",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no tooltip", function () {
      const options = {
        name: "name",
        iconUrl: "iconUrl",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no iconUrl", function () {
      const options = {
        name: "name",
        tooltip: "tooltip",
        creationFunction: spyCreationFunction,
      };

      expect(function () {
        return new ProviderViewModel(options);
      }).toThrowDeveloperError();
    });

    it("constructor throws with no creationFunction", function () {
      const options = {
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
