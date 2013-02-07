/*global defineSuite*/
defineSuite([
             'Widgets/AnimationViewModel',
             'Widgets/ClockViewModel',
             'Core/JulianDate',
             'Core/ClockStep',
             'Core/Math'
            ], function(
              AnimationViewModel,
              ClockViewModel,
              JulianDate,
              ClockStep,
              CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected properties', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);
        expect(animationViewModel.clockViewModel).toBe(clockViewModel);

//        expect(animationViewModel.speedLabel()).toEqual(clockViewModel.multiplier() + 'x');
//        expect(animationViewModel.shuttleRingDragging()).toEqual(false);
//
//        expect(animationViewModel.pauseViewModel.toggled()).toEqual(true);
//        expect(animationViewModel.pauseViewModel.toolTip()).toEqual('Pause');
//
//        expect(animationViewModel.playReverseViewModel.toggled()).toEqual(false);
//        expect(animationViewModel.playReverseViewModel.toolTip()).toEqual('Play Reverse');
//
//        expect(animationViewModel.playForwardViewModel.toggled()).toEqual(false);
//        expect(animationViewModel.playForwardViewModel.toolTip()).toEqual('Play Forward');
//
//        expect(animationViewModel.playRealtimeViewModel.toggled()).toEqual(false);
//        expect(animationViewModel.playRealtimeViewModel.toolTip()).toEqual('Today (real-time)');
//
//        expect(animationViewModel.shuttleRingAngle()).toEqual(15);
    });

    it('setTimeFormatter overrides the default formatter', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var expectedString = 'My Time';
        var myCustomFormatter = function(date) {
            expect(date).toEqual(clockViewModel.currentTime());
            return expectedString;
        };
        animationViewModel.setTimeFormatter(myCustomFormatter);

        expect(animationViewModel.timeLabel()).toEqual(expectedString);
        expect(animationViewModel.getTimeFormatter()).toEqual(myCustomFormatter);
    });

    it('defaultTimeFormatter produces expected result', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var date = JulianDate.fromIso8601('2012-03-05T06:07:08.89Z');

        clockViewModel.multiplier(1);
        var expectedResult = '06:07:08 UTC';
        var result = animationViewModel.getTimeFormatter()(date);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier(-1);
        expectedResult = '06:07:08 UTC';
        result = animationViewModel.getTimeFormatter()(date);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier(-0.5);
        expectedResult = '06:07:08.890';
        result = animationViewModel.getTimeFormatter()(date);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier(0.5);
        expectedResult = '06:07:08.890';
        result = animationViewModel.getTimeFormatter()(date);
        expect(result).toEqual(expectedResult);
    });

    it('setDateFormatter overrides the default formatter', function() {
        var clockViewModel = new ClockViewModel();
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var expectedString = 'My Date';
        var myCustomFormatter = function(date) {
            expect(date).toEqual(clockViewModel.currentTime());
            return expectedString;
        };
        animationViewModel.setDateFormatter(myCustomFormatter);

        expect(animationViewModel.dateLabel()).toEqual(expectedString);
        expect(animationViewModel.getDateFormatter()).toEqual(myCustomFormatter);
    });

    it('defaultDateFormatter produces expected result', function() {
        var animationViewModel = new AnimationViewModel(new ClockViewModel());

        var date = JulianDate.fromIso8601('2012-01-05T06:07:08.89Z');
        var expectedResult = 'Jan 5 2012';
        var result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-02-05T06:07:08.89Z');
        expectedResult = 'Feb 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-03-05T06:07:08.89Z');
        expectedResult = 'Mar 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-04-05T06:07:08.89Z');
        expectedResult = 'Apr 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-05-05T06:07:08.89Z');
        expectedResult = 'May 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-06-05T06:07:08.89Z');
        expectedResult = 'Jun 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-07-05T06:07:08.89Z');
        expectedResult = 'Jul 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-08-05T06:07:08.89Z');
        expectedResult = 'Aug 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-09-05T06:07:08.89Z');
        expectedResult = 'Sep 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-10-05T06:07:08.89Z');
        expectedResult = 'Oct 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-11-05T06:07:08.89Z');
        expectedResult = 'Nov 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-12-05T06:07:08.89Z');
        expectedResult = 'Dec 5 2012';
        result = animationViewModel.getDateFormatter()(date);
        expect(result).toEqual(expectedResult);
    });

    it('throws when constructed without arguments', function() {
        expect(function() {
            return new AnimationViewModel();
        }).toThrow();
    });
});