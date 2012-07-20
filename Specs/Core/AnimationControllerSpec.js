/*global defineSuite*/
defineSuite([
             'Core/Clock',
             'Core/AnimationController'
            ], function(
              Clock,
              AnimationController) {
    "use strict";
    /*global it,expect*/

    it('construct with default clock', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);
        expect(animationController.clock).toEqual(clock);
    });

    it('play, pause, playReverse, and reset affect isAnimating', function() {
        var clock = new Clock();
        var animationController = new AnimationController(clock);
        expect(animationController.isAnimating()).toEqual(true);
        animationController.pause();
        expect(animationController.isAnimating()).toEqual(false);
        animationController.play();
        expect(animationController.isAnimating()).toEqual(true);
        animationController.playReverse();
        expect(animationController.isAnimating()).toEqual(true);
        animationController.reset();
        expect(animationController.isAnimating()).toEqual(false);
    });

});
