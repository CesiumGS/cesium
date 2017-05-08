/*global defineSuite*/
defineSuite([
        'Widgets/Animation/Animation',
        'Core/defined',
        'Widgets/Animation/AnimationViewModel',
        'Widgets/ClockViewModel'
    ], function(
        Animation,
        defined,
        AnimationViewModel,
        ClockViewModel) {
    'use strict';

    var container;
    var animation;
    afterEach(function() {
        if (defined(animation)) {
            animation = animation.destroy();
        }
        if (defined(container) && defined(container.parentNode)) {
            container.parentNode.removeChild(container);
        }
    });

    it('Can create and destroy', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);
        animation = new Animation(document.body, animationViewModel);
    });

    it('Can create with container not in the DOM', function(done) {
        container = document.createElement('div');
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);
        var animation = new Animation(container, animationViewModel);

        //Verify applyThemeChanges is called when we add the container to the DOM.
        spyOn(animation, 'applyThemeChanges').and.callThrough();
        document.body.appendChild(container);

        // setTimeout is needed because the MutationObserver used by Animation
        // will not be called before next tick.
        setTimeout(function() {
            expect(animation.applyThemeChanges).toHaveBeenCalled();
            done();
        }, 0);
    });

    it('Can destroy without container ever being in the DOM', function() {
        container = document.createElement('div');
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);
        animation = new Animation(container, animationViewModel);
    });
});
