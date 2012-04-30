defineSuite(['Core/JulianDate', 'Core/TimeStandard', 'Core/TimeConstants', 'Core/Math'], function(JulianDate, TimeStandard, TimeConstants, CesiumMath) {
    "use strict";
    /*global it, xit, expect*/

    // All exact Julian Dates found using NASA's Time Conversion Tool: http://ssd.jpl.nasa.gov/tc.cgi
    it("Construct a default date", function() {
        // FIXME Default constructing a date uses "now".  Unfortunately,
        // there's no way to know exactly what that time will be, so we
        // give ourselves a 5 second epsilon as a hack to avoid possible
        // race conditions.  In reality, it might be better to just omit
        // a check in this test, since if this breaks, tons of other stuff
        // will as well.
        var defaultDate = new JulianDate();
        var dateNow = JulianDate.fromDate(new Date());
        expect(defaultDate.equalsEpsilon(dateNow, 5)).toBeTruthy();
    });

    it("Construct a date from basic components", function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(dayNumber);
        expect(julianDate.getSecondsOfDay()).toEqual(seconds);
        expect(julianDate.getTimeStandard()).toEqual(timeStandard);
    });

    it("Construct a date from basic components with more seconds than a day", function() {
        var dayNumber = 12;
        var seconds = 86401;
        var timeStandard = TimeStandard.UTC;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(13);
        expect(julianDate.getSecondsOfDay()).toEqual(1);
        expect(julianDate.getTimeStandard()).toEqual(timeStandard);
    });

    it("Construct a date from basic components with negative seconds in a day", function() {
        var dayNumber = 12;
        var seconds = -1;
        var timeStandard = TimeStandard.UTC;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(11);
        expect(julianDate.getSecondsOfDay()).toEqual(86399);
        expect(julianDate.getTimeStandard()).toEqual(timeStandard);
    });

    it("Construct a date from basic components with partial day and seconds in a day", function() {
        var dayNumber = 12.5;
        var seconds = -1;
        var timeStandard = TimeStandard.UTC;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(12);
        expect(julianDate.getSecondsOfDay()).toEqual(43199);
        expect(julianDate.getTimeStandard()).toEqual(timeStandard);
    });

    it("Construct a date with default time standard", function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var julianDate = new JulianDate(dayNumber, seconds);
        expect(julianDate.getJulianDayNumber()).toEqual(dayNumber);
        expect(julianDate.getSecondsOfDay()).toEqual(seconds);
        expect(julianDate.getTimeStandard()).toEqual(TimeStandard.UTC);
    });

    it("Fail to construct a date with invalid time standard.", function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = "invalid";
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with a null time standard.", function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = null;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with an undefined secondsOfDay.", function() {
        var dayNumber = 12;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, undefined, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with null secondsOfDay.", function() {
        var dayNumber = 12;
        var seconds = null;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with non-numerical secondsOfDay.", function() {
        var dayNumber = 12;
        var seconds = "not a number";
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with undefined day number.", function() {
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(undefined, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with null day number.", function() {
        var dayNumber = null;
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Fail to construct a date with non-numerical day number.", function() {
        var dayNumber = "not a number";
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it("Construct a date from a JavaScript Date (1).", function() {
        var date = new Date("January 1, 1991 06:00:00 UTC");
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2448257.75, CesiumMath.EPSILON5);
    });

    it("Construct a date from a JavaScript Date (2).", function() {
        var date = new Date("July 4, 2011 12:00:00 UTC");
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2455747.0, CesiumMath.EPSILON5);
    });

    it("Construct a date from a JavaScript Date (3).", function() {
        var date = new Date("December 31, 2021 18:00:00 UTC");
        var julianDate = JulianDate.fromDate(date);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2459580.25, CesiumMath.EPSILON5);
    });

    it("Construct a date from a JavaScript Date (4).", function() {
        var jsDate = new Date("September 1, 2011 12:00:00 UTC");
        var julianDate = JulianDate.fromDate(jsDate);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2455806.0, CesiumMath.EPSILON5);
    });

    it("Construct a date from a JavaScript Date in different TimeStandard.", function() {
        var taiDate = new Date("September 1, 2011 12:00:00");
        var taiJulianDate = JulianDate.fromDate(taiDate, TimeStandard.TAI);

        var utcDate = new Date("September 1, 2011 11:59:26");
        var utcJulianDate = JulianDate.fromDate(utcDate, TimeStandard.UTC);

        expect(taiJulianDate.equalsEpsilon(utcJulianDate, CesiumMath.EPSILON20)).toBeTruthy();
    });

    it("Fail to construct from an undefined JavaScript Date.", function() {
        expect(function() {
            return JulianDate.fromDate(undefined);
        }).toThrow();
    });

    it("Fail to construct from a null JavaScript Date.", function() {
        expect(function() {
            return JulianDate.fromDate(null);
        }).toThrow();
    });

    it("Fail to construct from an invalid JavaScript Date.", function() {
        expect(function() {
            return JulianDate.fromDate(new Date(Date.parse("garbage")));
        }).toThrow();
    });

    it("Fail to construct from a non-date JavaScript Date.", function() {
        expect(function() {
            return JulianDate.fromDate(0);
        }).toThrow();
    });

    it("Fail to construct from a JavaScript Date with null time standard.", function() {
        expect(function() {
            return JulianDate.fromDate(new Date(), null);
        }).toThrow();
    });

    it("Fail to construct from a JavaScript Date with invalid time standard.", function() {
        expect(function() {
            return JulianDate.fromDate(new Date(), "invalid");
        }).toThrow();
    });

    it("Construct a date from total days (1).", function() {
        var julianDate = JulianDate.fromTotalDays(2448257.75, TimeStandard.UTC);
        expect(julianDate.equals(JulianDate.fromDate(new Date("January 1, 1991 06:00:00 UTC")))).toBeTruthy();
    });

    it("Construct a date from total days (2).", function() {
        var julianDate = JulianDate.fromTotalDays(2455747.0, TimeStandard.UTC);
        expect(julianDate.equals(JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC")))).toBeTruthy();
    });

    it("Construct a date from total days (3).", function() {
        var julianDate = JulianDate.fromTotalDays(2459580.25, TimeStandard.UTC);
        expect(julianDate.equals(JulianDate.fromDate(new Date("December 31, 2021 18:00:00 UTC")))).toBeTruthy();
    });

    it("Construct a date from total days with different time standards.", function() {
        var julianDate = JulianDate.fromTotalDays(2455806, TimeStandard.TAI);
        expect(julianDate.equals(JulianDate.fromDate(new Date("September 1, 2011 12:00:00 UTC"), TimeStandard.TAI))).toBeTruthy();
    });

    it("Fail to construct from non-numeric total days.", function() {
        expect(function() {
            return JulianDate.fromTotalDays("not a number", TimeStandard.UTC);
        }).toThrow();
    });

    it("Fail to construct from null total days.", function() {
        expect(function() {
            return JulianDate.fromTotalDays(null, TimeStandard.UTC);
        }).toThrow();
    });

    it("Fail to construct from undefined total days.", function() {
        expect(function() {
            return JulianDate.fromTotalDays(undefined, TimeStandard.UTC);
        }).toThrow();
    });

    it("Fail to construct from total days with null time standard.", function() {
        expect(function() {
            return JulianDate.fromTotalDays(1234, null);
        }).toThrow();
    });

    it("Fail to construct from total days with invalid time standard.", function() {
        expect(function() {
            return JulianDate.fromTotalDays(1234, "invalid");
        }).toThrow();
    });

    it("Construct a date from ISO8601.", function() {
        var julianDate = JulianDate.fromIso8601("2009-01-01T00:00:00Z");
        expect(julianDate.equals(new JulianDate(2454832, 43234, TimeStandard.TAI))).toBeTruthy();
    });

    //FIXME JulianDate.fromIso8601 does not currently work for leap seconds.
    xit("Construct a date from ISO8601 on a leap second.", function() {
        var julianDate = JulianDate.fromIso8601("2008-12-31T23:59:60Z");
        expect(julianDate.equals(new JulianDate(2454832, 43233, TimeStandard.TAI))).toBeTruthy();
    });

    it("getJulianTimeFraction works.", function() {
        var seconds = 12345.678;
        var fraction = seconds / 86400.0;
        var julianDate = new JulianDate(0, seconds);
        expect(julianDate.getJulianTimeFraction()).toEqualEpsilon(fraction, CesiumMath.EPSILON20);
    });

    it("toDate works when constructed from total days", function() {
        var julianDate = JulianDate.fromTotalDays(2455770.9986087964, TimeStandard.UTC);
        var javascriptDate = julianDate.toDate();
        expect(javascriptDate.getUTCFullYear()).toEqual(2011);
        expect(javascriptDate.getUTCMonth()).toEqual(6);
        expect(javascriptDate.getUTCDate()).toEqual(28);
        expect(javascriptDate.getUTCHours()).toEqual(11);
        expect(javascriptDate.getUTCMinutes()).toEqual(57);
        expect(javascriptDate.getUTCSeconds()).toEqual(59);
        expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(800, 10);
    });

    it("toDate works when using TAI", function() {
        var julianDate = JulianDate.fromTotalDays(2455927.157772, TimeStandard.UTC);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDate);
        var javascriptDate = julianDateTai.toDate();
        expect(javascriptDate.getUTCFullYear()).toEqual(2011);
        expect(javascriptDate.getUTCMonth()).toEqual(11);
        expect(javascriptDate.getUTCDate()).toEqual(31);
        expect(javascriptDate.getUTCHours()).toEqual(15);
        expect(javascriptDate.getUTCMinutes()).toEqual(47);
        expect(javascriptDate.getUTCSeconds()).toEqual(11);
        expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(500, 10);
    });

    it("toDate works on a leap second", function() {
        var date = new JulianDate(2454832, 43233, TimeStandard.TAI).toDate();
        expect(date).toEqual(new Date("1/1/2009 12:00:00 AM UTC"));
    });

    it("getSecondsDifference works in UTC", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it("getSecondsDifference works in TAI", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        start = TimeStandard.convertUtcToTai(start);
        end = TimeStandard.convertUtcToTai(end);
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it("getSecondsDifference works with mixed time standards.", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        start = TimeStandard.convertUtcToTai(start);
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it("getMinutesDifference works in UTC", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it("getMinutesDifference works in TAI", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        start = TimeStandard.convertUtcToTai(start);
        end = TimeStandard.convertUtcToTai(end);
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it("getMinutesDifference works with mixed time standards.", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = JulianDate.fromDate(new Date("July 5, 2011 12:01:00 UTC"));
        end = TimeStandard.convertUtcToTai(end);
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it("addSeconds works with whole seconds", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:30 UTC"));
        var end = start.addSeconds(95);
        expect(end.toDate().getUTCSeconds()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(2, CesiumMath.EPSILON5);
    });

    it("addSeconds works with fractions (1)", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 23:59:59 UTC"));
        var end = start.addSeconds(1.5);
        expect(end.getTotalDays()).toEqualEpsilon(2455747.5000058, CesiumMath.EPSILON7);
    });

    it("addSeconds works with fractions (2)", function() {
        var start = JulianDate.fromDate(new Date("August 11 2011 6:00:00 UTC"));
        var end = start.addSeconds(0.5);
        expect(end.getTotalDays()).toEqualEpsilon(2455784.7500058, CesiumMath.EPSILON7);
    });

    it("addSeconds works with fractions (3)", function() {
        var start = JulianDate.fromDate(new Date("August 11 2011 11:59:59 UTC"));
        var end = start.addSeconds(1.25);
        expect(end.getTotalDays()).toEqualEpsilon(2455785.0000029, CesiumMath.EPSILON7);
    });

    it("addSeconds works with negative numbers", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:01:30 UTC"));
        var end = start.addSeconds(-60);
        expect(end.toDate().getUTCSeconds()).toEqualEpsilon(30, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(0, CesiumMath.EPSILON5);
    });

    it("addSeconds works with more seconds than in a day.", function() {
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = start.addSeconds(TimeConstants.SECONDS_PER_DAY * 7 + 15);
        expect(end.getJulianDayNumber()).toEqual(2448451);
        expect(end.getSecondsOfDay()).toEqual(15);
    });

    it("addSeconds works with negative seconds more than in a day.", function() {
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = start.addSeconds(-TimeConstants.SECONDS_PER_DAY * 7 - 15);
        expect(end.getJulianDayNumber()).toEqual(2448436);
        expect(end.getSecondsOfDay()).toEqual(TimeConstants.SECONDS_PER_DAY - 15);
    });

    it("addSeconds fails with non-numeric input.", function() {
        expect(function() {
            return new JulianDate().addSeconds("banana");
        }).toThrow();
    });

    it("addSeconds fails with null input.", function() {
        expect(function() {
            return new JulianDate().addSeconds(null);
        }).toThrow();
    });

    it("addSeconds fails with undefined input.", function() {
        expect(function() {
            return new JulianDate().addSeconds(undefined);
        }).toThrow();
    });
    it("addMinutes works", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addMinutes(65);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(13, CesiumMath.EPSILON5);
    });

    it("addMinutes works with negative numbers", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addMinutes(-35);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(25, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(11, CesiumMath.EPSILON5);
    });

    it("addMinutes fails with non-numeric input.", function() {
        expect(function() {
            return new JulianDate().addMinutes("banana");
        }).toThrow();
    });

    it("addMinutes fails with null input.", function() {
        expect(function() {
            return new JulianDate().addMinutes(null);
        }).toThrow();
    });

    it("addMinutes fails with undefined input.", function() {
        expect(function() {
            return new JulianDate().addMinutes(undefined);
        }).toThrow();
    });

    it("addHours works.", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addHours(6);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(18, CesiumMath.EPSILON5);
    });

    it("addHours works with negative numbers.", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addHours(-6);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(6, CesiumMath.EPSILON5);
    });

    it("addHours fails with non-numeric input.", function() {
        expect(function() {
            return new JulianDate().addHours("banana");
        }).toThrow();
    });

    it("addHours fails with null input.", function() {
        expect(function() {
            return new JulianDate().addHours(null);
        }).toThrow();
    });

    it("addHours fails with undefined input.", function() {
        expect(function() {
            return new JulianDate().addHours(undefined);
        }).toThrow();
    });

    it("addDays works", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addDays(32);
        expect(end.toDate().getUTCDate()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMonth()).toEqualEpsilon(7, CesiumMath.EPSILON5);
    });

    it("addDays works with negative numbers", function() {
        var start = JulianDate.fromDate(new Date("July 4, 2011 12:00:00 UTC"));
        var end = start.addDays(-4);
        expect(end.toDate().getUTCDate()).toEqualEpsilon(30, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMonth()).toEqualEpsilon(5, CesiumMath.EPSILON5);
    });

    it("addDays fails with non-numeric input.", function() {
        expect(function() {
            return new JulianDate().addDays("banana");
        }).toThrow();
    });

    it("addDays fails with null input.", function() {
        expect(function() {
            return new JulianDate().addDays(null);
        }).toThrow();
    });

    it("addDays fails with undefined input.", function() {
        expect(function() {
            return new JulianDate().addDays(undefined);
        }).toThrow();
    });

    it("toYearFraction works (1)", function() {
        var julianDate = JulianDate.fromDate(new Date("January 2, 2011 0:00:00 UTC"));
        var yearFraction = julianDate.toYearFraction();
        expect(yearFraction).toEqualEpsilon(1.0 / 365.0, CesiumMath.EPSILON10);
    });

    it("toYearFraction works (2)", function() {
        var julianDate = JulianDate.fromDate(new Date("January 1, 2011 18:00:00 UTC"));
        var yearFraction = julianDate.toYearFraction();
        expect(yearFraction).toEqualEpsilon(0.75 / 365.0, CesiumMath.EPSILON10);
    });

    it("toYearFraction works in leap years", function() {
        var julianDate = JulianDate.fromDate(new Date("January 2, 2012 0:00:00 UTC"));
        var yearFraction = julianDate.toYearFraction();
        expect(yearFraction).toEqualEpsilon(1.0 / 366.0, CesiumMath.EPSILON10);
    });

    it("lessThan works", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        var end = JulianDate.fromDate(new Date("July 6, 2011 12:01:00"));
        expect(start.lessThan(end)).toBeTruthy();
    });

    it("lessThan works with equal values", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        expect(start.lessThan(end)).toBeFalsy();
        expect(start.lessThan(end.addSeconds(1))).toBeTruthy();
    });

    it("lessThan works with different time standards", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"), TimeStandard.UTC);
        var end = JulianDate.fromDate(new Date("July 6, 2011 12:00:00"), TimeStandard.TAI);
        expect(start.lessThan(end)).toBeTruthy();
    });

    it("lessThanOrEquals works", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        expect(start.lessThanOrEquals(end)).toBeTruthy();
        expect(start.addSeconds(1).lessThanOrEquals(end)).toBeFalsy();
        expect(start.addSeconds(-1).lessThanOrEquals(end)).toBeTruthy();
    });

    it("lessThanOrEquals works with different time standards", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"), TimeStandard.UTC);
        var end = TimeStandard.convertUtcToTai(start);
        expect(start.lessThanOrEquals(end)).toBeTruthy();
        expect(start.addSeconds(1).lessThanOrEquals(end)).toBeFalsy();
        expect(start.addSeconds(-1).lessThanOrEquals(end)).toBeTruthy();
    });

    it("greaterThan works", function() {
        var start = JulianDate.fromDate(new Date("July 6, 2011 12:01:00"));
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        expect(start.greaterThan(end)).toBeTruthy();
    });

    it("greaterThan works with equal values", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        expect(start.greaterThan(end)).toBeFalsy();
        expect(start.greaterThan(end.addSeconds(-1))).toBeTruthy();
    });

    it("greaterThan works with different time standards", function() {
        var start = JulianDate.fromDate(new Date("July 6, 2011 12:01:00"), TimeStandard.TAI);
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"), TimeStandard.UTC);
        expect(start.greaterThan(end)).toBeTruthy();
    });

    it("greaterThanOrEquals works", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        var end = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"));
        expect(start.greaterThanOrEquals(end)).toBeTruthy();
        expect(start.addSeconds(-1).greaterThanOrEquals(end)).toBeFalsy();
        expect(start.addSeconds(1).greaterThanOrEquals(end)).toBeTruthy();
    });

    it("greaterThanOrEquals works with different time standards", function() {
        var start = JulianDate.fromDate(new Date("July 6, 1991 12:00:00"), TimeStandard.UTC);
        var end = TimeStandard.convertUtcToTai(start);
        expect(start.greaterThanOrEquals(end)).toBeTruthy();
        expect(start.addSeconds(-1).greaterThanOrEquals(end)).toBeFalsy();
        expect(start.addSeconds(1).greaterThanOrEquals(end)).toBeTruthy();
    });

    it("can be equal to within an epsilon of another JulianDate", function() {
        var original = JulianDate.fromDate(new Date("September 7, 2011 12:55:00 UTC"));
        var clone = JulianDate.fromDate(new Date("September 7, 2011 12:55:00 UTC"));
        clone = clone.addSeconds(1);
        expect(original.equalsEpsilon(clone, 2)).toBeTruthy();
    });

    it("getTotalDays works", function() {
        var totalDays = 2455784.7500058;
        var original = JulianDate.fromTotalDays(totalDays);
        expect(totalDays).toEqual(original.getTotalDays());
    });

    it("equalsEpsilon works", function() {
        var original = new JulianDate();
        var clone = JulianDate.fromDate(original.toDate());
        clone = clone.addSeconds(0.01);
        expect(original.equalsEpsilon(clone, CesiumMath.EPSILON1)).toBeTruthy();
    });

    it("getTaiMinusUtc works between TAI and UTC (1)", function() {
        var date = new Date("July 11, 2011 12:00:00 UTC");
        var jd = JulianDate.fromDate(date, TimeStandard.TAI);
        var difference = jd.getTaiMinusUtc();
        expect(difference).toEqual(34);
    });

    it("getTaiMinusUtc works between TAI and UTC (2)", function() {
        var date = new Date("July 11, 1979 12:00:00 UTC");
        var jd = JulianDate.fromDate(date, TimeStandard.TAI);
        var difference = jd.getTaiMinusUtc();
        expect(difference).toEqual(18);
    });

    it("getTaiMinusUtc works between TAI and UTC (3)", function() {
        var date = new Date("July 11, 1970 12:00:00 UTC");
        var jd = JulianDate.fromDate(date, TimeStandard.TAI);
        var difference = jd.getTaiMinusUtc();
        expect(difference).toEqual(10);
    });
});