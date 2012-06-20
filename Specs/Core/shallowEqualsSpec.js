/*global defineSuite*/
defineSuite(['Core/shallowEquals'], function(shallowEquals) {
    "use strict";
    /*global it,expect*/

    it('returns false if left is undefined', function() {
        expect(shallowEquals(undefined, {
            a : 0
        })).toEqual(false);
    });

    it('return false if right is undefined', function() {
        expect(shallowEquals({
            a : 0
        }, undefined)).toEqual(false);
    });

    it('returns false if left and right are falsy', function() {
        expect(shallowEquals(undefined, null)).toEqual(false);
    });

    it('return true if left and right are undefined', function() {
        expect(shallowEquals(undefined, undefined)).toEqual(true);
    });

    it('returns true if left and right are equal', function() {
        expect(shallowEquals({
            a : 0,
            b : 1
        }, {
            a : 0,
            b : 1
        })).toEqual(true);
    });

    it('returns false if left and right are not equal', function() {
        expect(shallowEquals({
            a : 0,
            b : 1
        }, {
            a : 0,
            b : 2
        })).toEqual(false);
    });
});