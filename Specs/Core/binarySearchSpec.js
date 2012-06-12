/*global defineSuite*/
defineSuite(['Core/binarySearch'], function(binarySearch) {
    "use strict";
    /*global it,expect*/

    it('can perform a binary search (1)', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 2;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(index).toEqual(2);
    });

    it('can perform a binary search (2)', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 7;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(index).toEqual(7);
    });

    it('can perform a binary search (3)', function() {
        var array = [0, 1, 2, 3, 4, 5, 6, 7];
        var toFind = 10;
        var index = binarySearch(array, toFind, function(a, b) {
            return a - b;
        });
        expect(index < 0).toEqual(true);
    });

    it('throws an exception if array is missing', function() {
        expect(function() {
            binarySearch();
        }).toThrow();
    });

    it('throws an exception if itemToFind is missing', function() {
        expect(function() {
            binarySearch([0, 1, 2]);
        }).toThrow();
    });

    it('throws an exception if comparator is missing', function() {
        expect(function() {
            binarySearch([0, 1, 2], 1);
        }).toThrow();
    });
});
