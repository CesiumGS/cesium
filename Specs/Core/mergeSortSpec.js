/*global defineSuite*/
defineSuite(['Core/mergeSort'], function(mergeSort) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('sorts', function() {
        var array = [0, 9, 1, 8, 2, 7, 3, 6, 4, 5];
        mergeSort(array, function(a, b) {
            return a - b;
        });
        var expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        expect(array).toEqual(expected);
    });

    it('stable sorts', function() {
        var array = [{ value : 5 }, { value : 10 }, { value : 5 }, { value : 0 }];
        var expected = [array[3], array[0], array[2], array[1]];
        mergeSort(array, function(a, b) {
            return a.value - b.value;
        });
        expect(array).toEqual(expected);
    });

    function dummy() {
        return true;
    }

    it('throws an exception if array is missing', function() {
        expect(function() {
            mergeSort(undefined, dummy);
        }).toThrowDeveloperError();
    });

    it('throws an exception if comparator is missing', function() {
        expect(function() {
            mergeSort([0, 1, 2], undefined);
        }).toThrowDeveloperError();
    });
});