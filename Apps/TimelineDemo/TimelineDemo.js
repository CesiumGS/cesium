/*global document,window,define*/
define(['dojo',
        'dijit/dijit',
        'Core/Clock',
        'Timeline/Timeline',
        'Core/JulianDate'
    ], function(
         dojo,
         dijit,
         Clock,
         Timeline,
         JulianDate) {
    "use strict";

    var startDatePart, endDatePart, startTimePart, endTimePart;
    var timeline, clock;

    function handleSetTime(e) {
        var scrubJulian = e.timeJulian;
        var date = scrubJulian.toDate();
        document.getElementById("mousePos").innerHTML = "<br/>" + timeline.makeLabel(date) + "<br/>" + date.toUTCString() + "<br/>" + date.toString() + "<br/>" + dojo.date.stamp.toISOString(date) +
                "<br/>" + scrubJulian.getTotalDays();
        // dojo.date.locale.format(date, {formatLength: 'full'});
    }

    function handleSetZoom(e) {
        dojo.byId("formatted").innerHTML = "<br/>" + e.startJulian.toDate().toUTCString() + "<br/>" + e.endJulian.toDate().toUTCString();

        var span = timeline._timeBarSecondsSpan, spanUnits = "sec";
        if (span > 31536000) {
            span /= 31536000;
            spanUnits = "years";
        } else if (span > 2592000) {
            span /= 2592000;
            spanUnits = "months";
        } else if (span > 604800) {
            span /= 604800;
            spanUnits = "weeks";
        } else if (span > 86400) {
            span /= 86400;
            spanUnits = "days";
        } else if (span > 3600) {
            span /= 3600;
            spanUnits = "hours";
        } else if (span > 60) {
            span /= 60;
            spanUnits = "minutes";
        }

        dojo.byId("julian").innerHTML = "<br/>start=" + e.startJulian.getTotalDays() + "<br/>&nbsp; end=" + e.endJulian.getTotalDays() + "<br/><br/>span = " + span + " " + spanUnits +
                "<br/>&nbsp; &nbsp; &nbsp; &nbsp;" + timeline._timeBarSecondsSpan + " sec";
    }

    function makeTimeline(startJulian, scrubJulian, endJulian) {
        clock = new Clock(startJulian, endJulian);

        timeline = new Timeline("time1", clock);
        timeline.addEventListener('settime', handleSetTime, false);
        timeline.addEventListener('setzoom', handleSetZoom, false);

        timeline.addTrack('#ff8888', 8);
        timeline.addTrack('#88ff88', 8);
        timeline.addTrack('#8888ff', 8);
    }

    // Adjust start/end dates in reaction to any calendar/time clicks
    //
    function newDatesSelected() {
        var startJulian, endJulian, startDate, endDate;

        if (startDatePart && startTimePart) {
            startDate = dojo.date.stamp.fromISOString(startDatePart + startTimePart + 'Z'); // + 'Z' for UTC
            startJulian = new JulianDate.fromDate(startDate);
        }
        if (endDatePart && endTimePart) {
            endDate = dojo.date.stamp.fromISOString(endDatePart + endTimePart + 'Z');
            endJulian = new JulianDate.fromDate(endDate);
        }

        if (startJulian && endJulian) {
            if (!timeline) {
                makeTimeline(startJulian, startJulian, endJulian);
                handleSetZoom({
                    'startJulian' : startJulian,
                    'endJulian' : endJulian
                });
            } else {
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
    function newStartTimeSelected(newTime) {
        startTimePart = newTime.toString().replace(/.*1970\s(\S+).*/, 'T$1');
        newDatesSelected();
    }
    function newEndTimeSelected(newTime) {
        endTimePart = newTime.toString().replace(/.*1970\s(\S+).*/, 'T$1');
        newDatesSelected();
    }

    function testThings() {
        //var testDate = new JulianDate(new Date);
        //console.log(testDate);

        dojo.connect(dijit.byId("startCal"), "onChange", newStartDateSelected);
        dojo.connect(dijit.byId("endCal"), "onChange", newEndDateSelected);
        dojo.connect(dijit.byId("startTimeSel"), "onChange", newStartTimeSelected);
        dojo.connect(dijit.byId("endTimeSel"), "onChange", newEndTimeSelected);

        dijit.byId("startTimeSel").set('value', "T12:00:00");
        dijit.byId("endTimeSel").set('value', "T12:00:00");
        dijit.byId("startCal").set('value', "2010-08-12");
        dijit.byId("endCal").set('value', "2011-08-12");
    }

    dojo.ready(testThings);
});
