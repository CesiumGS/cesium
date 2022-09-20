import { InfoBoxViewModel } from "../../../Source/Cesium.js";

describe("Widgets/InfoBox/InfoBoxViewModel", function () {
  it("constructor sets expected values", function () {
    const viewModel = new InfoBoxViewModel();
    expect(viewModel.enableCamera).toBe(false);
    expect(viewModel.isCameraTracking).toBe(false);
    expect(viewModel.showInfo).toBe(false);
    expect(viewModel.cameraClicked).toBeDefined();
    expect(viewModel.closeClicked).toBeDefined();
    expect(viewModel.maxHeightOffset(0)).toBeDefined();
  });

  it("sets description", function () {
    const safeString = "<p>This is a test.</p>";
    const viewModel = new InfoBoxViewModel();
    viewModel.description = safeString;
    expect(viewModel.description).toBe(safeString);
  });

  it("indicates missing description", function () {
    const viewModel = new InfoBoxViewModel();
    expect(viewModel._bodyless).toBe(true);
    viewModel.description = "Testing";
    expect(viewModel._bodyless).toBe(false);
  });

  it("camera icon changes when tracking is not available, unless due to active tracking", function () {
    const viewModel = new InfoBoxViewModel();
    viewModel.enableCamera = true;
    viewModel.isCameraTracking = false;
    const enabledTrackingPath = viewModel.cameraIconPath;

    viewModel.enableCamera = false;
    viewModel.isCameraTracking = false;
    expect(viewModel.cameraIconPath).not.toBe(enabledTrackingPath);

    const disableTrackingPath = viewModel.cameraIconPath;

    viewModel.enableCamera = true;
    viewModel.isCameraTracking = true;
    expect(viewModel.cameraIconPath).toBe(disableTrackingPath);

    viewModel.enableCamera = false;
    viewModel.isCameraTracking = true;
    expect(viewModel.cameraIconPath).toBe(disableTrackingPath);
  });
});
