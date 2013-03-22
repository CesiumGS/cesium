/*global document,window,define*/
define(['dojo',
        'dijit/dijit',
        'Core/Clock',
        'Core/ClockRange',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/requestAnimationFrame',
        'Widgets/Animation/Animation',
        'Widgets/ClockViewModel',
        'Widgets/Animation/AnimationViewModel',
        'Widgets/Timeline/Timeline'
    ], function(
         dojo,
         dijit,
         Clock,
         ClockRange,
         Color,
         JulianDate,
         TimeInterval,
         requestAnimationFrame,
         Animation,
         ClockViewModel,
         AnimationViewModel,
         Timeline) {
    "use strict";

    var startDatePart, endDatePart, startTimePart, endTimePart;
    var timeline, clock, endBeforeStart, containerElement, animationViewModel, animation;

    function updateScrubTime(julianDate) {
        document.getElementById('mousePos').innerHTML = timeline.makeLabel(julianDate) + ' UTC';
    }

    function handleSetTime(e) {
        if (typeof timeline !== 'undefined') {
            var scrubJulian = e.timeJulian;
            clock.shouldAnimate = false;
            clock.currentTime = scrubJulian;
            updateScrubTime(scrubJulian);
        }
    }

    function spanToString(span) {
        var spanUnits = 'sec';
        if (span > 31536000) {
            span /= 31536000;
            spanUnits = 'years';
        } else if (span > 2592000) {
            span /= 2592000;
            spanUnits = 'months';
        } else if (span > 604800) {
            span /= 604800;
            spanUnits = 'weeks';
        } else if (span > 86400) {
            span /= 86400;
            spanUnits = 'days';
        } else if (span > 3600) {
            span /= 3600;
            spanUnits = 'hours';
        } else if (span > 60) {
            span /= 60;
            spanUnits = 'minutes';
        }
        return span.toString() + ' ' + spanUnits;
    }

    function handleSetZoom(e) {
        dojo.byId('formatted').innerHTML =
            //'<br/>Epoch: ' + timeline.makeLabel(e.epochJulian) + ' UTC' +
            '<br/>Start: ' + timeline.makeLabel(e.startJulian) + ' UTC' +
            '<br/>&nbsp;Stop: ' + timeline.makeLabel(e.endJulian) + ' UTC' +
            '<br/>&nbsp;Span: ' + spanToString(e.totalSpan) +
            '<br/>&nbsp;&nbsp;Tic: ' + spanToString(e.mainTicSpan);
        updateScrubTime(clock.currentTime);
    }

    function makeTimeline(startJulian, scrubJulian, endJulian) {
        clock = new Clock({
            startTime : startJulian,
            currentTime : scrubJulian,
            stopTime : endJulian,
            clockRange : ClockRange.LOOP_STOP,
            multiplier : 60,
            shouldAnimate : true
        });

        timeline = new Timeline('time1', clock);
        timeline.addEventListener('settime', handleSetTime, false);
        timeline.addEventListener('setzoom', handleSetZoom, false);

        timeline.addTrack(new TimeInterval(startJulian, startJulian.addSeconds(60 * 60)), 8, Color.RED, new Color(0.55, 0.55, 0.55, 0.25));
        timeline.addTrack(new TimeInterval(endJulian.addSeconds(-60 * 60), endJulian), 8, Color.LIME);
        var middle = startJulian.getSecondsDifference(endJulian) / 4;
        timeline.addTrack(new TimeInterval(startJulian.addSeconds(middle), startJulian.addSeconds(middle * 3)), 8, Color.DEEPSKYBLUE, new Color(0.55, 0.55, 0.55, 0.25));

        var clockViewModel = new ClockViewModel(clock);
        animationViewModel = new AnimationViewModel(clockViewModel);
        animation = new Animation(dojo.byId('animationWidget'), animationViewModel);

        function tick() {
            var time = clock.tick();
            updateScrubTime(time);
            requestAnimationFrame(tick);
        }
        tick();
    }

    // Adjust start/end dates in reaction to any calendar/time clicks
    //
    function newDatesSelected() {
        var startJulian, endJulian;

        if (startDatePart && startTimePart) {
            startJulian = JulianDate.fromIso8601(startDatePart + startTimePart + 'Z'); // + 'Z' for UTC
        }
        if (endDatePart && endTimePart) {
            endJulian = JulianDate.fromIso8601(endDatePart + endTimePart + 'Z');
        }

        if (startJulian && endJulian) {
            if (startJulian.getSecondsDifference(endJulian) < 0.1) {
                endBeforeStart.style.display = 'block';
                containerElement.style.visibility = 'hidden';
            } else {
                endBeforeStart.style.display = 'none';
                containerElement.style.visibility = 'visible';
                if (!timeline) {
                    makeTimeline(startJulian, startJulian, endJulian);
                }
                clock.startTime = startJulian;
                clock.stopTime = endJulian;
                timeline.zoomTo(startJulian, endJulian);
            }
        }
    }

    // React to calendar date clicks
    //
    function newStartDateSelected(newDate) {
        startDatePart = dojo.date.stamp.toISOString(newDate, {
            selector : 'date'
        });
        newDatesSelected();
    }
    function newEndDateSelected(newDate) {
        endDatePart = dojo.date.stamp.toISOString(newDate, {
            selector : 'date'
        });
        newDatesSelected();
    }

    // React to time-of-day selectors
    //
    function getTimePart(newTime) {
        var h = newTime.getHours().toString();
        h = (h.length < 2) ? ('0' + h) : h;
        var m = newTime.getMinutes().toString();
        m = (m.length < 2) ? ('0' + m) : m;
        var s = newTime.getSeconds().toString();
        s = (s.length < 2) ? ('0' + s) : s;
        return 'T' + h + ':' + m + ':' + s;
    }
    function newStartTimeSelected(newTime) {
        startTimePart = getTimePart(newTime);
        newDatesSelected();
    }
    function newEndTimeSelected(newTime) {
        endTimePart = getTimePart(newTime);
        newDatesSelected();
    }

    // React to theme changes
    //
    function setThemeLighter() {
        document.body.className = 'claro cesium-lighter';
        dijit.byId('themeSelector').set('label', 'Theme: Lighter');
        animation.applyThemeChanges();
    }
    function setThemeDarker() {
        document.body.className = 'claro';
        dijit.byId('themeSelector').set('label', 'Theme: Darker');
        animation.applyThemeChanges();
    }
    function cycleTheme() {
        if (document.body.className === 'claro') {
            setThemeLighter();
        } else {
            setThemeDarker();
        }
    }

    dojo.ready(function() {
        endBeforeStart = document.getElementById('endBeforeStart');
        containerElement = document.getElementById('timelineAndAnimation');
        dojo.connect(dijit.byId('startCal'), 'onChange', newStartDateSelected);
        dojo.connect(dijit.byId('endCal'), 'onChange', newEndDateSelected);
        dojo.connect(dijit.byId('startTimeSel'), 'onChange', newStartTimeSelected);
        dojo.connect(dijit.byId('endTimeSel'), 'onChange', newEndTimeSelected);

        dojo.connect(dijit.byId('themeSelector'), 'onClick', cycleTheme);
        dojo.connect(dijit.byId('themeLighter'), 'onClick', setThemeLighter);
        dojo.connect(dijit.byId('themeDarker'), 'onClick', setThemeDarker);

        dijit.byId('startTimeSel').set('value', 'T00:00:00');
        dijit.byId('endTimeSel').set('value', 'T24:00:00');

        var today = new JulianDate();
        var tomorrow = today.addDays(1);
        dijit.byId('startCal').set('value', today.toDate());
        dijit.byId('endCal').set('value', tomorrow.toDate());
    });
});
