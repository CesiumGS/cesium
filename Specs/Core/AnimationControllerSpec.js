/*global defineSuite*/
defineSuite([
             'Core/AnimationController',
             'Core/Clock'
            ], function(
              AnimationController,
              Clock) {
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

    it('play, pause, playReverse, reset, and unpause affect isAnimating', function() {
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
    });

});
