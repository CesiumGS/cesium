/*global defineSuite*/
defineSuite([
        'Scene/FrameRateMonitor',
        'Core/defined',
        'Core/getTimestamp',
        'Specs/createScene'
    ], function(
        FrameRateMonitor,
        defined,
        getTimestamp,
        createScene) {
    'use strict';

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    var monitor;
    afterEach(function() {
        if (defined(monitor)) {
            monitor.destroy();
            monitor = undefined;
        }
    });

    function spinWait(milliseconds) {
        /*jshint noempty: false*/
        var endTime = getTimestamp() + milliseconds;
        while (getTimestamp() < endTime) {
        }
    }

    it('throws when constructed without a scene', function() {
        expect(function() {
            monitor = new FrameRateMonitor();
        }).toThrowDeveloperError();

        expect(function() {
            monitor = new FrameRateMonitor({});
        }).toThrowDeveloperError();
    });

    it('can be constructed with just a scene', function() {
        monitor = new FrameRateMonitor({
            scene : scene
        });

        expect(monitor.samplingWindow).toBe(5.0);
        expect(monitor.quietPeriod).toBe(2.0);
        expect(monitor.warmupPeriod).toBe(5.0);
        expect(monitor.minimumFrameRateDuringWarmup).toBe(4);
        expect(monitor.minimumFrameRateAfterWarmup).toBe(8);
        expect(monitor.scene).toBe(scene);
        expect(monitor.lowFrameRate.numberOfListeners).toBe(0);
        expect(monitor.nominalFrameRate.numberOfListeners).toBe(0);
    });

    it('honors parameters to the constructor', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            samplingWindow : 3.0,
            quietPeriod : 1.0,
            warmupPeriod : 6.0,
            minimumFrameRateDuringWarmup : 1,
            minimumFrameRateAfterWarmup : 2
        });

        expect(monitor.samplingWindow).toBe(3.0);
        expect(monitor.quietPeriod).toBe(1.0);
        expect(monitor.warmupPeriod).toBe(6.0);
        expect(monitor.minimumFrameRateDuringWarmup).toBe(1);
        expect(monitor.minimumFrameRateAfterWarmup).toBe(2);
        expect(monitor.scene).toBe(scene);
    });

    it('raises the lowFrameRate event on low frame rate', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 0.001,
            warmupPeriod : 0.001,
            samplingWindow : 0.001,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Record our second sample.  The monitor should notice that our frame rate is too low.
        scene.render();

        expect(monitor.lastFramesPerSecond).toBeLessThan(1000);
        expect(spyListener).toHaveBeenCalled();
    });

    it('does not monitor frame rate while paused', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 0.001,
            warmupPeriod : 0.001,
            samplingWindow : 0.001,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        monitor.pause();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Record our second sample.  The monitor would notice that our frame rate is too low,
        // but it's paused.
        scene.render();

        monitor.unpause();

        scene.render();

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('pausing multiple times requires unpausing multiple times', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 0.001,
            warmupPeriod : 0.001,
            samplingWindow : 0.001,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        monitor.pause();
        monitor.pause();
        monitor.unpause();

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Record our second sample.  The monitor would notice that our frame rate is too low,
        // but it's paused.
        scene.render();

        monitor.unpause();

        scene.render();

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('does not report a low frame rate during the quiet period', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 1.0,
            warmupPeriod : 0.001,
            samplingWindow : 0.001,
            minimumFrameRateDuringWarmup : 1000,
            minimumFrameRateAfterWarmup : 1000
        });

        var spyListener = jasmine.createSpy('listener');
        monitor.lowFrameRate.addEventListener(spyListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait well over a millisecond, which is the maximum frame time allowed by this instance.
        spinWait(2);

        // Render again.  Even though our frame rate is too low, the monitor shouldn't raise the event because we're in the quiet period.
        scene.render();

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('the nominalFrameRate event is raised after the warmup period if the frame rate returns to nominal', function() {
        monitor = new FrameRateMonitor({
            scene : scene,
            quietPeriod : 0.001,
            warmupPeriod : 0.001,
            samplingWindow : 0.001,
            minimumFrameRateDuringWarmup : 10,
            minimumFrameRateAfterWarmup : 10
        });

        var lowListener = jasmine.createSpy('lowFrameRate');
        monitor.lowFrameRate.addEventListener(lowListener);

        var nominalListener = jasmine.createSpy('nominalFrameRate');
        monitor.nominalFrameRate.addEventListener(nominalListener);

        // Rendering once starts the quiet period
        scene.render();

        // Wait until we're well past the end of the quiet period.
        spinWait(2);

        // Rendering again records our first sample.
        scene.render();

        // Wait 120 millseconds, which is over the maximum frame time allowed by this instance.
        spinWait(120);

        // Record our second sample.  The monitor should notice that our frame rate is too low.
        scene.render();

        expect(monitor.lastFramesPerSecond).toBeLessThan(10);
        expect(lowListener).toHaveBeenCalled();

        // Render as fast as possible for a samplingWindow, quietPeriod, and warmupPeriod.
        var endTime = getTimestamp() + 50;
        while (getTimestamp() < endTime) {
            scene.render();
        }

        // The nominalFrameRate event should have been raised.
        expect(monitor.lastFramesPerSecond).toBeGreaterThanOrEqualTo(10);
        expect(nominalListener).toHaveBeenCalled();
    });
}, 'WebGL');
