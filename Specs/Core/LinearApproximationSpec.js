/*global defineSuite*/
defineSuite(['Core/LinearApproximation'], function(LinearApproximation) {
    "use strict";

    /*global it,expect*/
    it('should produce correct results', function() {
        var xTable = [2.0, 4.0];
        var yTable = [
                      2.0, 1.0,
                      3.0, 5.0,
                      4.0, 6.0,
                      34.0, 21.0
                  ];

        var s2 = LinearApproximation.interpolate(3.0, xTable, yTable, 2, 1, 0, 0, 2);

        expect(s2.length).toEqual(2);
        expect(s2[0]).toEqual(3.0);
        expect(s2[1]).toEqual(3.5);
        expect(s2[0]).toEqual(3.0);

        var xTable2 = [40, 120];
        var yTable2 = [
                       20, 40, 60,
                       80, 90, 100
                   ];

        var s3 = LinearApproximation.interpolate(80.0, xTable2, yTable2, 3, 0, 0, 0, xTable2.length);

        expect(s3.length).toEqual(3);

        var xTable3 = [20, 30, 40, 50];
        var yTable3 = [10, 20, 30, 20, 30, 40, 20, 40, 60, 80, 90, 100];

        var s4 = LinearApproximation.interpolate(40, xTable3, yTable3, 1, 2, 0, 2, 2);

        expect(s4.length).toEqual(1);
        expect(s4[0]).toEqual(20.0);
    });

    it('should produce the same result from interpolateOrderZero that it does for interpolate', function() {
        var xtable = [120, 180];
        var ytable = [
                      13378137.0000000, 0.000000000, 0,
                      13374128.3576279, 327475.593690065, 0
                  ];
        var result1 = LinearApproximation.interpolate(160.0, xtable, ytable, 3, 0, 0);
        var result2 = LinearApproximation.interpolateOrderZero(160.0, xtable, ytable, 3);

        expect(result1).toEqual(result2);
    });

    it('should produce correct results with a higher output order', function() {
        var xTable = [2.0, 4.0];
        var yTable = [
                      2.0, 1.0, 3.0, 5.0, //Position info for first point
                      0.5, 2.5, 18.0, 10.0, //Velocity info for first point.
                      4.0, 6.0, 34.0, 21.0, //Position info for second point
                      1.5, 2.5, 10.0, 12.0 //Velocity info for second point
                  ];

        var result = LinearApproximation.interpolate(3.0, xTable, yTable, 4, 1, 4, 0, xTable.length);
        expect(result.length).toEqual(20);
        expect(result[0]).toEqual(3.0);
        expect(result[1]).toEqual(3.5);
        expect(result[2]).toEqual(18.5);
        expect(result[3]).toEqual(13.0);

        expect(result[4]).toEqual(1.0);
        expect(result[5]).toEqual(2.5);
        expect(result[6]).toEqual(14.0);
        expect(result[7]).toEqual(11.0);

        expect(result[8]).toEqual(0.5);
        expect(result[9]).toEqual(0.0);
        expect(result[10]).toEqual(-4.0);
        expect(result[11]).toEqual(1.0);

        expect(result[12]).toEqual(0.0);
        expect(result[13]).toEqual(0.0);
        expect(result[14]).toEqual(0.0);
        expect(result[15]).toEqual(0.0);
        expect(result[16]).toEqual(0.0);
        expect(result[17]).toEqual(0.0);
        expect(result[18]).toEqual(0.0);
        expect(result[19]).toEqual(0.0);
    });

    it('should throw if length is greater than 2', function() {
        var xTable = [44.0, 99.0, 230.0];
        var yTable = [
                      2.3, 4.5, 6.6,
                      3.2, 4.4, 12.23
                  ];

        expect(function() {
            LinearApproximation.interpolate(2.3, xTable, yTable, 3, 0, 0, 1, xTable.length);
        }).toThrow();
    });

    it('should throw if start index exceeds the bounds of x', function() {
        var xTable = [32.0, 24.0];
        var yTable = [
                      2.0, 3.4, 4.5,
                      6.6, 7.8, 23.43
                  ];

        expect(function() {
            LinearApproximation.interpolate(2.3, xTable, yTable, 3, 0, 0, 1, xTable.length);
        }).toThrow();
    });

    it('should throw when yStride equals zero indicating that there are no dependent variables for interpolation', function() {
        var xTable = [4.0, 8.0];
        var yTable = [4.0, 8.0];

        expect(function() {
            LinearApproximation.interpolate(6.0, xTable, yTable, 0, 0, 0, 0, xTable.length);
        }).toThrow();
    });
});