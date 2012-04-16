(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("CollectionAlgorithmas", function () {
        it("can perform a binary search (1)", function () {
            var array = [0, 1, 2, 3, 4, 5, 6, 7];
            var toFind = 2;
            var index = Cesium.binarySearch(array, toFind, function(a, b) { return a - b; });
            expect(index).toEqual(2);
        });

        it("can perform a binary search (2)", function () {
            var array = [0, 1, 2, 3, 4, 5, 6, 7];
            var toFind = 7;
            var index = Cesium.binarySearch(array, toFind, function(a, b) { return a - b; });
            expect(index).toEqual(7);
        });

        it("can perform a binary search (3)", function () {
            var array = [0, 1, 2, 3, 4, 5, 6, 7];
            var toFind = 10;
            var index = Cesium.binarySearch(array, toFind, function(a, b) { return a - b; });
            expect(index < 0).toBeTruthy();
        });

        it("binarySearch throws an exception if array is missing", function () {
            expect(function () {
                Cesium.binarySearch();
            }).toThrow();
        });

        it("binarySearch throws an exception if itemToFind is missing", function () {
            expect(function () {
                Cesium.binarySearch([0, 1, 2]);
            }).toThrow();
        });

        it("binarySearch throws an exception if comparator is missing", function () {
            expect(function () {
                Cesium.binarySearch([0, 1, 2], 1);
            }).toThrow();
        });
    });
}());