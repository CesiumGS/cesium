defineSuite(['Core/LagrangePolynomialApproximation'], function(LagrangePolynomialApproximation) {
    "use strict";
    /*global it,expect*/
    it('should match the results produced by Components', function() {
        var xTable = [0, 60, 120, 180, 240, 300, 360, 420];
        var yTable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];

        var x = 100.0;
        var result = LagrangePolynomialApproximation.interpolate(x, xTable, yTable, 3, 0, 2);

        var componentsResult = [13367002.870928623, 545695.73881006474, 0.0, -222.65168787080734, 5453.9288825712047, 0.0, -2.2252812050303135, -0.090845081953492723, 0.0];

        expect(result).toEqualArrayEpsilon(componentsResult, 1e-15);
    });

    it('should produce the same result from interpolateWithDegree that it does for interpolate', function() {
        var xtable = [0, 60, 120, 180, 240, 300, 360, 420];
        var ytable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];

        var result1 = LagrangePolynomialApproximation.interpolateWithDegree(160.0, xtable, ytable, 1, 3, 0, 1);
        var result2 = LagrangePolynomialApproximation.interpolate(160.0, xtable, ytable, 3, 0, 1, 2, 2);

        expect(result1).toEqual(result2);
    });

    it('should produce the same result from interpolateOrderZero that it does for interpolate', function() {
        var xtable = [0, 60, 120, 180, 240, 300, 360, 420];
        var ytable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];
        var result1 = LagrangePolynomialApproximation.interpolate(160.0, xtable, ytable, 3, 0, 0);
        var result2 = LagrangePolynomialApproximation.interpolateOrderZero(160.0, xtable, ytable, 3);

        expect(result1).toEqual(result2);
    });

    it('should produce correct results with higher input orders', function() {
        var xTable = [1, 2, 3, 4];
        var yTable0IO = [2, 5, 2, 0];
        var yTable1IO = [2, 0, 5, -1, 2, 2, 0, -2];

        var result0IO = LagrangePolynomialApproximation.interpolate(2.5, xTable, yTable0IO, 1, 0, 5);
        var result1IO = LagrangePolynomialApproximation.interpolate(2.5, xTable, yTable1IO, 1, 1, 6);

        expect(6).toEqual(result0IO.length);
        expect(3.8125).toEqual(result0IO[0]);
        expect(-3.29166667).toEqualEpsilon(result0IO[1], 1e-3);
        expect(-2.5).toEqual(result0IO[2]);
        expect(7.0).toEqual(result0IO[3]);
        expect(0.0).toEqual(result0IO[4]);
        expect(0.0).toEqual(result0IO[5]);

        expect(7).toEqual(result1IO.length);
        expect(3.8125).toEqual(result1IO[0]);
        expect(0.6875).toEqual(result1IO[1]);
        expect(3.45833333).toEqualEpsilon(result1IO[2], 1e-3);
        expect(-1.5).toEqual(result1IO[3]);
        expect(-11.0).toEqual(result1IO[4]);
        expect(0.0).toEqual(result1IO[5]);
        expect(0.0).toEqual(result1IO[6]);
    });
});