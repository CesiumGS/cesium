(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    var TimeConstants = Cesium.TimeConstants;
    describe("JulianDate", function () {
        // All exact Julian Dates found using NASA's Time Conversion Tool: http://ssd.jpl.nasa.gov/tc.cgi

        it("correctly computes the Julian Date of a given js Date object (1)", function () {
            var date = new Date("January 1, 1991 06:00:00 UTC");
            var julianDate = new Cesium.JulianDate(date);
            expect(julianDate.getJulianDate()).toEqualEpsilon(2448257.75, Cesium.Math.EPSILON5);
        });

        it("correctly computes the Julian Date of a given js Date object (2)", function () {
            var date = new Date("July 4, 2011 12:00:00 UTC");
            var julianDate = new Cesium.JulianDate(date);
            expect(julianDate.getJulianDate()).toEqualEpsilon(2455747.0, Cesium.Math.EPSILON5);
        });

        it("correctly computes the Julian Date of a given js Date object (3)", function () {
            var date = new Date("December 31, 2021 18:00:00 UTC");
            var julianDate = new Cesium.JulianDate(date);
            expect(julianDate.getJulianDate()).toEqualEpsilon(2459580.25, Cesium.Math.EPSILON5);
        });

        it("correctly computes the Julian Date of a given js Date object (4)", function () {
            var jsDate = new Date("September 1, 2011 12:00:00 UTC");
            var julianDate = new Cesium.JulianDate(jsDate);
            expect(julianDate.getJulianDate()).toEqualEpsilon(2455806.0, Cesium.Math.EPSILON5);
        });

        it("can be constructed from a numerical Julian date (1)", function () {
            var julianDate = Cesium.JulianDate.createJulianDate(2448257.75, Cesium.TimeStandard.UTC);
            expect(julianDate.equals(new Cesium.JulianDate(new Date("January 1, 1991 06:00:00 UTC")))).toBeTruthy();
        });

        it("can be constructed from a numerical Julian date (2)", function () {
            var julianDate = Cesium.JulianDate.createJulianDate(2455747.0, Cesium.TimeStandard.UTC);
            expect(julianDate.equals(new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC")))).toBeTruthy();
        });

        it("can be constructed from a numerical Julian date (3)", function () {
            var julianDate = Cesium.JulianDate.createJulianDate(2459580.25, Cesium.TimeStandard.UTC);
            expect(julianDate.equals(new Cesium.JulianDate(new Date("December 31, 2021 18:00:00 UTC")))).toBeTruthy();
        });

        it("can be constructed from a numerical Julian date (4)", function () {
            var julianDate = Cesium.JulianDate.createJulianDate(2455806.0, Cesium.TimeStandard.UTC);
            expect(julianDate.equals(new Cesium.JulianDate(new Date("September 1, 2011 12:00:00 UTC")))).toBeTruthy();
        });

        it("throws an exception if created from a negative numerical Julian date", function () {
            expect(function () {
                return Cesium.JulianDate.createJulianDate(-500, Cesium.TimeStandard.UTC);
            }).toThrow();
        });

        it("throws an exception if createJulianDate is called with no argument", function () {
            expect(function() {
                return Cesium.JulianDate.createJulianDate(null);
            }).toThrow();
        });

        it("can be constructed from a Julian day number and seconds of day (1)", function () {
            var julianDate1 = new Cesium.JulianDate(2448257, 64800, Cesium.TimeStandard.UTC);
            var julianDate2 = new Cesium.JulianDate(new Date("January 1, 1991 06:00:00 UTC"));
            expect(julianDate1.equals(julianDate2)).toBeTruthy();
        });

        it("can be constructed from a Julian day number and seconds of day (2)", function () {
            var julianDate1 = new Cesium.JulianDate(2448257, 64800 + Cesium.TimeConstants.SECONDS_PER_DAY, Cesium.TimeStandard.UTC);
            var julianDate2 = new Cesium.JulianDate(new Date("January 2, 1991 06:00:00 UTC"));
            expect(julianDate1.equals(julianDate2)).toBeTruthy();
        });

        it("can be constructed from a Julian day number and seconds of day (3)", function () {
            var julianDate1 = new Cesium.JulianDate(2455747, 0, Cesium.TimeStandard.UTC);
            var julianDate2 = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            expect(julianDate1.equals(julianDate2)).toBeTruthy();
        });

        it("can be constructed from a Julian day number and seconds of day (4)", function () {
            var julianDate1 = new Cesium.JulianDate(2459580, 21600, Cesium.TimeStandard.UTC);
            var julianDate2 = new Cesium.JulianDate(new Date("December 31, 2021 18:00:00 UTC"));
            expect(julianDate1.equals(julianDate2)).toBeTruthy();
        });

        it("can be constructed from a Julian day number and seconds of day (5)", function () {
            var julianDate1 = new Cesium.JulianDate(2455806, 0, Cesium.TimeStandard.UTC);
            var julianDate2 = new Cesium.JulianDate(new Date("September 1, 2011 12:00:00 UTC"));
            expect(julianDate1.equals(julianDate2)).toBeTruthy();
        });

        it("can get the Julian Day Number", function () {
            var jsDate = new Date();        // September 1, 2011 @ 18:00 UTC
            jsDate.setUTCFullYear(2011, 8, 1);
            jsDate.setUTCHours(18, 0, 0, 0);
            var julianDate = new Cesium.JulianDate(jsDate);
            expect(julianDate.getJulianDayNumber()).toEqualEpsilon(2455806, Cesium.Math.EPSILON5);
        });

        it("can get the Julian time fraction", function () {
            var jsDate = new Date();        // Current date @ 18:00 UTC
            jsDate.setUTCHours(18, 0, 0, 0);
            var julianDate = new Cesium.JulianDate(jsDate);
            expect(julianDate.getJulianTimeFraction()).toEqualEpsilon(0.25, Cesium.Math.EPSILON5);
        });

        it("can return a Javascript Date object when constructed without one", function() {
            var julianDate = Cesium.JulianDate.createJulianDate(2455770.1437442, Cesium.TimeStandard.UTC);
            var javascriptDate = julianDate.getDate();
            expect(javascriptDate.getUTCFullYear()).toEqual(2011);
            expect(javascriptDate.getUTCMonth()).toEqual(6);
            expect(javascriptDate.getUTCDate()).toEqual(27);
            expect(javascriptDate.getUTCHours()).toEqual(15);
            expect(javascriptDate.getUTCMinutes()).toEqual(26);
            expect(javascriptDate.getUTCSeconds()).toEqual(59);
            expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(500, 10);
        });

        it("can return a Javascript Date object when constructed without one (2)", function() {
            var julianDate = Cesium.JulianDate.createJulianDate(2455770.9986087964, Cesium.TimeStandard.UTC);
            var javascriptDate = julianDate.getDate();
            expect(javascriptDate.getUTCFullYear()).toEqual(2011);
            expect(javascriptDate.getUTCMonth()).toEqual(6);
            expect(javascriptDate.getUTCDate()).toEqual(28);
            expect(javascriptDate.getUTCHours()).toEqual(11);
            expect(javascriptDate.getUTCMinutes()).toEqual(57);
            expect(javascriptDate.getUTCSeconds()).toEqual(59);
            expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(800, 10);
        });

        it("can return a Javascript Date object when constructed without one (TAI)", function() {
            var julianDate = Cesium.JulianDate.createJulianDate(2455927.157772, Cesium.TimeStandard.UTC);
            var julianDateTai = Cesium.TimeStandard.convertUtcToTai(julianDate);
            var javascriptDate = julianDateTai.getDate();
            expect(javascriptDate.getUTCFullYear()).toEqual(2011);
            expect(javascriptDate.getUTCMonth()).toEqual(11);
            expect(javascriptDate.getUTCDate()).toEqual(31);
            expect(javascriptDate.getUTCHours()).toEqual(15);
            expect(javascriptDate.getUTCMinutes()).toEqual(47);
            expect(javascriptDate.getUTCSeconds()).toEqual(11);
            expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(500, 10);
        });

        it("can report the number of seconds elapsed into the current day (1)", function () {
            var jsDate = new Date("July 4, 2011 12:00:00 UTC");
            var julianDate = new Cesium.JulianDate(jsDate);
            var totalSeconds = julianDate.getSecondsOfDay();
            expect(totalSeconds).toEqualEpsilon(0.0, Cesium.Math.EPSILON10);
        });

        it("can report the number of seconds elapsed into the current day (2)", function () {
            var jsDate = new Date("July 4, 2011 11:59:59 UTC");
            var julianDate = new Cesium.JulianDate(jsDate);
            var totalSeconds = julianDate.getSecondsOfDay();
            expect(totalSeconds).toEqualEpsilon(Cesium.TimeConstants.SECONDS_PER_DAY - 1.0, Cesium.Math.EPSILON5);
        });

        it("can find the difference between julian dates in seconds (UTC)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, Cesium.Math.EPSILON5);
        });

        it("can find the difference between julian dates in seconds (TAI)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            start = Cesium.TimeStandard.convertUtcToTai(start);
            end = Cesium.TimeStandard.convertUtcToTai(end);
            expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, Cesium.Math.EPSILON5);
        });

        it("can find the difference between julian dates in seconds (mixed time standards)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            start = Cesium.TimeStandard.convertUtcToTai(start);
            expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, Cesium.Math.EPSILON5);
        });

        it("can find the difference between julian dates in minutes (UTC)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, Cesium.Math.EPSILON5);
        });

         it("can find the difference between julian dates in minutes (TAI)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            start = Cesium.TimeStandard.convertUtcToTai(start);
            end = Cesium.TimeStandard.convertUtcToTai(end);
            expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, Cesium.Math.EPSILON5);
        });

        it("can find the difference between julian dates in minutes (mixed time standards)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = new Cesium.JulianDate(new Date("July 5, 2011 12:01:00 UTC"));
            end = Cesium.TimeStandard.convertUtcToTai(end);
            expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, Cesium.Math.EPSILON5);
        });

        it("can add seconds", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:30 UTC"));
            var end = start.addSeconds(95);
            expect(end.getDate().getUTCSeconds()).toEqualEpsilon(5, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCMinutes()).toEqualEpsilon(2, Cesium.Math.EPSILON5);
        });

        it("can add fractions of a second (1)", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 23:59:59 UTC"));
            var end = start.addSeconds(1.5);
            expect(end.getJulianDate()).toEqualEpsilon(2455747.5000058, Cesium.Math.EPSILON7);
        });

        it("can add fractions of a second (2)", function () {
            var start = new Cesium.JulianDate(new Date("August 11 2011 6:00:00 UTC"));
            var end = start.addSeconds(0.5);
            expect(end.getJulianDate()).toEqualEpsilon(2455784.7500058, Cesium.Math.EPSILON7);
        });

        it("can add fractions of a second (3)", function () {
            var start = new Cesium.JulianDate(new Date("August 11 2011 11:59:59 UTC"));
            var end = start.addSeconds(1.25);
            expect(end.getJulianDate()).toEqualEpsilon(2455785.0000029, Cesium.Math.EPSILON7);
        });

        it("can subtract seconds", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:01:30 UTC"));
            var end = start.addSeconds(-60);
            expect(end.getDate().getUTCSeconds()).toEqualEpsilon(30, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCMinutes()).toEqualEpsilon(0, Cesium.Math.EPSILON5);
        });

        it("can add minutes", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addMinutes(65);
            expect(end.getDate().getUTCMinutes()).toEqualEpsilon(5, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCHours()).toEqualEpsilon(13, Cesium.Math.EPSILON5);
        });

        it("can subtract minutes", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addMinutes(-35);
            expect(end.getDate().getUTCMinutes()).toEqualEpsilon(25, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCHours()).toEqualEpsilon(11, Cesium.Math.EPSILON5);
        });

        it("can add hours", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addHours(6);
            expect(end.getDate().getUTCHours()).toEqualEpsilon(18, Cesium.Math.EPSILON5);
        });

        it("can subtract hours", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addHours(-6);
            expect(end.getDate().getUTCHours()).toEqualEpsilon(6, Cesium.Math.EPSILON5);
        });

        it("can add seconds more than a day", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = start.addSeconds(TimeConstants.SECONDS_PER_DAY*7 + 15);
            expect(end.getJulianDayNumber()).toEqual(2448451);
            expect(end.getSecondsOfDay()).toEqual(15);
        });

        it("can subtract seconds more than a day", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = start.addSeconds(-TimeConstants.SECONDS_PER_DAY*7 - 15);
            expect(end.getJulianDayNumber()).toEqual(2448436);
            expect(end.getSecondsOfDay()).toEqual(TimeConstants.SECONDS_PER_DAY - 15);
        });

        it("can add days", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addDays(32);
            expect(end.getDate().getUTCDate()).toEqualEpsilon(5, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCMonth()).toEqualEpsilon(7, Cesium.Math.EPSILON5);
        });

        it("can subtract days", function () {
            var start = new Cesium.JulianDate(new Date("July 4, 2011 12:00:00 UTC"));
            var end = start.addDays(-4);
            expect(end.getDate().getUTCDate()).toEqualEpsilon(30, Cesium.Math.EPSILON5);
            expect(end.getDate().getUTCMonth()).toEqualEpsilon(5, Cesium.Math.EPSILON5);
        });

        it("can compute the year fraction (1)", function () {
            var julianDate = new Cesium.JulianDate(new Date("January 2, 2011 0:00:00 UTC"));
            var yearFraction = julianDate.toYearFraction();
            expect(yearFraction).toEqualEpsilon(1.0/365.0, Cesium.Math.EPSILON10);
        });

        it("can compute the year fraction (2)", function () {
            var julianDate = new Cesium.JulianDate(new Date("January 1, 2011 18:00:00 UTC"));
            var yearFraction = julianDate.toYearFraction();
            expect(yearFraction).toEqualEpsilon(0.75/365.0, Cesium.Math.EPSILON10);
        });

        it("can compute the year fraction during a leap year", function () {
            var julianDate = new Cesium.JulianDate(new Date("January 2, 2012 0:00:00 UTC"));
            var yearFraction = julianDate.toYearFraction();
            expect(yearFraction).toEqualEpsilon(1.0/366.0, Cesium.Math.EPSILON10);
        });

        it("can come before another JulianDate (constructed with a js Date object)", function () {
            var start = new Cesium.JulianDate(new Date("July 6, 1991 12:00:00"));
            var end = new Cesium.JulianDate(new Date("July 6, 2011 12:01:00"));
            expect(start.isBefore(end)).toBeTruthy();
        });

        it("can come before another JulianDate", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = new Cesium.JulianDate(2455749, 1, Cesium.TimeStandard.UTC);
            expect(start.isBefore(end)).toBeTruthy();
        });

        it("can not come before another JulianDate (constructed with a js Date object)", function () {
            var start = new Cesium.JulianDate(new Date("July 6, 1991 12:00:00"));
            var end = new Cesium.JulianDate(new Date("July 6, 2011 12:01:00"));
            expect(end.isBefore(start)).toBeFalsy();
        });

        it("can not come before another JulianDate", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = new Cesium.JulianDate(2455749, 1, Cesium.TimeStandard.UTC);
            expect(end.isBefore(start)).toBeFalsy();
        });

        it("can come after another JulianDate (constructed with a js Date object) ", function () {
            var start = new Cesium.JulianDate(new Date("July 6, 1991 12:00:00"));
            var end = new Cesium.JulianDate(new Date("July 6, 2011 12:01:00"));
            expect(end.isAfter(start)).toBeTruthy();
        });

        it("can come after another JulianDate ", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = new Cesium.JulianDate(2455749, 1, Cesium.TimeStandard.UTC);
            expect(end.isAfter(start)).toBeTruthy();
        });

        it("can not come after another JulianDate (constructed with a js Date object)", function () {
            var start = new Cesium.JulianDate(new Date("July 6, 1991 12:00:00"));
            var end = new Cesium.JulianDate(new Date("July 6, 2011 12:01:00"));
            expect(start.isAfter(end)).toBeFalsy();
        });

        it("can not come after another JulianDate", function () {
            var start = new Cesium.JulianDate(2448444, 0, Cesium.TimeStandard.UTC);
            var end = new Cesium.JulianDate(2455749, 1, Cesium.TimeStandard.UTC);
            expect(start.isAfter(end)).toBeFalsy();
        });

        it("can be equal to another JulianDate (constructed with a js Date object)", function () {
            var original = new Cesium.JulianDate(new Date("September 7, 2011 12:55:00 UTC"));
            var clone = new Cesium.JulianDate(new Date("September 7, 2011 12:55:00 UTC"));
            expect(original.equals(clone)).toBeTruthy();
        });

        it("can be equal to within an epsilon of another JulianDate", function() {
            var original = new Cesium.JulianDate(new Date("September 7, 2011 12:55:00 UTC"));
            var clone = new Cesium.JulianDate(new Date("September 7, 2011 12:55:00 UTC"));
            clone = clone.addSeconds(1);
            expect(original.equalsEpsilon(clone, 2)).toBeTruthy();
        });

        it("can be equal to within a fraction of a second of another JulianDate", function() {
            var original = new Cesium.JulianDate();
            var clone = new Cesium.JulianDate(original.getDate());
            clone = clone.addSeconds(0.01);
            expect(original.equalsEpsilon(clone, Cesium.Math.EPSILON1)).toBeTruthy();
        });

        it("can find the difference between TAI and UTC (1)", function () {
            var date = new Date("July 11, 2011 12:00:00 UTC");
            var jd = new Cesium.JulianDate(date, Cesium.TimeStandard.TAI);
            var difference = jd.getTaiMinusUtc();
            expect(difference).toEqual(34);
        });

        it("can find the difference between TAI and UTC (2)", function () {
            var date = new Date("July 11, 1979 12:00:00 UTC");
            var jd = new Cesium.JulianDate(date, Cesium.TimeStandard.TAI);
            var difference = jd.getTaiMinusUtc();
            expect(difference).toEqual(18);
        });

        it("can find the difference between TAI and UTC (3)", function () {
            var date = new Date("July 11, 1970 12:00:00 UTC");
            var jd = new Cesium.JulianDate(date, Cesium.TimeStandard.TAI);
            var difference = jd.getTaiMinusUtc();
            expect(difference).toEqual(10);
        });
    });
}());