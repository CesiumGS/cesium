/*global defineSuite*/
defineSuite([
        'Widgets/Animation/Animation',
        'Widgets/Animation/AnimationViewModel',
        'Widgets/ClockViewModel'
    ], function(
        Animation,
        AnimationViewModel,
        ClockViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sanity check', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);
        var animation = new Animation(document.body, animationViewModel);
        animation.applyThemeChanges();
        animation.destroy();
    });
});