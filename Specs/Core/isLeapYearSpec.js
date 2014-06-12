/*global defineSuite*/
defineSuite([
        'Core/isLeapYear'
    ], function(
        isLeapYear) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
        }).toThrowDeveloperError();
    });

    it('Fail with undefined value', function() {
        expect(function() {
            isLeapYear(undefined);
        }).toThrowDeveloperError();
    });

    it('Fail with non-numerical value', function() {
        expect(function() {
            isLeapYear('asd');
        }).toThrowDeveloperError();
    });
});