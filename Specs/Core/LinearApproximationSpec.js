/*global defineSuite*/
defineSuite([
             'Core/LinearApproximation'
            ], function(
             LinearApproximation) {
    "use strict";

    /*global it,expect*/
    it('should produce correct results', function() {
        var xTable = [2.0, 4.0];
        var yTable = [2.0, 3.0, 4.0, 34.0, ];

        var s2 = LinearApproximation.interpolateOrderZero(3.0, xTable, yTable, 2);

        expect(s2.length).toEqual(2);
        expect(s2[0]).toEqual(3.0);
        expect(s2[1]).toEqual(18.5);

        var xTable2 = [40, 120];
        var yTable2 = [20, 40, 60, 80, 90, 100];

        var s3 = LinearApproximation.interpolateOrderZero(80.0, xTable2, yTable2, 3);

        expect(s3.length).toEqual(3);

        var xTable3 = [20, 30];
        var yTable3 = [10, 20, 30, 20, 30, 40, 20, 40, 60, 80, 90, 100];

        var s4 = LinearApproximation.interpolateOrderZero(40, xTable3, yTable3, 1);

        expect(s4.length).toEqual(1);
        expect(s4[0]).toEqual(30.0);
    });

    it('should throw if length is greater than 2', function() {
        var xTable = [44.0, 99.0, 230.0];
        var yTable = [2.3, 4.5, 6.6, 3.2, 4.4, 12.23];

        expect(function() {
            LinearApproximation.interpolateOrderZero(2.3, xTable, yTable, 3);
        }).toThrow();
    });

    it('should throw when yStride equals zero indicating that there are no dependent variables for interpolation', function() {
        var xTable = [4.0, 8.0];
        var yTable = [4.0, 8.0];

        expect(function() {
            LinearApproximation.interpolateOrderZero(6.0, xTable, yTable, 0);
        }).toThrow();
    });

    it('getRequiredDataPoints', function() {
        expect(LinearApproximation.getRequiredDataPoints(1)).toEqual(2);
    });

    it('getRequiredDataPoints throws if other than 1', function() {
        expect(function() {
            LinearApproximation.getRequiredDataPoints(2);
        }).toThrow();
    });
});