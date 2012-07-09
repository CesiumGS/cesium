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
        var toFind = new LeapSecond(new JulianDate(2441683, 43212.0, TimeStandard.TAI), 12.0);
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        expect(LeapSecond.getLeapSeconds()[index].offset).toEqual(12.0);
    });

    it('can get the Julian date for an index (in range)', function() {
        var leapSeconds = LeapSecond.getLeapSeconds();
        var toFind = new LeapSecond(new JulianDate(2441317, 43210.0, TimeStandard.TAI), 0.0);
        var index = binarySearch(leapSeconds, toFind, LeapSecond.compareLeapSecondDate);
        expect(leapSeconds[index].julianDate).toEqual(toFind.julianDate);
    });

    it('can check to see if leap seconds are equal', function() {
        var date = new Date('January 1, 1990 00:00:00 UTC');
        var leapSecond1 = new LeapSecond(JulianDate.fromDate(date), 25.0);
        var leapSecond2 = new LeapSecond(JulianDate.fromDate(date), 25.0);
        var leapSecond3 = new LeapSecond(JulianDate.fromDate(date), 26.0);
        expect(leapSecond1.equals(leapSecond2)).toEqual(true);
        expect(leapSecond1.equals(leapSecond3)).toEqual(false);
    });

    it('can compare leap second dates (1)', function() {
        var leapSecond1 = new LeapSecond(JulianDate.fromDate(new Date('July 18, 2011 12:00:00 UTC')), 0.0);
        var leapSecond2 = new LeapSecond(JulianDate.fromDate(new Date('July 20, 2011 12:00:00 UTC')), 0.0);

        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2)).toBeLessThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond2, leapSecond1)).toBeGreaterThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond1)).toEqual(0);
    });

    it('can compare leap second dates (2)', function() {
        var leapSecond1 = new LeapSecond(JulianDate.fromDate(new Date('July 18, 2011 15:00:00 UTC')), 0.0);
        var leapSecond2 = new LeapSecond(JulianDate.fromDate(new Date('July 18, 2011 16:00:00 UTC')), 0.0);

        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond2)).toBeLessThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond2, leapSecond1)).toBeGreaterThan(0);
        expect(LeapSecond.compareLeapSecondDate(leapSecond1, leapSecond1)).toEqual(0);
    });
});
