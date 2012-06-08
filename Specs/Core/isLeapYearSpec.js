/*global defineSuite*/
defineSuite(['Core/isLeapYear'], function(isLeapYear) {
    "use strict";
    /*global it,expect*/

    it('Check for valid leap years', function() {
        expect(isLeapYear(2000)).toEqual(true);
        expect(isLeapYear(2004)).toEqual(true);
        expect(isLeapYear(2003)).toEqual(false);
        expect(isLeapYear(2300)).toEqual(false);
        expect(isLeapYear(2400)).toEqual(true);
        expect(isLeapYear(-1)).toEqual(false);
        expect(isLeapYear(-2000)).toEqual(true);
    });

    it('Fail with null value', function() {
        expect(function() {
            isLeapYear(null);
        }).toThrow();
    });

    it('Fail with undefined value', function() {
        expect(function() {
            isLeapYear(undefined);
        }).toThrow();
    });

    it('Fail with non-numerical value', function() {
        expect(function() {
            isLeapYear('asd');
        }).toThrow();
    });
});