/*global defineSuite*/
defineSuite([
             'Widgets/Animation/Animation',
             'Widgets/Animation/AnimationViewModel',
             'Widgets/ClockViewModel',
             'Core/JulianDate',
             'Core/ClockStep',
             'Core/ClockRange',
             'Core/Math'
            ], function(
              Animation,
              AnimationViewModel,
              ClockViewModel,
              JulianDate,
              ClockStep,
              ClockRange,
              CesiumMath) {
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