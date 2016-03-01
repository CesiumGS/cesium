/*global defineSuite*/
defineSuite([
        'Core/LinearApproximation'
    ], function(
        LinearApproximation) {
    'use strict';

    it('should produce correct results', function() {
        var xTable = [2.0, 4.0];
        var yTable = [2.0, 3.0, 4.0, 34.0];

        var results = LinearApproximation.interpolateOrderZero(3.0, xTable, yTable, 2);

        expect(results.length).toEqual(2);
        expect(results[0]).toEqual(3.0);
        expect(results[1]).toEqual(18.5);
    });

    it('should produce correct results with a result parameter', function() {
        var xTable = [2.0, 4.0];
        var yTable = [2.0, 3.0, 4.0, 34.0];

        var result = new Array(2);
        var results = LinearApproximation.interpolateOrderZero(3.0, xTable, yTable, 2, result);

        expect(result).toBe(results);
        expect(results.length).toEqual(2);
        expect(results[0]).toEqual(3.0);
        expect(results[1]).toEqual(18.5);
    });

    it('should produce correct results 2', function() {
        var xTable2 = [40, 120];
        var yTable2 = [20, 40, 60, 80, 90, 100];

        var results = LinearApproximation.interpolateOrderZero(80.0, xTable2, yTable2, 3);

        expect(results.length).toEqual(3);
        expect(results[0]).toEqual(50.0);
        expect(results[1]).toEqual(65.0);
        expect(results[2]).toEqual(80.0);
    });

    it('should produce correct results 3', function() {
        var xTable3 = [20, 30];
        var yTable3 = [10, 20, 30, 20, 30, 40, 20, 40, 60, 80, 90, 100];

        var results = LinearApproximation.interpolateOrderZero(40, xTable3, yTable3, 1);

        expect(results.length).toEqual(1);
        expect(results[0]).toEqual(30.0);
    });

    it('should throw if length is greater than 2', function() {
        var xTable = [44.0, 99.0, 230.0];
        var yTable = [2.3, 4.5, 6.6, 3.2, 4.4, 12.23];

        expect(function() {
            LinearApproximation.interpolateOrderZero(2.3, xTable, yTable, 3);
        }).toThrowDeveloperError();
    });

    it('should throw when yStride equals zero indicating that there are no dependent variables for interpolation', function() {
        var xTable = [4.0, 8.0];
        var yTable = [4.0, 8.0];

        expect(function() {
            LinearApproximation.interpolateOrderZero(6.0, xTable, yTable, 0);
        }).toThrowDeveloperError();
    });

    it('getRequiredDataPoints returns 2', function() {
        expect(LinearApproximation.getRequiredDataPoints(1)).toEqual(2);
    });
});
