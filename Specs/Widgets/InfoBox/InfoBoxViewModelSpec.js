/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBoxViewModel',
        'Core/sanitizeHtml'
    ], function(
        InfoBoxViewModel,
        sanitizeHtml) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected values', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel.enableCamera).toBe(false);
        expect(viewModel.isCameraTracking).toBe(false);
        expect(viewModel.showInfo).toBe(false);
        expect(viewModel.cameraClicked).toBeDefined();
        expect(viewModel.closeClicked).toBeDefined();
        expect(viewModel.description).toBe('');
        expect(viewModel.maxHeightOffset(0)).toBeDefined();
        expect(viewModel.preprocessor).toBeUndefined();
        expect(viewModel.loadingIndicatorHtml).toBeDefined();
    });

    it('allows some HTML in description', function() {
        var value = 'Testing. <script>console.error("Scripts are disallowed by default.");</script>';
        var viewModel = new InfoBoxViewModel();
        viewModel.description = value;
        expect(viewModel.processedDescription).toBe(value);
    });

    it('removes script tags from HTML description when used with sanitizeHtml', function() {
        var evilString = 'Testing. <script>console.error("Scripts are disallowed by default.");</script>';
        var viewModel = new InfoBoxViewModel();
        viewModel.preprocessor = sanitizeHtml;
        viewModel.description = evilString;
        waitsFor(function() {
            return viewModel.processedDescription !== viewModel.loadingIndicatorHtml;
        });
        runs(function() {
            expect(viewModel.processedDescription).toContain('Testing.');
            expect(viewModel.processedDescription).not.toContain('script');
        });
    });

    it('indicates missing description', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel._bodyless).toBe(true);
        viewModel.description = 'Testing';
        waitsFor(function() {
            return viewModel.processedDescription !== viewModel.loadingIndicatorHtml;
        });
        runs(function() {
            expect(viewModel._bodyless).toBe(false);
        });
    });

    function customPreprocessor(string) {
        return string + ' (processed by customPreprocessor)';
    }

    it('Reprocesses data when preprocessor is changed.', function() {
        var testString = 'Testing hot-swap of custom preprocessor.';
        var viewModel = new InfoBoxViewModel();

        viewModel.description = testString;
        viewModel.preprocessor = customPreprocessor;
        expect(viewModel.processedDescription).toEqual(testString + ' (processed by customPreprocessor)');

        testString = 'subsequent test, after the swap.';
        viewModel.description = testString;
        expect(viewModel.processedDescription).toContain(testString);
        expect(viewModel.processedDescription).toEqual(testString + ' (processed by customPreprocessor)');
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