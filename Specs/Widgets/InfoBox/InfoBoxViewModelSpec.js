/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBoxViewModel',
        'Specs/pollToPromise'
    ], function(
        InfoBoxViewModel,
        pollToPromise) {
    'use strict';

    it('constructor sets expected values', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel.enableCamera).toBe(false);
        expect(viewModel.isCameraTracking).toBe(false);
        expect(viewModel.showInfo).toBe(false);
        expect(viewModel.cameraClicked).toBeDefined();
        expect(viewModel.closeClicked).toBeDefined();
        expect(viewModel.maxHeightOffset(0)).toBeDefined();
    });

    it('sets description', function() {
        var safeString = '<p>This is a test.</p>';
        var viewModel = new InfoBoxViewModel();
        viewModel.description = safeString;
        expect(viewModel.description).toBe(safeString);
    });

    it('indicates missing description', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel._bodyless).toBe(true);
        viewModel.description = 'Testing';
        expect(viewModel._bodyless).toBe(false);
    });

    it('camera icon changes when tracking is not available, unless due to active tracking', function() {
        var viewModel = new InfoBoxViewModel();
        viewModel.enableCamera = true;
        viewModel.isCameraTracking = false;
        var enabledTrackingPath = viewModel.cameraIconPath;

        viewModel.enableCamera = false;
        viewModel.isCameraTracking = false;
        expect(viewModel.cameraIconPath).not.toBe(enabledTrackingPath);

        var disableTrackingPath = viewModel.cameraIconPath;

        viewModel.enableCamera = true;
        viewModel.isCameraTracking = true;
        expect(viewModel.cameraIconPath).toBe(disableTrackingPath);

        viewModel.enableCamera = false;
        viewModel.isCameraTracking = true;
        expect(viewModel.cameraIconPath).toBe(disableTrackingPath);
    });
});
