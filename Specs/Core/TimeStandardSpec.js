/*global defineSuite*/
defineSuite(['Core/TimeStandard', 'Core/JulianDate'], function(TimeStandard, JulianDate) {
    "use strict";
    /*global it,expect*/

    it('can convert from UTC to TAI', function() {
        var date = new Date('July 11, 2011 12:00:00 UTC');
        var julianDateUtc = JulianDate.fromDate(date, TimeStandard.UTC);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDateUtc);

        expect(julianDateTai.getJulianDayNumber()).toEqual(julianDateUtc.getJulianDayNumber());
        expect(julianDateTai.getSecondsOfDay()).toEqual(julianDateUtc.getSecondsOfDay() + 34);
        expect(julianDateUtc.equals(julianDateTai)).toEqual(true);
    });

    it('can convert from TAI to UTC', function() {
        var date = new Date('July 11, 2011 12:00:00 UTC');
        var julianDateUtc = JulianDate.fromDate(date, TimeStandard.UTC);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDateUtc);
        var julianDateUtc2 = TimeStandard.convertTaiToUtc(julianDateTai);

        expect(julianDateUtc2.equals(julianDateUtc)).toEqual(true);
        expect(julianDateUtc2.getJulianDayNumber()).toEqual(julianDateTai.getJulianDayNumber());
        expect(julianDateUtc2.getSecondsOfDay()).toEqual(julianDateTai.getSecondsOfDay() - 34);
    });

    it('returns the TAI date if convertUtcToTai is passed a TAI date', function() {
        var julianDate = JulianDate.fromDate(new Date(), TimeStandard.TAI);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDate);
        expect(julianDate.equals(julianDateTai)).toEqual(true);
    });

    it('returns the UTC date if convertTaiToUtc is passed a UTC date', function() {
        var julianDate = JulianDate.fromDate(new Date(), TimeStandard.UTC);
        var julianDateUtc = TimeStandard.convertTaiToUtc(julianDate);
        expect(julianDate.equals(julianDateUtc)).toEqual(true);
    });

    it('converting from a TAI leap second is undefined', function() {
        var julianDate = new JulianDate(2454832, 43233, TimeStandard.TAI);
        var julianDateTai = TimeStandard.convertTaiToUtc(julianDate);
        expect(julianDateTai).toEqual(undefined);
    });

    it('throws an exception when converting from UTC to TAI with undefined JulianDate', function() {
        expect(function() {
            return TimeStandard.convertUtcToTai();
        }).toThrow();
    });

    it('throws an exception when converting from UTC to TAI with null JulianDate', function() {
        expect(function() {
            return TimeStandard.convertUtcToTai(null);
        }).toThrow();
    });

    it('throws an exception when converting from TAI to UTC with undefined JulianDate', function() {
        expect(function() {
            return TimeStandard.convertTaiToUtc();
        }).toThrow();
    });

    it('throws an exception when converting from TAI to UTC with null JulianDate', function() {
        expect(function() {
            return TimeStandard.convertTaiToUtc(null);
        }).toThrow();
    });

    it('convertUtcToTai throws an exception if time standard is not UTC', function() {
        var julianDate = new JulianDate(2454832, 43233);
        julianDate._timeStandard = 404;
        expect(function() {
            return TimeStandard.convertUtcToTai(julianDate);
        }).toThrow();
    });

    it('convertTaiToUtc throws an exception if time standard is not TAI', function() {
        var julianDate = new JulianDate(2454832, 43233);
        julianDate._timeStandard = 404;
        expect(function() {
            return TimeStandard.convertTaiToUtc(julianDate);
        }).toThrow();
    });
});
