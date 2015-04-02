/*global defineSuite*/
defineSuite([
        'Widgets/Animation/AnimationViewModel',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/JulianDate',
        'Widgets/ClockViewModel'
    ], function(
        AnimationViewModel,
        ClockRange,
        ClockStep,
        JulianDate,
        ClockViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var clockViewModel;
    beforeEach(function() {
        clockViewModel = new ClockViewModel();
    });

    function verifyPausedState(viewModel) {
        expect(viewModel.pauseViewModel.toggled).toEqual(true);
        expect(viewModel.playReverseViewModel.toggled).toEqual(false);
        expect(viewModel.playForwardViewModel.toggled).toEqual(false);
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(false);
    }

    function verifyForwardState(viewModel) {
        expect(viewModel.pauseViewModel.toggled).toEqual(false);
        expect(viewModel.playReverseViewModel.toggled).toEqual(false);
        expect(viewModel.playForwardViewModel.toggled).toEqual(true);
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(false);
    }

    function verifyReverseState(viewModel) {
        expect(viewModel.pauseViewModel.toggled).toEqual(false);
        expect(viewModel.playReverseViewModel.toggled).toEqual(true);
        expect(viewModel.playForwardViewModel.toggled).toEqual(false);
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(false);
    }

    function verifyRealtimeState(viewModel) {
        expect(viewModel.pauseViewModel.toggled).toEqual(false);
        expect(viewModel.playReverseViewModel.toggled).toEqual(false);
        expect(viewModel.playForwardViewModel.toggled).toEqual(false);
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(true);
        expect(viewModel.shuttleRingAngle).toEqual(AnimationViewModel._realtimeShuttleRingAngle);
    }

    it('constructor sets expected properties', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        expect(animationViewModel.clockViewModel).toBe(clockViewModel);
    });

    it('setTimeFormatter overrides the default formatter', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var expectedString = 'My Time';
        var myCustomFormatter = function(date) {
            expect(date).toEqual(clockViewModel.currentTime);
            return expectedString;
        };
        animationViewModel.timeFormatter = myCustomFormatter;

        expect(animationViewModel.timeLabel).toEqual(expectedString);
        expect(animationViewModel.timeFormatter).toEqual(myCustomFormatter);
    });

    it('defaultTimeFormatter produces expected result', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var date = JulianDate.fromIso8601('2012-03-05T06:07:08.89Z');

        clockViewModel.multiplier = 1;
        var expectedResult = '06:07:08 UTC';
        var result = animationViewModel.timeFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier = -1;
        expectedResult = '06:07:08 UTC';
        result = animationViewModel.timeFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier = -0.5;
        expectedResult = '06:07:08.890';
        result = animationViewModel.timeFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        clockViewModel.multiplier = 0.5;
        expectedResult = '06:07:08.890';
        result = animationViewModel.timeFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);
    });

    it('setDateFormatter overrides the default formatter', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);

        var expectedString = 'My Date';
        var myCustomFormatter = function(date) {
            expect(date).toEqual(clockViewModel.currentTime);
            return expectedString;
        };
        animationViewModel.dateFormatter = myCustomFormatter;

        expect(animationViewModel.dateLabel).toEqual(expectedString);
        expect(animationViewModel.dateFormatter).toEqual(myCustomFormatter);
    });

    it('defaultDateFormatter produces expected result', function() {
        var animationViewModel = new AnimationViewModel(new ClockViewModel());

        var date = JulianDate.fromIso8601('2012-01-05T06:07:08.89Z');
        var expectedResult = 'Jan 5 2012';
        var result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-02-05T06:07:08.89Z');
        expectedResult = 'Feb 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-03-05T06:07:08.89Z');
        expectedResult = 'Mar 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-04-05T06:07:08.89Z');
        expectedResult = 'Apr 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-05-05T06:07:08.89Z');
        expectedResult = 'May 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-06-05T06:07:08.89Z');
        expectedResult = 'Jun 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-07-05T06:07:08.89Z');
        expectedResult = 'Jul 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-08-05T06:07:08.89Z');
        expectedResult = 'Aug 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-09-05T06:07:08.89Z');
        expectedResult = 'Sep 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-10-05T06:07:08.89Z');
        expectedResult = 'Oct 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-11-05T06:07:08.89Z');
        expectedResult = 'Nov 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);

        date = JulianDate.fromIso8601('2012-12-05T06:07:08.89Z');
        expectedResult = 'Dec 5 2012';
        result = animationViewModel.dateFormatter(date, animationViewModel);
        expect(result).toEqual(expectedResult);
    });

    it('correctly formats speed label', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        var expectedString;

        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.multiplier = 123.1;
        expectedString = '123.1x';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);

        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.multiplier = 123.12;
        expectedString = '123.12x';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);

        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.multiplier = 123.123;
        expectedString = '123.123x';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);

        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.multiplier = 123.1236;
        expectedString = '123.124x';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);

        clockViewModel.clockStep = ClockStep.SYSTEM_CLOCK;
        expectedString = 'Today';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);

        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.multiplier = 15;
        expectedString = '15x';
        expect(animationViewModel.multiplierLabel).toEqual(expectedString);
    });

    it('pause button restores current state', function() {
        clockViewModel.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clockViewModel.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clockViewModel.currentTime = JulianDate.fromIso8601("2012-01-01T12:00:00");
        clockViewModel.multiplier = 1;
        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.clockRange = ClockRange.UNBOUNDED;
        clockViewModel.shouldAnimate = false;

        var viewModel = new AnimationViewModel(clockViewModel);

        //Starts out paused
        verifyPausedState(viewModel);

        //Toggling paused restores state when animating forward
        viewModel.pauseViewModel.command();

        verifyForwardState(viewModel);

        //Executing paused command restores paused state
        viewModel.pauseViewModel.command();

        verifyPausedState(viewModel);

        //Setting the multiplier to negative and unpausing animates backward
        clockViewModel.multiplier = -1;
        viewModel.pauseViewModel.command();

        verifyReverseState(viewModel);
    });

    it('animating forwards negates the multiplier if it is negative', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        var multiplier = -100;
        clockViewModel.multiplier = multiplier;
        viewModel.playForwardViewModel.command();
        expect(clockViewModel.multiplier).toEqual(-multiplier);
    });

    it('animating backwards negates the multiplier if it is positive', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        var multiplier = 100;
        clockViewModel.multiplier = multiplier;
        viewModel.playReverseViewModel.command();
        expect(clockViewModel.multiplier).toEqual(-multiplier);
    });

    it('animating backwards pauses with a bounded startTime', function() {
        var centerTime = JulianDate.fromIso8601("2012-01-01T12:00:00");

        clockViewModel.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clockViewModel.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.currentTime = centerTime;
        clockViewModel.shouldAnimate = false;

        var viewModel = new AnimationViewModel(clockViewModel);
        verifyPausedState(viewModel);

        //Play in reverse while clamped
        clockViewModel.multiplier = -1;
        clockViewModel.clockRange = ClockRange.CLAMPED;
        viewModel.playReverseViewModel.command();

        verifyReverseState(viewModel);

        //Set current time to start time
        clockViewModel.currentTime = clockViewModel.startTime;

        //Should now be paused
        verifyPausedState(viewModel);

        //Animate in reverse again.
        clockViewModel.currentTime = centerTime;
        clockViewModel.clockRange = ClockRange.LOOP_STOP;
        viewModel.playReverseViewModel.command();

        verifyReverseState(viewModel);

        //Set current time to start time
        clockViewModel.currentTime = clockViewModel.startTime;

        //Should now be paused
        verifyPausedState(viewModel);

        //Reversing in start state while bounded should have no effect
        viewModel.playReverseViewModel.command();
        verifyPausedState(viewModel);

        //Set to unbounded and reversing should be okay
        clockViewModel.clockRange = ClockRange.UNBOUNDED;
        viewModel.playReverseViewModel.command();
        verifyReverseState(viewModel);
    });

    it('dragging shuttle ring does not pause with bounded start or stop Time', function() {
        var centerTime = JulianDate.fromIso8601("2012-01-01T12:00:00");

        clockViewModel.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clockViewModel.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.clockRange = ClockRange.CLAMPED;
        clockViewModel.multiplier = 1;

        var viewModel = new AnimationViewModel(clockViewModel);
        verifyPausedState(viewModel);

        //Play forward while clamped
        clockViewModel.currentTime = centerTime;
        viewModel.playForwardViewModel.command();
        verifyForwardState(viewModel);

        //Set current time to stop time, which won't stop while dragging
        viewModel.shuttleRingDragging = true;
        clockViewModel.currentTime = clockViewModel.stopTime;
        verifyForwardState(viewModel);

        //Drag complete stops.
        viewModel.shuttleRingDragging = false;
        verifyPausedState(viewModel);

        //Do the same thing with start time
        clockViewModel.currentTime = centerTime;
        viewModel.playReverseViewModel.command();
        verifyReverseState(viewModel);

        viewModel.shuttleRingDragging = true;
        clockViewModel.currentTime = clockViewModel.startTime;
        verifyReverseState(viewModel);

        //Drag complete stops.
        viewModel.shuttleRingDragging = false;
        verifyPausedState(viewModel);
    });

    it('animating forward pauses with a bounded stopTime', function() {
        var centerTime = JulianDate.fromIso8601("2012-01-01T12:00:00");

        clockViewModel.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clockViewModel.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.currentTime = centerTime;
        clockViewModel.shouldAnimate = false;

        var viewModel = new AnimationViewModel(clockViewModel);
        verifyPausedState(viewModel);

        //Play forward while clamped
        clockViewModel.multiplier = 1;
        clockViewModel.clockRange = ClockRange.CLAMPED;
        viewModel.playForwardViewModel.command();

        verifyForwardState(viewModel);

        //Set current time to stop time
        clockViewModel.currentTime = clockViewModel.stopTime;

        //Should now be paused
        verifyPausedState(viewModel);

        //Playing in stop state while bounded should have no effect
        viewModel.playForwardViewModel.command();
        verifyPausedState(viewModel);

        //Set to unbounded and playing should be okay
        clockViewModel.clockRange = ClockRange.UNBOUNDED;
        viewModel.playForwardViewModel.command();
        verifyForwardState(viewModel);
    });

    it('slower has no effect if at the slowest speed', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        viewModel.setShuttleRingTicks([0.0, 1.0, 2.0]);
        var slowestMultiplier = -2;
        clockViewModel.multiplier = slowestMultiplier;
        viewModel.slower();
        expect(clockViewModel.multiplier).toEqual(slowestMultiplier);
    });

    it('faster has no effect if at the faster speed', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        viewModel.setShuttleRingTicks([0.0, 1.0, 2.0]);
        var fastestMultiplier = 2;
        clockViewModel.multiplier = fastestMultiplier;
        viewModel.faster();
        expect(clockViewModel.multiplier).toEqual(fastestMultiplier);
    });

    it('slower and faster cycle through defined multipliers', function() {
        var viewModel = new AnimationViewModel(clockViewModel);

        var i = 0;
        var multipliers = viewModel.getShuttleRingTicks();
        var length = multipliers.length;

        //Start at slowest speed
        clockViewModel.multiplier = multipliers[0];

        //Cycle through them all with faster
        for (i = 1; i < length; i++) {
            viewModel.faster();
            expect(clockViewModel.multiplier).toEqual(multipliers[i]);
        }

        //We should be at the fastest time now.
        expect(clockViewModel.multiplier).toEqual(multipliers[length - 1]);

        //Cycle through them all with slower
        for (i = length - 2; i >= 0; i--) {
            viewModel.slower();
            expect(clockViewModel.multiplier).toEqual(multipliers[i]);
        }

        //We should be at the slowest time now.
        expect(clockViewModel.multiplier).toEqual(multipliers[0]);
    });

    it('Realtime canExecute and tooltip depends on clock settings', function() {
        var viewModel = new AnimationViewModel(clockViewModel);

        //UNBOUNDED but available when start/stop time does not include realtime
        clockViewModel.systemTime = JulianDate.now();
        clockViewModel.clockRange = ClockRange.UNBOUNDED;
        clockViewModel.startTime = JulianDate.addSeconds(clockViewModel.systemTime, -60, new JulianDate());
        clockViewModel.stopTime = JulianDate.addSeconds(clockViewModel.systemTime, -30, new JulianDate());
        expect(viewModel.playRealtimeViewModel.command.canExecute).toEqual(true);
        expect(viewModel.playRealtimeViewModel.tooltip).toEqual('Today (real-time)');

        //CLAMPED but unavailable when start/stop time does not include realtime
        clockViewModel.clockRange = ClockRange.CLAMPED;
        clockViewModel.startTime = JulianDate.addSeconds(clockViewModel.systemTime, -60, new JulianDate());
        clockViewModel.stopTime = JulianDate.addSeconds(clockViewModel.systemTime, -30, new JulianDate());
        expect(viewModel.playRealtimeViewModel.command.canExecute).toEqual(false);
        expect(viewModel.playRealtimeViewModel.tooltip).toEqual('Current time not in range');

        //CLAMPED but available when start/stop time includes realtime
        clockViewModel.clockRange = ClockRange.CLAMPED;
        clockViewModel.startTime = JulianDate.addSeconds(clockViewModel.systemTime, -60, new JulianDate());
        clockViewModel.stopTime = JulianDate.addSeconds(clockViewModel.systemTime, 60, new JulianDate());
        expect(viewModel.playRealtimeViewModel.command.canExecute).toEqual(true);
        expect(viewModel.playRealtimeViewModel.tooltip).toEqual('Today (real-time)');

        //LOOP_STOP but unavailable when start/stop time does not include realtime
        clockViewModel.clockRange = ClockRange.LOOP_STOP;
        clockViewModel.startTime = JulianDate.addSeconds(clockViewModel.systemTime, -60, new JulianDate());
        clockViewModel.stopTime = JulianDate.addSeconds(clockViewModel.systemTime, -30, new JulianDate());
        expect(viewModel.playRealtimeViewModel.command.canExecute).toEqual(false);
        expect(viewModel.playRealtimeViewModel.tooltip).toEqual('Current time not in range');

        //LOOP_STOP but available when start/stop time includes realtime
        clockViewModel.clockRange = ClockRange.LOOP_STOP;
        clockViewModel.startTime = JulianDate.addSeconds(clockViewModel.systemTime, -60, new JulianDate());
        clockViewModel.stopTime = JulianDate.addSeconds(clockViewModel.systemTime, 60, new JulianDate());
        expect(viewModel.playRealtimeViewModel.command.canExecute).toEqual(true);
        expect(viewModel.playRealtimeViewModel.tooltip).toEqual('Today (real-time)');
    });

    it('User action breaks out of realtime mode', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        clockViewModel.clockStep = ClockStep.TICK_DEPENDENT;
        clockViewModel.clockRange = ClockRange.UNBOUNDED;

        viewModel.playRealtimeViewModel.command();
        verifyRealtimeState(viewModel);
        expect(clockViewModel.multiplier).toEqual(1);

        //Pausing breaks realtime state
        viewModel.pauseViewModel.command();
        verifyPausedState(viewModel);
        expect(clockViewModel.multiplier).toEqual(1);

        viewModel.playRealtimeViewModel.command();
        verifyRealtimeState(viewModel);

        //Reverse breaks realtime state
        viewModel.playReverseViewModel.command();
        verifyReverseState(viewModel);
        expect(clockViewModel.multiplier).toEqual(-1);

        viewModel.playRealtimeViewModel.command();
        verifyRealtimeState(viewModel);

        //Play breaks realtime state
        viewModel.playForwardViewModel.command();
        verifyForwardState(viewModel);
        expect(clockViewModel.multiplier).toEqual(1);

        viewModel.playRealtimeViewModel.command();
        verifyRealtimeState(viewModel);

        //Shuttle ring change breaks realtime state
        viewModel.shuttleRingAngle = viewModel.shuttleRingAngle + 1;
        verifyForwardState(viewModel);
    });

    it('real time mode toggles only if shouldAnimate is true', function() {
        var viewModel = new AnimationViewModel(clockViewModel);

        viewModel.playRealtimeViewModel.command();
        verifyRealtimeState(viewModel);

        clockViewModel.shouldAnimate = false;
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(false);

        clockViewModel.shouldAnimate = true;
        expect(viewModel.playRealtimeViewModel.toggled).toEqual(true);
    });

    it('Shuttle ring angles set expected multipliers', function() {
        var viewModel = new AnimationViewModel(clockViewModel);

        var shuttleRingTicks = viewModel.getShuttleRingTicks();
        var maxMultiplier = shuttleRingTicks[shuttleRingTicks.length - 1];
        var minMultiplier = -maxMultiplier;

        //Max angle should produce max speed
        viewModel.shuttleRingAngle = AnimationViewModel._maxShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(maxMultiplier);

        //Min angle should produce min speed
        viewModel.shuttleRingAngle = -AnimationViewModel._maxShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(minMultiplier);

        //AnimationViewModel._realtimeShuttleRingAngle degrees is always 1x
        viewModel.shuttleRingAngle = AnimationViewModel._realtimeShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(1);

        viewModel.shuttleRingAngle = -AnimationViewModel._realtimeShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(-1);

        //For large values, the shuttleRingAngle should always round to the first two digits.
        viewModel.shuttleRingAngle = 45.0;
        expect(clockViewModel.multiplier).toEqual(85.0);

        viewModel.shuttleRingAngle = -90.0;
        expect(clockViewModel.multiplier).toEqual(-66000.0);

        viewModel.shuttleRingAngle = 0.0;
        expect(clockViewModel.multiplier).toEqual(0.0);
    });

    it('Shuttle ring angles set expected multipliers when snapping to ticks', function() {
        var viewModel = new AnimationViewModel(clockViewModel);
        viewModel.snapToTicks = true;

        var shuttleRingTicks = viewModel.getShuttleRingTicks();
        var maxMultiplier = shuttleRingTicks[shuttleRingTicks.length - 1];
        var minMultiplier = -maxMultiplier;

        //Max angle should produce max speed
        viewModel.shuttleRingAngle = AnimationViewModel._maxShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(maxMultiplier);

        //Min angle should produce min speed
        viewModel.shuttleRingAngle = -AnimationViewModel._maxShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(minMultiplier);

        //AnimationViewModel._realtimeShuttleRingAngle degrees is always 1x
        viewModel.shuttleRingAngle = AnimationViewModel._realtimeShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(1);

        viewModel.shuttleRingAngle = -AnimationViewModel._realtimeShuttleRingAngle;
        expect(clockViewModel.multiplier).toEqual(-1);

        //For large values, the shuttleRingAngle should always round to the first two digits.
        viewModel.shuttleRingAngle = 45.0;
        expect(clockViewModel.multiplier).toEqual(120.0);

        viewModel.shuttleRingAngle = -90.0;
        expect(clockViewModel.multiplier).toEqual(-43200.0);

        viewModel.shuttleRingAngle = 0.0;
        expect(clockViewModel.multiplier).toEqual(AnimationViewModel.defaultTicks[0]);
    });

    it('throws when constructed without arguments', function() {
        expect(function() {
            return new AnimationViewModel();
        }).toThrowDeveloperError();
    });

    it('setting timeFormatter throws with non-function', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        expect(function() {
            animationViewModel.timeFormatter = {};
        }).toThrowDeveloperError();
    });

    it('setting dateFormatter throws with non-function', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        expect(function() {
            animationViewModel.dateFormatter = {};
        }).toThrowDeveloperError();
    });

    it('setting shuttleRingTicks throws with undefined', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        expect(function() {
            animationViewModel.setShuttleRingTicks(undefined);
        }).toThrowDeveloperError();
    });

    it('returns a copy of shuttleRingTicks when getting', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        var originalTicks = [0.0, 1.0, 2.0];
        animationViewModel.setShuttleRingTicks(originalTicks);

        var ticks = animationViewModel.getShuttleRingTicks(ticks);
        ticks.push(99);
        ticks[0] = -99;
        expect(animationViewModel.getShuttleRingTicks()).toEqual(originalTicks);
    });

    it('sorts shuttleRingTicks when setting', function() {
        var animationViewModel = new AnimationViewModel(clockViewModel);
        var ticks = [4.0, 0.0, 8.0, 2.0];

        animationViewModel.setShuttleRingTicks(ticks);
        expect(animationViewModel.getShuttleRingTicks()).toEqual([0.0, 2.0, 4.0, 8.0]);
    });
});