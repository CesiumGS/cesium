/*global defineSuite*/
defineSuite([
         'Core/LeapSecond',
         'Core/JulianDate',
         'Core/TimeStandard',
         'Core/binarySearch'
     ], function(
         LeapSecond,
         JulianDate,
         TimeStandard,
         binarySearch) {
    "use strict";
    /*global it,expect*/

    it('has the proper default leapSeconds', function() {
        var leapSeconds = LeapSecond.getLeapSeconds();
        expect(leapSeconds[0].julianDate.getTotalDays()).toEqual(2441317.5);
        expect(leapSeconds[1].julianDate.getTotalDays()).toEqual(2441499.5);
        expect(leapSeconds[2].julianDate.getTotalDays()).toEqual(2441683.5);
        expect(leapSeconds[3].julianDate.getTotalDays()).toEqual(2442048.5);
        expect(leapSeconds[4].julianDate.getTotalDays()).toEqual(2442413.5);
        expect(leapSeconds[5].julianDate.getTotalDays()).toEqual(2442778.5);
        expect(leapSeconds[6].julianDate.getTotalDays()).toEqual(2443144.5);
        expect(leapSeconds[7].julianDate.getTotalDays()).toEqual(2443509.5);
        expect(leapSeconds[8].julianDate.getTotalDays()).toEqual(2443874.5);
        expect(leapSeconds[9].julianDate.getTotalDays()).toEqual(2444239.5);
        expect(leapSeconds[10].julianDate.getTotalDays()).toEqual(2444786.5);
        expect(leapSeconds[11].julianDate.getTotalDays()).toEqual(2445151.5);
        expect(leapSeconds[12].julianDate.getTotalDays()).toEqual(2445516.5);
        expect(leapSeconds[13].julianDate.getTotalDays()).toEqual(2446247.5);
        expect(leapSeconds[14].julianDate.getTotalDays()).toEqual(2447161.5);
        expect(leapSeconds[15].julianDate.getTotalDays()).toEqual(2447892.5);
        expect(leapSeconds[16].julianDate.getTotalDays()).toEqual(2448257.5);
        expect(leapSeconds[17].julianDate.getTotalDays()).toEqual(2448804.5);
        expect(leapSeconds[18].julianDate.getTotalDays()).toEqual(2449169.5);
        expect(leapSeconds[19].julianDate.getTotalDays()).toEqual(2449534.5);
        expect(leapSeconds[20].julianDate.getTotalDays()).toEqual(2450083.5);
        expect(leapSeconds[21].julianDate.getTotalDays()).toEqual(2450630.5);
        expect(leapSeconds[22].julianDate.getTotalDays()).toEqual(2451179.5);
        expect(leapSeconds[23].julianDate.getTotalDays()).toEqual(2453736.5);
        expect(leapSeconds[24].julianDate.getTotalDays()).toEqual(2454832.5);
    });

    it('throws an exception if constructed without a julian date', function() {
        expect(function() {
            return new LeapSecond();
        }).toThrow();
    });

    it('throws an exception if constructed without an offset', function() {
        expect(function() {
            return new LeapSecond(new JulianDate());
        }).toThrow();
    });

    it('can get the TAI offset from UTC', function() {
        var ls = new LeapSecond(new JulianDate(), 1.0);
        expect(ls.offset).toEqual(1.0);
    });

    it('can get the TAI offset for an index (in range)', function() {
        var leapSeconds = LeapSecond.getLeapSeconds();
        var toFind = new LeapSecond('January 1, 1973 00:00:00 UTC', 12.0);
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        expect(LeapSecond.getLeapSeconds()[index].offset).toEqual(12.0);
    });

    it('can get the Julian date for an index (in range)', function() {
        var leapSeconds = LeapSecond.getLeapSeconds();
        var toFind = new LeapSecond('July 1, 1972 00:00:00 UTC', 0.0);
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        expect(LeapSecond.getLeapSeconds()[index].julianDate.getTotalDays()).toEqual(2441499.5);
    });

    it('can check to see if leap seconds are equal', function() {
        var date = new Date('January 1, 1990 00:00:00 UTC');
        var leapSecond1 = new LeapSecond(JulianDate.fromDate(date), 25.0);
        var leapSecond2 = new LeapSecond(JulianDate.fromDate(date), 25.0);
        var leapSecond3 = new LeapSecond(JulianDate.fromDate(date), 26.0);
        expect(leapSecond1.equals(leapSecond2)).toEqual(true);
        expect(leapSecond1.equals(leapSecond3)).toEqual(false);

    });

    it('can construct a leapSecond using JSON data', function() {
        var data = [{
            date : 'January 1, 1972 00:00:00 UTC',
            offset : 10
        }, {
            date : 'July 1, 1972 00:00:00 UTC',
            offset : 11
        }, {
            date : 'January 1, 1973 00:00:00 UTC',
            offset : 12
        }, {
            date : 'January 1, 1974 00:00:00 UTC',
            offset : 13
        }, {
            date : 'January 1, 1975 00:00:00 UTC',
            offset : 14
        }, {
            date : 'January 1, 1976 00:00:00 UTC',
            offset : 15
        }, {
            date : 'January 1, 1977 00:00:00 UTC',
            offset : 16
        }, {
            date : 'January 1, 1978 00:00:00 UTC',
            offset : 17
        }, {
            date : 'January 1, 1979 00:00:00 UTC',
            offset : 18
        }, {
            date : 'January 1, 1980 00:00:00 UTC',
            offset : 19
        }, {
            date : 'July 1, 1981 00:00:00 UTC',
            offset : 20
        }, {
            date : 'July 1, 1982 00:00:00 UTC',
            offset : 21
        }, {
            date : 'July 1, 1983 00:00:00 UTC',
            offset : 22
        }, {
            date : 'July 1, 1985 00:00:00 UTC',
            offset : 23
        }, {
            date : 'January 1, 1988 00:00:00 UTC',
            offset : 24
        }, {
            date : 'January 1, 1990 00:00:00 UTC',
            offset : 25
        }, {
            date : 'January 1, 1991 00:00:00 UTC',
            offset : 26
        }, {
            date : 'July 1, 1992 00:00:00 UTC',
            offset : 27
        }, {
            date : 'July 1, 1993 00:00:00 UTC',
            offset : 28
        }, {
            date : 'July 1, 1994 00:00:00 UTC',
            offset : 100
        }, {
            date : 'January 1, 1996 00:00:00 UTC',
            offset : 30
        }, {
            date : 'July 1, 1997 00:00:00 UTC',
            offset : 31
        }, {
            date : 'January 1, 1999 00:00:00 UTC',
            offset : 32
        }, {
            date : 'January 1, 2006 00:00:00 UTC',
            offset : 33
        }, {
            date : 'January 1, 2009 00:00:00 UTC',
            offset : 34
        }];
        LeapSecond.setLeapSeconds(data);
        var jd = JulianDate.fromDate(new Date('July 11, 1994 12:00:00 UTC'));
        jd = TimeStandard.convertUtcToTai(jd);
        var difference = jd.getTaiMinusUtc();
        expect(difference).toEqual(100);
    });

    it('throws an exception if setting leap seconds without data', function() {
        expect(function() {
            LeapSecond.setLeapSeconds();
        }).toThrow();
    });

    it('can compare leap second dates (1)', function() {
        var leapSecond1 = new LeapSecond('July 18, 2011 12:00:00 UTC', 0.0);
        var leapSecond2 = new LeapSecond('July 20, 2011 12:00:00 UTC', 0.0);

        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2)).toBeLessThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond2, leapSecond1)).toBeGreaterThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond1)).toEqual(0);
    });

    it('can compare leap second dates (2)', function() {
        var leapSecond1 = new LeapSecond('July 18, 2011 15:00:00 UTC', 0.0);
        var leapSecond2 = new LeapSecond('July 18, 2011 16:00:00 UTC', 0.0);

        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2)).toBeLessThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond2, leapSecond1)).toBeGreaterThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond1)).toEqual(0);
    });
});
