/*global defineSuite*/
defineSuite([
             'Core/AnimationController',
             'Core/Clock',
             'Core/ClockStep',
             'Core/Math'
            ], function(
              AnimationController,
              Clock,
              ClockStep,
              CesiumMath) {
    "use strict";
    /*global it,expect,waitsFor*/

    it('construct with default clock', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);
        expect(animationController.clock).toEqual(clock);
    });

    it('construct throws if no clock', function() {
        expect(function() { return new AnimationController(); }).toThrow();
    });

    it('getTypicalSpeed throws if no input speed', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        expect(function() { return animationController.getTypicalSpeed('foo'); }).toThrow();
        expect(function() { return animationController.getTypicalSpeed(undefined); }).toThrow();
        expect(function() { return animationController.getTypicalSpeed(1.0); }).not.toThrow();
    });

    it('play, pause, playReverse, playRealtime, reset, and unpause affect isAnimating', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);
        expect(animationController.isAnimating()).toEqual(true);
        animationController.pause();
        expect(animationController.isAnimating()).toEqual(false);
        animationController.playReverse();
        expect(animationController.isAnimating()).toEqual(true);
        animationController.play();
        expect(animationController.isAnimating()).toEqual(true);
        animationController.reset();
        expect(animationController.isAnimating()).toEqual(false);
        animationController.unpause();
        expect(animationController.isAnimating()).toEqual(true);
        animationController.reset();
        expect(animationController.isAnimating()).toEqual(false);
        animationController.playRealtime();
        expect(animationController.isAnimating()).toEqual(true);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);
    });

    it('clock changes only when animating', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        animationController.pause();
        var time1 = animationController.update();
        expect(time1).toEqual(animationController.update());
        expect(time1).toEqual(animationController.update());

        animationController.play();
        time1 = animationController.update();
        waitsFor(function() {
            var time2 = animationController.update();
            return time2.greaterThan(time1);
        });
    });

    it('faster makes it go faster', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        var speed = clock.multiplier;
        animationController.faster();
        expect(clock.multiplier).toBeGreaterThan(speed);

        // Backwards means negative numbers.
        animationController.playReverse();
        expect(clock.multiplier).toBeLessThan(-speed);
        speed = clock.multiplier;
        animationController.faster();
        expect(clock.multiplier).toBeLessThan(speed);

        animationController.playRealtime();
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);
        expect(clock.multiplier).toEqual(1);
        animationController.faster();
        expect(clock.clockStep).toEqual(ClockStep.SPEED_MULTIPLIER);
        expect(clock.multiplier).toBeGreaterThan(1);
        clock.multiplier = 1.0001;
        animationController.faster();
        expect(clock.multiplier).toBeGreaterThan(1);
    });

    it('slower makes it go slower', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        var speed = clock.multiplier;
        animationController.slower();
        expect(clock.multiplier).toBeLessThan(speed);

        // Backwards means negative numbers.
        animationController.playReverse();
        expect(clock.multiplier).toBeLessThan(0);
        expect(clock.multiplier).toBeGreaterThan(-speed);
        speed = clock.multiplier;
        animationController.slower();
        expect(clock.multiplier).toBeLessThan(0);
        expect(clock.multiplier).toBeGreaterThan(speed);

        animationController.playRealtime();
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);
        expect(clock.multiplier).toEqual(1);
        animationController.slower();
        expect(clock.clockStep).toEqual(ClockStep.SPEED_MULTIPLIER);
        expect(clock.multiplier).toBeLessThan(1);
        expect(clock.multiplier).toBeGreaterThan(0);
    });

    it('typical speeds are reasonable', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        expect(animationController.getTypicalSpeed(60.001)).toEqualEpsilon(60.0, CesiumMath.EPSILON14);
        expect(animationController.getTypicalSpeed(304.0)).toEqualEpsilon(300.0, CesiumMath.EPSILON14);
        expect(animationController.getTypicalSpeed(0.000000001)).toEqualEpsilon(0.000001, CesiumMath.EPSILON14);
        expect(animationController.getTypicalSpeed(1e15)).toEqualEpsilon(604800.0, CesiumMath.EPSILON14);
    });

    it('moreReverse slows and goes backwards', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        clock.multiplier = 0.0025;
        animationController.moreReverse();
        expect(clock.multiplier).toEqualEpsilon(0.002, CesiumMath.EPSILON14);
        animationController.moreReverse();
        expect(clock.multiplier).toEqualEpsilon(0.001, CesiumMath.EPSILON14);
        animationController.moreReverse();
        expect(clock.multiplier).toEqualEpsilon(-0.001, CesiumMath.EPSILON14);
        animationController.moreReverse();
        expect(clock.multiplier).toEqualEpsilon(-0.002, CesiumMath.EPSILON14);
    });

    it('moreForward slows reverse and goes forwards', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);

        clock.multiplier = -0.0025;
        animationController.moreForward();
        expect(clock.multiplier).toEqualEpsilon(-0.002, CesiumMath.EPSILON14);
        animationController.moreForward();
        expect(clock.multiplier).toEqualEpsilon(-0.001, CesiumMath.EPSILON14);
        animationController.moreForward();
        expect(clock.multiplier).toEqualEpsilon(0.001, CesiumMath.EPSILON14);
        animationController.moreForward();
        expect(clock.multiplier).toEqualEpsilon(0.002, CesiumMath.EPSILON14);
    });

});
