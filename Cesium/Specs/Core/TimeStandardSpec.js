defineSuite([
         'Core/TimeStandard',
         'Core/JulianDate'
     ], function(
         TimeStandard,
         JulianDate) {
    "use strict";
    /*global it,expect*/

    it("throws an exception when converting from UTC to TAI without a JulianDate", function() {
        expect(function() {
            return TimeStandard.convertUtcToTai();
        }).toThrow();
    });

    it("throws an exception when converting from UTC to TAI in the wrong standard", function() {
        expect(function() {
            var julianDate = new JulianDate(new Date(), 0.5);
            return TimeStandard.convertUtcToTai(julianDate);
        }).toThrow();
    });

    it("returns the TAI date if convertUtcToTai is passed a TAI date", function() {
        var julianDate = new JulianDate(new Date(), TimeStandard.TAI);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDate);
        expect(julianDate.equals(julianDateTai)).toBeTruthy();
    });

    it("can convert from UTC to TAI", function() {
        var date = new Date("July 11, 2011 12:00:00 UTC");
        var julianDateUtc = new JulianDate(date, TimeStandard.UTC);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDateUtc);

        expect(julianDateTai.getJulianDayNumber()).toEqual(julianDateUtc.getJulianDayNumber());
        expect(julianDateTai.getSecondsOfDay()).toEqual(julianDateUtc.getSecondsOfDay() + 34);
        expect(julianDateUtc.equals(julianDateTai)).toBeTruthy();
    });

    it("throws an exception when converting from TAI to UTC without a JulianDate", function() {
        expect(function() {
            return TimeStandard.convertTaiToUtc();
        }).toThrow();
    });

    it("throws an exception when converting from TAI to UTC in the wrong standard", function() {
        expect(function() {
            var julianDate = new JulianDate(new Date(), 0.5);
            return TimeStandard.convertTaiToUtc(julianDate);
        }).toThrow();
    });

    it("returns the UTC date if convertTaiToUtc is passed a UTC date", function() {
        var julianDate = new JulianDate(new Date(), TimeStandard.UTC);
        var julianDateUtc = TimeStandard.convertTaiToUtc(julianDate);
        expect(julianDate.equals(julianDateUtc)).toBeTruthy();
    });

    it("can convert from TAI to UTC", function() {
        var date = new Date("July 11, 2011 12:00:00 UTC");
        var julianDateUtc = new JulianDate(date, TimeStandard.UTC);
        var julianDateTai = TimeStandard.convertUtcToTai(julianDateUtc);
        var julianDateUtc2 = TimeStandard.convertTaiToUtc(julianDateTai);

        expect(julianDateUtc2.equals(julianDateUtc)).toBeTruthy();

        expect(julianDateUtc2.getJulianDayNumber()).toEqual(julianDateTai.getJulianDayNumber());
        expect(julianDateUtc2.getSecondsOfDay()).toEqual(julianDateTai.getSecondsOfDay() - 34);
    });
});