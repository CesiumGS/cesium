/*global defineSuite*/
defineSuite(['Core/JulianDate',
             'Core/TimeStandard',
             'Core/TimeConstants',
             'Core/Math'],
function(JulianDate,
         TimeStandard,
         TimeConstants,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    // All exact Julian Dates found using NASA's Time Conversion Tool: http://ssd.jpl.nasa.gov/tc.cgi
    it('Construct a default date', function() {
        // Default constructing a date uses 'now'.  Unfortunately,
        // there's no way to know exactly what that time will be, so we
        // give ourselves a 5 second epsilon as a hack to avoid possible
        // race conditions.  In reality, it might be better to just omit
        // a check in this test, since if this breaks, tons of other stuff
        // will as well.
        var defaultDate = new JulianDate();
        var dateNow = JulianDate.fromDate(new Date());
        expect(defaultDate.equalsEpsilon(dateNow, 5)).toEqual(true);
    });

    it('Construct a date from basic TAI components', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(dayNumber);
        expect(julianDate.getSecondsOfDay()).toEqual(seconds);
    });

    it('clone works without result parameter', function() {
        var julianDate = new JulianDate();
        var returnedResult = julianDate.clone();
        expect(returnedResult).toEqual(julianDate);
        expect(returnedResult).toNotBe(julianDate);
    });

    it('clone works with result parameter', function() {
        var julianDate = new JulianDate(1, 2);
        var result = new JulianDate();
        var returnedResult = julianDate.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(julianDate);
        expect(returnedResult).toEqual(julianDate);
    });

    it('Construct a date from UTC components just before a leap second', function() {
        var expected = new JulianDate(2443874, 43216, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43199.0, TimeStandard.UTC);
        expect(julianDate.getJulianDayNumber()).toEqual(expected.getJulianDayNumber());
        expect(julianDate.getSecondsOfDay()).toEqual(expected.getSecondsOfDay());
    });

    it('Construct a date from UTC components equivalent to a LeapSecond table entry', function() {
        var expected = new JulianDate(2443874, 43218, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43200.0, TimeStandard.UTC);
        expect(julianDate.getJulianDayNumber()).toEqual(expected.getJulianDayNumber());
        expect(julianDate.getSecondsOfDay()).toEqual(expected.getSecondsOfDay());
    });

    it('Construct a date from UTC components just after a leap second', function() {
        var expected = new JulianDate(2443874, 43219, TimeStandard.TAI);
        var julianDate = new JulianDate(2443874, 43201.0, TimeStandard.UTC);
        expect(julianDate.getJulianDayNumber()).toEqual(expected.getJulianDayNumber());
        expect(julianDate.getSecondsOfDay()).toEqual(expected.getSecondsOfDay());
    });

    it('Construct a date from basic components with more seconds than a day', function() {
        var dayNumber = 12;
        var seconds = 86401;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(13);
        expect(julianDate.getSecondsOfDay()).toEqual(1);
    });

    it('Construct a date from basic components with negative seconds in a day', function() {
        var dayNumber = 12;
        var seconds = -1;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(11);
        expect(julianDate.getSecondsOfDay()).toEqual(86399);
    });

    it('Construct a date from basic components with partial day and seconds in a day', function() {
        var dayNumber = 12.5;
        var seconds = -1;
        var timeStandard = TimeStandard.TAI;
        var julianDate = new JulianDate(dayNumber, seconds, timeStandard);
        expect(julianDate.getJulianDayNumber()).toEqual(12);
        expect(julianDate.getSecondsOfDay()).toEqual(43199);
    });

    it('Construct a date with default time standard', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var julianDateDefault = new JulianDate(dayNumber, seconds);
        var julianDateUtc = new JulianDate(dayNumber, seconds, TimeStandard.UTC);
        expect(julianDateDefault).toEqual(julianDateUtc);
    });

    it('Fail to construct a date with invalid time standard', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = 'invalid';
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with a null time standard', function() {
        var dayNumber = 12;
        var seconds = 12.5;
        var timeStandard = null;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with an undefined secondsOfDay', function() {
        var dayNumber = 12;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, undefined, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with null secondsOfDay', function() {
        var dayNumber = 12;
        var seconds = null;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with non-numerical secondsOfDay', function() {
        var dayNumber = 12;
        var seconds = 'not a number';
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with undefined day number', function() {
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(undefined, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with null day number', function() {
        var dayNumber = null;
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Fail to construct a date with non-numerical day number', function() {
        var dayNumber = 'not a number';
        var seconds = 12.5;
        var timeStandard = TimeStandard.UTC;
        expect(function() {
            return new JulianDate(dayNumber, seconds, timeStandard);
        }).toThrow();
    });

    it('Construct a date from a JavaScript Date (1)', function() {
        var date = new Date('January 1, 1991 06:00:00 UTC');
        var julianDate = JulianDate.fromDate(date, TimeStandard.TAI);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2448257.75, CesiumMath.EPSILON5);
    });

    it('Construct a date from a JavaScript Date (2)', function() {
        var date = new Date('July 4, 2011 12:00:00 UTC');
        var julianDate = JulianDate.fromDate(date, TimeStandard.TAI);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2455747.0, CesiumMath.EPSILON5);
    });

    it('Construct a date from a JavaScript Date (3)', function() {
        var date = new Date('December 31, 2021 18:00:00 UTC');
        var julianDate = JulianDate.fromDate(date, TimeStandard.TAI);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2459580.25, CesiumMath.EPSILON5);
    });

    it('Construct a date from a JavaScript Date (4)', function() {
        var jsDate = new Date('September 1, 2011 12:00:00 UTC');
        var julianDate = JulianDate.fromDate(jsDate, TimeStandard.TAI);
        expect(julianDate.getTotalDays()).toEqualEpsilon(2455806.0, CesiumMath.EPSILON5);
    });

    it('Construct a date from a JavaScript Date in different TimeStandard', function() {
        var taiDate = new Date('September 1, 2012 12:00:35');
        var taiJulianDate = JulianDate.fromDate(taiDate, TimeStandard.TAI);

        var utcDate = new Date('September 1, 2012 12:00:00');
        var utcJulianDate = JulianDate.fromDate(utcDate, TimeStandard.UTC);

        expect(taiJulianDate.equalsEpsilon(utcJulianDate, CesiumMath.EPSILON20)).toEqual(true);
    });

    it('Fail to construct from an undefined JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(undefined);
        }).toThrow();
    });

    it('Fail to construct from a null JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(null);
        }).toThrow();
    });

    it('Fail to construct from an invalid JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(new Date(Date.parse('garbage')));
        }).toThrow();
    });

    it('Fail to construct from a non-date JavaScript Date', function() {
        expect(function() {
            return JulianDate.fromDate(0);
        }).toThrow();
    });

    it('Fail to construct from a JavaScript Date with null time standard', function() {
        expect(function() {
            return JulianDate.fromDate(new Date(), null);
        }).toThrow();
    });

    it('Fail to construct from a JavaScript Date with invalid time standard', function() {
        expect(function() {
            return JulianDate.fromDate(new Date(), 'invalid');
        }).toThrow();
    });

    it('Construct a date from total days (1)', function() {
        var julianDate = JulianDate.fromTotalDays(2448257.75, TimeStandard.UTC);
        var expected = JulianDate.fromDate(new Date('January 1, 1991 06:00:00 UTC'));
        expect(julianDate).toEqual(expected);
    });

    it('Construct a date from total days (2)', function() {
        var julianDate = JulianDate.fromTotalDays(2455747.0, TimeStandard.UTC);
        var expected = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        expect(julianDate).toEqual(expected);
    });

    it('Construct a date from total days (3)', function() {
        var julianDate = JulianDate.fromTotalDays(2459580.25, TimeStandard.UTC);
        var expected = JulianDate.fromDate(new Date('December 31, 2021 18:00:00 UTC'));
        expect(julianDate).toEqual(expected);
    });

    it('Construct a date from total days with different time standards', function() {
        var julianDate = JulianDate.fromTotalDays(2455806, TimeStandard.TAI);
        var expected = JulianDate.fromDate(new Date('September 1, 2011 12:00:00 UTC'), TimeStandard.TAI);
        expect(julianDate).toEqual(expected);
    });

    it('Fail to construct from non-numeric total days', function() {
        expect(function() {
            return JulianDate.fromTotalDays('not a number', TimeStandard.UTC);
        }).toThrow();
    });

    it('Fail to construct from null total days', function() {
        expect(function() {
            return JulianDate.fromTotalDays(null, TimeStandard.UTC);
        }).toThrow();
    });

    it('Fail to construct from undefined total days', function() {
        expect(function() {
            return JulianDate.fromTotalDays(undefined, TimeStandard.UTC);
        }).toThrow();
    });

    it('Fail to construct from total days with null time standard', function() {
        expect(function() {
            return JulianDate.fromTotalDays(1234, null);
        }).toThrow();
    });

    it('Fail to construct from total days with invalid time standard', function() {
        expect(function() {
            return JulianDate.fromTotalDays(1234, 'invalid');
        }).toThrow();
    });

    it('Construct from ISO8601 local calendar date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2009, 7, 1));
        var computedDate = JulianDate.fromIso8601('20090801');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 local calendar date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2009, 7, 1));
        var computedDate = JulianDate.fromIso8601('2009-08-01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 local calendar date on Feb 29th, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2000, 1, 29));
        var computedDate = JulianDate.fromIso8601('20000229');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 local calendar date on Feb 29th, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2000, 1, 29));
        var computedDate = JulianDate.fromIso8601('2000-02-29');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local ordinal date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(1985, 3, 12));
        var computedDate = JulianDate.fromIso8601('1985102');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local ordinal date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(1985, 3, 12));
        var computedDate = JulianDate.fromIso8601('1985-102');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct an ISO8601 ordinal date on a leap year', function() {
        var expectedDate = JulianDate.fromDate(new Date(2000, 11, 31));
        var computedDate = JulianDate.fromIso8601('2000-366');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local week date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(1985, 3, 12));
        var computedDate = JulianDate.fromIso8601('1985W155');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local week date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2008, 8, 27));
        var computedDate = JulianDate.fromIso8601('2008-W39-6');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar week date, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(1985, 3, 7));
        var computedDate = JulianDate.fromIso8601('1985W15');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar week date, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(2008, 8, 21));
        var computedDate = JulianDate.fromIso8601('2008-W39');
        expect(computedDate).toEqual(expectedDate);
    });

    //Note, there is no 'extended format' for calendar month because eliminating the
    //would confuse is with old YYMMDD dates
    it('Construct from an ISO8601 local calendar month, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(1985, 3, 1));
        var computedDate = JulianDate.fromIso8601('1985-04');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25)));
        var computedDate = JulianDate.fromIso8601('20090801T123025Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, basic format', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        //var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25, 5125423)));
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('20090801T123025.5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, extended format', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25.5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, basic format, "," instead of "."', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        //var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 25, 5125423)));
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('20090801T123025,5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional seconds, extended format, "," instead of "."', function() {
        //Date is only accurate to milliseconds, while JulianDate, much more so.  The below date gets
        //rounded to 513, so we need to construct a JulianDate directly.
        var expectedDate = new JulianDate(2455045, 1825.5125423, TimeStandard.UTC);
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30:25,5125423Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no seconds, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T1230Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no seconds, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('20090801T1230.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, basic format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('20090801T1230,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional minutes, extended format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 30)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12:30,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no minutes/seconds, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 0, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time no minutes/seconds, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 0, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, basic format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, extended format', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12.5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, basic format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('20090801T12,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from ISO8601 UTC calendar date and time fractional hours, extended format, "," instead of "."', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 1, 12, 30, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T12,5Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 UTC calendar date and time on a leap second', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T23:59:60Z');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 UTC calendar date and time within a leap second', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T23:59:60.123456789Z');
        var expectedDate = new JulianDate(2454832, 43233.123456789, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date and time on a leap second 1 hour behind UTC', function() {
        var computedDate = JulianDate.fromIso8601('2008-12-31T22:59:60-01');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date and time on a leap second 1 hour ahead of UTC', function() {
        var computedDate = JulianDate.fromIso8601('2009-01-01T00:59:60+01');
        var expectedDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 calendar date and time using 24:00:00 midnight notation', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 7, 2, 0, 0, 0)));
        var computedDate = JulianDate.fromIso8601('2009-08-01T24:00:00Z');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into previous month', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 2, 31, 23, 59, 0)));
        var computedDate = JulianDate.fromIso8601('1985-04-01T00:59:00+01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into next month', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(1985, 3, 1, 0, 59, 0)));
        var computedDate = JulianDate.fromIso8601('1985-03-31T23:59:00-01');
        expect(computedDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into next year', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2008, 11, 31, 23, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2009-01-01T01:00:00+02');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Construct from an ISO8601 local calendar date with UTC offset that crosses into previous year', function() {
        var expectedDate = JulianDate.fromDate(new Date(Date.UTC(2009, 0, 1, 1, 0, 0)));
        var julianDate = JulianDate.fromIso8601('2008-12-31T23:00:00-02');
        expect(julianDate).toEqual(expectedDate);
    });

    it('Fails to construct an ISO8601 ordinal date with day less than 1', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-000');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 ordinal date with day more than 365 on non-leap year', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-366');
        }).toThrow();
    });

    it('Fails to construct ISO8601 UTC calendar date of invalid YYMMDD format', function() {
        expect(function() {
            return JulianDate.fromIso8601('200905');
        }).toThrow();
    });

    it('Fails to construct a complete ISO8601 date missing T delimeter', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-08-0112:30.5Z');
        }).toThrow();
    });

    it('Fails to construct a complete ISO8601 date with delimeter other than T', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-08-01Q12:30.5Z');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date from undefined', function() {
        expect(function() {
            return JulianDate.fromIso8601(undefined);
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date from null', function() {
        expect(function() {
            return JulianDate.fromIso8601(null);
        }).toThrow();
    });

    it('Fails to construct an ISO8601 from complete garbage', function() {
        expect(function() {
            return JulianDate.fromIso8601('this is not a date');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date from a valid ISO8601 interval', function() {
        expect(function() {
            return JulianDate.fromIso8601('2007-03-01T13:00:00Z/2008-05-11T15:30:00Z');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with too many year digits', function() {
        expect(function() {
            return JulianDate.fromIso8601('20091-05-19');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with too many month digits', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-100-19');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with more than 12 months', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-13-19');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with less than 1 months', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-00-19');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 January date with more than 31 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-01-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 Febuary date with more than 28 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-02-29');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 Febuary leap year date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-02-30');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 March date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-03-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 April date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-04-31');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 May date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-05-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 June date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-06-31');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 July date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-07-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 August date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-08-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 September date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-09-31');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 October date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-10-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 November date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-11-31');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 December date with more than 29 days', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-32');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with more than 24 hours (extra seconds)', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T24:00:01');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with more than 24 hours (extra minutes)', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T24:01:00');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with more than 59 minutes', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:60');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with more than 60 seconds', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:61');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with less than 1 day', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009-01-00');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with too many dashes', function() {
        expect(function() {
            return JulianDate.fromIso8601('2009--01-01');
        }).toThrow();
    });

    it('Fails to construct from an ISO8601 with garbage offset', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:23ZZ+-050708::1234');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with more than one decimal place', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T12:59:22..2');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 calendar date mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('200108-01');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 calendar date mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-0801');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 calendar week mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2008-W396');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 calendar week mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2008W39-6');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 date with trailing -', function() {
        expect(function() {
            return JulianDate.fromIso8601('2001-');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 time mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T22:0100');
        }).toThrow();
    });

    it('Fails to construct an ISO8601 time mixing basic and extended format', function() {
        expect(function() {
            return JulianDate.fromIso8601('2000-12-15T2201:00');
        }).toThrow();
    });

    it('getJulianTimeFraction works', function() {
        var seconds = 12345.678;
        var fraction = seconds / 86400.0;
        var julianDate = new JulianDate(0, seconds, TimeStandard.TAI);
        expect(julianDate.getJulianTimeFraction()).toEqualEpsilon(fraction, CesiumMath.EPSILON20);
    });

    it('toDate works when constructed from total days', function() {
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

    it('toDate works when using TAI', function() {
        var julianDateTai = JulianDate.fromTotalDays(2455927.157772, TimeStandard.UTC);
        var javascriptDate = julianDateTai.toDate();
        expect(javascriptDate.getUTCFullYear()).toEqual(2011);
        expect(javascriptDate.getUTCMonth()).toEqual(11);
        expect(javascriptDate.getUTCDate()).toEqual(31);
        expect(javascriptDate.getUTCHours()).toEqual(15);
        expect(javascriptDate.getUTCMinutes()).toEqual(47);
        expect(javascriptDate.getUTCSeconds()).toEqual(11);
        expect(javascriptDate.getUTCMilliseconds()).toEqualEpsilon(500, 10);
    });

    it('toDate works a second before a leap second', function() {
        var expectedDate = new Date('6/30/1997 11:59:59 PM UTC');
        var date = new JulianDate(2450630, 43229.0, TimeStandard.TAI).toDate();
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on a leap second', function() {
        var expectedDate = new Date('6/30/1997 11:59:59 PM UTC');
        var date = new JulianDate(2450630, 43230.0, TimeStandard.TAI).toDate();
        expect(date).toEqual(expectedDate);
    });

    it('toDate works a second after a leap second', function() {
        var expectedDate = new Date('7/1/1997 12:00:00 AM UTC');
        var date = new JulianDate(2450630, 43231.0, TimeStandard.TAI).toDate();
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on date before any leap seconds', function() {
        var expectedDate = new Date('09/10/1968 12:00:00 AM UTC');
        var date = new JulianDate(2440109, 43210.0, TimeStandard.TAI).toDate();
        expect(date).toEqual(expectedDate);
    });

    it('toDate works on date later than all leap seconds', function() {
        var expectedDate = new Date('11/17/2039 12:00:00 AM UTC');
        var date = new JulianDate(2466109, 43235.0, TimeStandard.TAI).toDate();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works a second before a leap second', function() {
        var expectedDate = '1997-06-30T23:59:59Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on a leap second', function() {
        var expectedDate = '1997-06-30T23:59:60Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works a second after a leap second', function() {
        var expectedDate = '1997-07-01T00:00:00Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on date before any leap seconds', function() {
        var expectedDate = '1968-09-10T00:00:00Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works on date later than all leap seconds', function() {
        var expectedDate = '2031-11-17T00:00:00Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works without precision', function() {
        var expectedDate = '0950-01-02T03:04:05.5Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 pads zeros for year less than four digits or time components less than two digits', function() {
        var expectedDate = '0950-01-02T03:04:05.005Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601(3);
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 does not show milliseconds if they are 0', function() {
        var expectedDate = '0950-01-02T03:04:05Z';
        var date = JulianDate.fromIso8601(expectedDate).toIso8601();
        expect(date).toEqual(expectedDate);
    });

    it('toIso8601 works with specified precision', function() {
        var isoDate = '0950-01-02T03:04:05.012345Z';
        var date;
        date = JulianDate.fromIso8601(isoDate).toIso8601(0);
        expect(date).toEqual('0950-01-02T03:04:05Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(1);
        expect(date).toEqual('0950-01-02T03:04:05.0Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(2);
        expect(date).toEqual('0950-01-02T03:04:05.01Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(3);
        expect(date).toEqual('0950-01-02T03:04:05.012Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(4);
        expect(date).toEqual('0950-01-02T03:04:05.0123Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(5);
        expect(date).toEqual('0950-01-02T03:04:05.01234Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(6);
        expect(date).toEqual('0950-01-02T03:04:05.012345Z');
        date = JulianDate.fromIso8601(isoDate).toIso8601(7);
        expect(date).toEqual('0950-01-02T03:04:05.0123450Z');
    });

    it('getSecondsDifference works in UTC', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('getSecondsDifference works in TAI', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('getSecondsDifference works with mixed time standards', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getSecondsDifference(end)).toEqualEpsilon(TimeConstants.SECONDS_PER_DAY + TimeConstants.SECONDS_PER_MINUTE, CesiumMath.EPSILON5);
    });

    it('getMinutesDifference works in UTC', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it('getMinutesDifference works in TAI', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it('getMinutesDifference works with mixed time standards', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 12:01:00 UTC'));
        expect(start.getMinutesDifference(end)).toEqualEpsilon(TimeConstants.MINUTES_PER_DAY + 1.0, CesiumMath.EPSILON5);
    });

    it('getDaysDifference works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 5, 2011 14:24:00'));
        var difference = start.getDaysDifference(end);
        expect(difference).toEqual(1.1);
    });

    it('getDaysDifference works with negative result', function() {
        var end = JulianDate.fromDate(new Date('July 4, 2011 12:00:00'));
        var start = JulianDate.fromDate(new Date('July 5, 2011 14:24:00'));
        var difference = start.getDaysDifference(end);
        expect(difference).toEqual(-1.1);
    });

    it('addSeconds works with whole seconds', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:30 UTC'));
        var end = start.addSeconds(95);
        expect(end.toDate().getUTCSeconds()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(2, CesiumMath.EPSILON5);
    });

    it('addSeconds works with fractions (1)', function() {
        var start = new JulianDate(2454832, 0, TimeStandard.TAI);
        var end = start.addSeconds(1.5);
        expect(start.getSecondsDifference(end)).toEqual(1.5);
    });

    it('addSeconds works with fractions (2)', function() {
        var start = JulianDate.fromDate(new Date('August 11 2011 6:00:00 UTC'));
        var end = start.addSeconds(0.5);
        expect(start.getSecondsDifference(end)).toEqual(0.5);
    });

    it('addSeconds works with fractions (3)', function() {
        var start = JulianDate.fromDate(new Date('August 11 2011 11:59:59 UTC'));
        var end = start.addSeconds(1.25);
        expect(start.getSecondsDifference(end)).toEqual(1.25);
    });

    it('addSeconds works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:01:30 UTC'));
        var end = start.addSeconds(-60.0);
        expect(start.getSecondsDifference(end)).toEqual(-60.0);
    });

    it('addSeconds works with more seconds than in a day', function() {
        var seconds = TimeConstants.SECONDS_PER_DAY * 7 + 15;
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = start.addSeconds(seconds);
        expect(start.getSecondsDifference(end)).toEqual(seconds);
    });

    it('addSeconds works with negative seconds more than in a day', function() {
        var seconds = -TimeConstants.SECONDS_PER_DAY * 7 - 15;
        var start = new JulianDate(2448444, 0, TimeStandard.UTC);
        var end = start.addSeconds(seconds);
        expect(start.getSecondsDifference(end)).toEqual(seconds);
    });

    it('addSeconds fails with non-numeric input', function() {
        expect(function() {
            return new JulianDate().addSeconds('banana');
        }).toThrow();
    });

    it('addSeconds fails with null input', function() {
        expect(function() {
            return new JulianDate().addSeconds(null);
        }).toThrow();
    });

    it('addSeconds fails with undefined input', function() {
        expect(function() {
            return new JulianDate().addSeconds(undefined);
        }).toThrow();
    });
    it('addMinutes works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addMinutes(65);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(13, CesiumMath.EPSILON5);
    });

    it('addMinutes works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addMinutes(-35);
        expect(end.toDate().getUTCMinutes()).toEqualEpsilon(25, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(11, CesiumMath.EPSILON5);
    });

    it('addMinutes fails with non-numeric input', function() {
        expect(function() {
            return new JulianDate().addMinutes('banana');
        }).toThrow();
    });

    it('addMinutes fails with null input', function() {
        expect(function() {
            return new JulianDate().addMinutes(null);
        }).toThrow();
    });

    it('addMinutes fails with undefined input', function() {
        expect(function() {
            return new JulianDate().addMinutes(undefined);
        }).toThrow();
    });

    it('addHours works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addHours(6);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(18, CesiumMath.EPSILON5);
    });

    it('addHours works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addHours(-6);
        expect(end.toDate().getUTCHours()).toEqualEpsilon(6, CesiumMath.EPSILON5);
    });

    it('addHours fails with non-numeric input', function() {
        expect(function() {
            return new JulianDate().addHours('banana');
        }).toThrow();
    });

    it('addHours fails with null input', function() {
        expect(function() {
            return new JulianDate().addHours(null);
        }).toThrow();
    });

    it('addHours fails with undefined input', function() {
        expect(function() {
            return new JulianDate().addHours(undefined);
        }).toThrow();
    });

    it('addDays works', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addDays(32);
        expect(end.toDate().getUTCDate()).toEqualEpsilon(5, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMonth()).toEqualEpsilon(7, CesiumMath.EPSILON5);
    });

    it('addDays works with negative numbers', function() {
        var start = JulianDate.fromDate(new Date('July 4, 2011 12:00:00 UTC'));
        var end = start.addDays(-4);
        expect(end.toDate().getUTCDate()).toEqualEpsilon(30, CesiumMath.EPSILON5);
        expect(end.toDate().getUTCMonth()).toEqualEpsilon(5, CesiumMath.EPSILON5);
    });

    it('addDays fails with non-numeric input', function() {
        expect(function() {
            return new JulianDate().addDays('banana');
        }).toThrow();
    });

    it('addDays fails with null input', function() {
        expect(function() {
            return new JulianDate().addDays(null);
        }).toThrow();
    });

    it('addDays fails with undefined input', function() {
        expect(function() {
            return new JulianDate().addDays(undefined);
        }).toThrow();
    });

    it('lessThan works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
        expect(start.lessThan(end)).toEqual(true);
    });

    it('lessThan works with equal values', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(start.lessThan(end)).toEqual(false);
        expect(start.lessThan(end.addSeconds(1))).toEqual(true);
    });

    it('lessThan works with different time standards', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'), TimeStandard.UTC);
        var end = JulianDate.fromDate(new Date('July 6, 2011 12:00:00'), TimeStandard.TAI);
        expect(start.lessThan(end)).toEqual(true);
    });

    it('lessThanOrEquals works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(start.lessThanOrEquals(end)).toEqual(true);
        expect(start.addSeconds(1).lessThanOrEquals(end)).toEqual(false);
        expect(start.addSeconds(-1).lessThanOrEquals(end)).toEqual(true);
    });

    it('greaterThan works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(start.greaterThan(end)).toEqual(true);
    });

    it('greaterThan works with equal values', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(start.greaterThan(end)).toEqual(false);
        expect(start.greaterThan(end.addSeconds(-1))).toEqual(true);
    });

    it('greaterThan works with different time standards', function() {
        var start = JulianDate.fromDate(new Date('July 6, 2011 12:01:00'), TimeStandard.TAI);
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'), TimeStandard.UTC);
        expect(start.greaterThan(end)).toEqual(true);
    });

    it('greaterThanOrEquals works', function() {
        var start = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        var end = JulianDate.fromDate(new Date('July 6, 1991 12:00:00'));
        expect(start.greaterThanOrEquals(end)).toEqual(true);
        expect(start.addSeconds(-1).greaterThanOrEquals(end)).toEqual(false);
        expect(start.addSeconds(1).greaterThanOrEquals(end)).toEqual(true);
    });

    it('can be equal to within an epsilon of another JulianDate', function() {
        var original = JulianDate.fromDate(new Date('September 7, 2011 12:55:00 UTC'));
        var clone = JulianDate.fromDate(new Date('September 7, 2011 12:55:00 UTC'));
        clone = clone.addSeconds(1);
        expect(original.equalsEpsilon(clone, 2)).toEqual(true);
    });

    it('getTotalDays works', function() {
        var totalDays = 2455784.7500058;
        var original = JulianDate.fromTotalDays(totalDays, TimeStandard.TAI);
        expect(totalDays).toEqual(original.getTotalDays());
    });

    it('equalsEpsilon works', function() {
        var date = new JulianDate();
        var datePlusOne = date.addSeconds(0.01);
        expect(date.equalsEpsilon(datePlusOne, CesiumMath.EPSILON1)).toEqual(true);
    });

    it('getTaiMinusUtc works before all leap seconds', function() {
        var date = new Date('July 11, 1970 12:00:00 UTC');
        var jd = JulianDate.fromDate(date, TimeStandard.TAI);
        var difference = jd.getTaiMinusUtc();
        expect(difference).toEqual(10);
    });

    it('getTaiMinusUtc works a second before a leap second', function() {
        var date = new JulianDate(2456109, 43233.0, TimeStandard.TAI);
        expect(date.getTaiMinusUtc()).toEqual(34);
    });

    it('getTaiMinusUtc works on a leap second', function() {
        var date = new JulianDate(2456109, 43234.0, TimeStandard.TAI);
        expect(date.getTaiMinusUtc()).toEqual(34);
    });

    it('getTaiMinusUtc works a second after a leap second', function() {
        var date = new JulianDate(2456109, 43235.0, TimeStandard.TAI);
        expect(date.getTaiMinusUtc()).toEqual(35);
    });

    it('getTaiMinusUtc works after all leap seconds', function() {
        var date = new JulianDate(2556109, 43235.0, TimeStandard.TAI);
        expect(date.getTaiMinusUtc()).toEqual(35);
    });

    it('can compare instances with compareTo', function() {
        var date = new JulianDate(0, 0.0, TimeStandard.TAI);
        var date2 = new JulianDate(1, 0.0, TimeStandard.TAI);

        expect(date.compareTo(date2)).toBeLessThan(0);
        expect(date2.compareTo(date)).toBeGreaterThan(0);
    });
});
