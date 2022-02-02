import { NavigationHelpButtonViewModel } from "../../../Source/Cesium.js";

describe("Widgets/NavigationHelpButton/NavigationHelpButtonViewModel", function () {
  it("Can construct", function () {
    const viewModel = new NavigationHelpButtonViewModel();
    expect(viewModel.showInstructions).toBe(false);
  });

  it("invoking command toggles showing", function () {
    const viewModel = new NavigationHelpButtonViewModel();
    expect(viewModel.showInstructions).toBe(false);

    viewModel.command();
    expect(viewModel.showInstructions).toBe(true);

    viewModel.command();
    expect(viewModel.showInstructions).toBe(false);
  });
});
