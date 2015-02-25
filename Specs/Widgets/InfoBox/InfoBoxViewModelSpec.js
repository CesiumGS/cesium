/*global defineSuite*/
defineSuite([
        'Widgets/InfoBox/InfoBoxViewModel'
    ], function(
        InfoBoxViewModel) {
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
        expect(viewModel.sandbox).toEqual('allow-same-origin allow-popups allow-pointer-lock allow-forms');
    });

    it('sets processedDescription when preprocessor is undefined', function() {
        var value = 'Testing.';
        var viewModel = new InfoBoxViewModel();
        viewModel.description = value;
        expect(viewModel.processedDescription).toBe(value);
    });

    it('sets prcessedDescription with preprocessor result', function() {
        var value = 'Testing.';
        var viewModel = new InfoBoxViewModel();
        viewModel.preprocessor = function(value) {
            return value + value;
        };
        viewModel.description = value;
        expect(viewModel.processedDescription).toBe(value + value);
    });

    it('sets prcessedDescription with defaultPreprocessor result', function() {
        var value = 'Testing.';
        InfoBoxViewModel.defaultPreprocessor = function(value) {
            return value + value;
        };
        var viewModel = new InfoBoxViewModel();
        viewModel.description = value;
        expect(viewModel.processedDescription).toBe(value + value);
        InfoBoxViewModel.defaultPrerocessor = undefined;
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

    //deprecated tests
    it('sets prcessedDescription with sanitizer result', function() {
        var value = 'Testing.';
        var viewModel = new InfoBoxViewModel();
        viewModel.sanitizer = function(value) {
            return value + value;
        };
        viewModel.descriptionRawHtml = value;
        expect(viewModel.descriptionSanitizedHtml).toBe(value + value);
    });

    it('sets prcessedDescription with defaultSanitizer result', function() {
        var value = 'Testing.';
        InfoBoxViewModel.defaultSanitizer = function(value) {
            return value + value;
        };
        var viewModel = new InfoBoxViewModel();
        viewModel.descriptionRawHtml = value;
        expect(viewModel.descriptionSanitizedHtml).toBe(value + value);
        InfoBoxViewModel.defaultSanitizer = undefined;
    });
});