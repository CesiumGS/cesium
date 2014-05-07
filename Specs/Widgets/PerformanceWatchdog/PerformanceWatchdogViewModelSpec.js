/*global defineSuite*/
defineSuite([
         'Widgets/PerformanceWatchdog/PerformanceWatchdogViewModel',
         'Core/defined',
         'Core/getTimestamp',
         'Core/redirectToUrl',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
             PerformanceWatchdogViewModel,
             defined,
             getTimestamp,
             redirectToUrl,
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

    var viewModel;
    afterEach(function() {
        if (defined(viewModel)) {
            viewModel.destroy();
            viewModel = undefined;
        }
    });

    function asyncSleep(milliseconds) {
        var doneTime = getTimestamp() + milliseconds;
        waitsFor(function() {
            return getTimestamp() >= doneTime;
        });
    }

    it('throws when constructed without a scene', function() {
        expect(function() {
            viewModel = new PerformanceWatchdogViewModel();
        }).toThrow();

        expect(function() {
            viewModel = new PerformanceWatchdogViewModel({});
        }).toThrow();
    });

    it('can be constructed with just a scene', function() {
        viewModel = new PerformanceWatchdogViewModel({
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

        viewModel = new PerformanceWatchdogViewModel(options);

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

    it('shows a message on low frame rate', function() {
        viewModel = new PerformanceWatchdogViewModel({
            scene : scene,
            quietPeriod : 1,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        expect(viewModel.showingLowFrameRateMessage).toBe(false);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        asyncSleep(20);

        // Rendering again records our first sample.
        runs(function() {
            scene.render();
        });

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        asyncSleep(20);

        // Record our second sample.  The watchdog should notice that our frame rate is too low.
        runs(function() {
            scene.render();
            expect(viewModel.showingLowFrameRateMessage).toBe(true);
        });
    });

    it('does not report a low frame rate during the queit period', function() {
        viewModel = new PerformanceWatchdogViewModel({
            scene : scene,
            quietPeriod : 1000,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        // Rendering once starts the quiet period
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        asyncSleep(20);

        // Render again.  Even though our frame rate is too low, the watchdog shouldn't bark because we're in the quiet period.
        runs(function() {
            scene.render();
            expect(viewModel.showingLowFrameRateMessage).toBe(false);
        });
    });

    it('redirects on render error when a redirectOnErrorUrl is provided', function() {
        spyOn(redirectToUrl, 'implementation');
        spyOn(scene.primitives, 'update').andCallFake(function() {
            throw 'error';
        });

        var viewModel = new PerformanceWatchdogViewModel({
            scene : scene,
            redirectOnErrorUrl : 'http://fake.redirect/target'
        });

        scene.render();

        expect(redirectToUrl.implementation).toHaveBeenCalledWith('http://fake.redirect/target');
    });

    it('redirects on low frame rate when a redirectOnLowFrameRateUrl is provided', function() {
        spyOn(redirectToUrl, 'implementation');

        viewModel = new PerformanceWatchdogViewModel({
            scene : scene,
            redirectOnLowFrameRateUrl : 'http://fake.redirect/target',
            quietPeriod : 1,
            warmupPeriod : 1,
            samplingWindow : 1,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        expect(viewModel.showingLowFrameRateMessage).toBe(false);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        asyncSleep(20);

        // Rendering again records our first sample.
        runs(function() {
            scene.render();
        });

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        asyncSleep(100);

        // Record our second sample.  The watchdog should notice that our frame rate is too low.
        runs(function() {
            scene.render();
            expect(redirectToUrl.implementation).toHaveBeenCalledWith('http://fake.redirect/target');
        });
    });
}, 'WebGL');
