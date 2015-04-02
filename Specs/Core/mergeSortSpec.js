/*global defineSuite*/
defineSuite([
        'Core/mergeSort',
        'Core/BoundingSphere',
        'Core/Cartesian3'
    ], function(
        mergeSort,
        BoundingSphere,
        Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

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

    it('sorts with user defined object', function() {
        var array = [
            new BoundingSphere(new Cartesian3(-2.0, 0.0, 0.0), 1.0),
            new BoundingSphere(new Cartesian3(-1.0, 0.0, 0.0), 1.0),
            new BoundingSphere(new Cartesian3(-3.0, 0.0, 0.0), 1.0)
        ];
        var position = Cartesian3.ZERO;
        var comparator = function(a, b, position) {
            return BoundingSphere.distanceSquaredTo(b, position) - BoundingSphere.distanceSquaredTo(a, position);
        };
        var expected = [array[2], array[0], array[1]];
        mergeSort(array, comparator, position);
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