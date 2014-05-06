/*global defineSuite*/
defineSuite([
         'Widgets/PerformanceWatchdog/PerformanceWatchdogViewModel',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
             PerformanceWatchdogViewModel,
             createScene,
             destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('throws when constructed without a scene', function() {
        expect(function() {
            var viewModel = new PerformanceWatchdogViewModel();
        }).toThrow();

        expect(function() {
            var viewModel = new PerformanceWatchdogViewModel({});
        }).toThrow();
    });

    it('can be constructed with just a scene', function() {
        var viewModel = new PerformanceWatchdogViewModel({
            scene : scene
        });

        expect(viewModel.redirectOnErrorUrl).toBeUndefined();
        expect(viewModel.redirectOnLowFrameRateUrl).toBeUndefined();
        expect(viewModel.lowFrameRateMessage).toBeDefined();
        expect(viewModel.samplingWindow).toBe(5000);
        expect(viewModel.quietPeriod).toBe(2000);
        expect(viewModel.warmupPeriod).toBe(5000);
        expect(viewModel.minimumFrameRateDuringWarmup).toBe(4);
        expect(viewModel.minimumFrameRateAfterWarmup).toBe(8);
        expect(viewModel.lowFrameRateMessageDismissed).toBe(false);
        expect(viewModel.showingLowFrameRateMessage).toBe(false);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.lowFrameRate.numberOfListeners).toBe(0);
    });

    it('honors parameters to the constructor', function() {
        var options = {
            scene : scene,
            redirectOnErrorUrl : 'http://redirected.here/by/PerformanceWatchdogViewModelSpec/for/error',
            redirectOnLowFrameRateUrl : 'http://redirected.here/by/PerformanceWatchdogViewModelSpec/for/low/frame/rate',
            lowFrameRateMessage : 'why so slow?',
            samplingWindow : 3000,
            quietPeriod : 1000,
            warmupPeriod : 6000,
            minimumFrameRateDuringWarmup : 1,
            minimumFrameRateAfterWarmup : 2,
            lowFrameRateCallback : function() {}
        };

        var viewModel = new PerformanceWatchdogViewModel(options);

        expect(viewModel.redirectOnErrorUrl).toBe('http://redirected.here/by/PerformanceWatchdogViewModelSpec/for/error');
        expect(viewModel.redirectOnLowFrameRateUrl).toBe('http://redirected.here/by/PerformanceWatchdogViewModelSpec/for/low/frame/rate');
        expect(viewModel.lowFrameRateMessage).toBe('why so slow?');
        expect(viewModel.samplingWindow).toBe(3000);
        expect(viewModel.quietPeriod).toBe(1000);
        expect(viewModel.warmupPeriod).toBe(6000);
        expect(viewModel.minimumFrameRateDuringWarmup).toBe(1);
        expect(viewModel.minimumFrameRateAfterWarmup).toBe(2);
        expect(viewModel.lowFrameRateMessageDismissed).toBe(false);
        expect(viewModel.showingLowFrameRateMessage).toBe(false);
        expect(viewModel.scene).toBe(scene);
        expect(viewModel.lowFrameRate.numberOfListeners).toBe(1);
    });
});
