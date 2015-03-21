/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBoxViewModel',
        'Specs/pollToPromise'
    ], function(
        InfoBoxViewModel,
        pollToPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('constructor sets expected values', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel.enableCamera).toBe(false);
        expect(viewModel.isCameraTracking).toBe(false);
        expect(viewModel.showInfo).toBe(false);
        expect(viewModel.cameraClicked).toBeDefined();
        expect(viewModel.closeClicked).toBeDefined();
        expect(viewModel.descriptionRawHtml).toBe('');
        expect(viewModel.maxHeightOffset(0)).toBeDefined();
        expect(viewModel.loadingIndicatorHtml).toBeDefined();
    });

    it('sets description', function() {
        var safeString = '<p>This is a test.</p>';
        var viewModel = new InfoBoxViewModel();
        viewModel.descriptionRawHtml = safeString;

        return pollToPromise(function() {
            return viewModel.descriptionSanitizedHtml !== viewModel.loadingIndicatorHtml;
        }).then(function() {
            expect(viewModel.descriptionSanitizedHtml).toBe(safeString);
        });
    });

    it('indicates missing description', function() {
        var viewModel = new InfoBoxViewModel();
        expect(viewModel._bodyless).toBe(true);
        viewModel.descriptionRawHtml = 'Testing';

        return pollToPromise(function() {
            return viewModel.descriptionSanitizedHtml !== viewModel.loadingIndicatorHtml;
        }).then(function() {
            expect(viewModel._bodyless).toBe(false);
        });
    });

    function customSanitizer(string) {
        return string + ' (processed by customSanitizer)';
    }

    it('allows user-supplied HTML sanitization.', function() {
        var testString = 'Testing hot-swap of custom sanitizer.';
        var viewModel = new InfoBoxViewModel();

        viewModel.descriptionRawHtml = testString;

        return pollToPromise(function() {
            return viewModel.descriptionSanitizedHtml !== viewModel.loadingIndicatorHtml;
        }).then(function() {
            expect(viewModel.descriptionSanitizedHtml).toBe(testString);

            viewModel.sanitizer = customSanitizer;
            expect(viewModel.descriptionSanitizedHtml).toContain(testString);
            expect(viewModel.descriptionSanitizedHtml).toContain('processed by customSanitizer');
            testString = 'subsequent test, after the swap.';
            viewModel.descriptionRawHtml = testString;
            expect(viewModel.descriptionSanitizedHtml).toContain(testString);
            expect(viewModel.descriptionSanitizedHtml).toContain('processed by customSanitizer');
        });
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
