/*global defineSuite*/
defineSuite(['Core/binarySearch'], function(binarySearch) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can perform a binary search for 0', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 0;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(index).toEqual(0);
    });

    it('can perform a binary search for item in the list', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 7;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(index).toEqual(7);
    });

    it('can perform a binary search for item in between two items in the list', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 3.5;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(~index).toEqual(4);
    });

    it('can perform a binary search for item before all items in the list', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = -2;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(~index).toEqual(0);
    });

    it('can perform a binary search for item after all items in the list', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 12;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(~index).toEqual(8);
    });

    function dummy() {
        return true;
    }

    it('throws an exception if array is missing', function() {
        expect(function() {
            binarySearch(undefined, 1, dummy);
        }).toThrow();
    });

    it('throws an exception if itemToFind is missing', function() {
        expect(function() {
            binarySearch([0, 1, 2], undefined, dummy);
        }).toThrow();
    });

    it('throws an exception if comparator is missing', function() {
        expect(function() {
            binarySearch([0, 1, 2], 1, undefined);
        }).toThrow();
    });
});