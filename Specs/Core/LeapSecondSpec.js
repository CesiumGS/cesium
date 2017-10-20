defineSuite([
        'Core/LeapSecond',
        'Core/JulianDate'
    ], function(
        LeapSecond,
        JulianDate) {
    'use strict';

    it('default constructor sets expected values', function() {
        var leapSecond = new LeapSecond();
        expect(leapSecond.julianDate).toBeUndefined();
        expect(leapSecond.offset).toBeUndefined();
    });

    it('constructor sets expected values', function() {
        var date = new JulianDate();
        var offset = 12;
        var leapSecond = new LeapSecond(date, offset);
        expect(leapSecond.julianDate).toEqual(date);
        expect(leapSecond.offset).toEqual(offset);
    });
});
