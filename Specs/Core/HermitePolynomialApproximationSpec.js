/*global defineSuite*/
defineSuite([
             'Core/HermitePolynomialApproximation'
            ], function(
             HermitePolynomialApproximation) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    //The results of these specs were validated against STK Components
    //an aerospace SDK available from Analytical Graphics. www.agi.com/components/

    var xTable = [0, 60, 120, 180, 240, 300, 360, 420];
    var yTable = [
                  13378137.0000000, 0,
                  13374128.3576279, 0,
                  13362104.8328212, 0,
                  13342073.6310691, 0,
                  13314046.7567223, 0,
                  13278041.0057990, 0,
                  13234077.9559193, 0,
                  13182183.9533740, 0
              ];
    var dyTable = [
                   0.000000000000, 0,
                   -133.614738921601, 0,
                   -267.149404854867, 0,
                   -400.523972797808, 0,
                   -533.658513692378, 0,
                   -666.473242324565, 0,
                   -798.888565138278, 0,
                   -930.825127934390, 0
               ];

    var yTableCombined = new Array(yTable.length * 2);

    for ( var i = 0; i < yTable.length / 2; ++i) {
        yTableCombined[i * 4 + 0] = yTable[i * 2 + 0];
        yTableCombined[i * 4 + 1] = yTable[i * 2 + 1];
        yTableCombined[i * 4 + 2] = yTable[i * 2 + 2];
        yTableCombined[i * 4 + 3] = dyTable[i * 2 + 0];
        yTableCombined[i * 4 + 4] = dyTable[i * 2 + 1];
        yTableCombined[i * 4 + 5] = dyTable[i * 2 + 2];
    }

    var x = 100.0;

    it('interpolating produces correct results.', function() {
        var result = HermitePolynomialApproximation.interpolateOrderZero(x, xTable, yTableCombined, 2);
        var expectedResult = [13379311.51716268, 92.73903788149451];
        expect(result).toEqualEpsilon(expectedResult, 1e-15);
    });

    it('interpolating produces correct results with a result parameter.', function() {
        var result = new Array(2);
        var returnedResult = HermitePolynomialApproximation.interpolateOrderZero(x, xTable, yTableCombined, 2, result);
        var expectedResult = [13379311.51716268, 92.73903788149451];
        expect(result).toBe(returnedResult);
        expect(result).toEqualEpsilon(expectedResult, 1e-15);
    });

    it('getRequiredDataPoints should be 1 more than degree, except for 0, which requires 2', function() {
        expect(HermitePolynomialApproximation.getRequiredDataPoints(0)).toEqual(2);
        expect(HermitePolynomialApproximation.getRequiredDataPoints(1)).toEqual(2);
        expect(HermitePolynomialApproximation.getRequiredDataPoints(2)).toEqual(3);
        expect(HermitePolynomialApproximation.getRequiredDataPoints(3)).toEqual(4);
    });
});