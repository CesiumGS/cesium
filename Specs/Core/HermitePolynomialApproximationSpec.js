defineSuite(['Core/HermitePolynomialApproximation'], function(HermitePolynomialApproximation) {
    "use strict";
    /*global it,expect*/

    it('should match the results produced by Components', function() {
        var xTable = [0, 60, 120, 180, 240, 300, 360, 420];
        var yTable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];
        var dyTable = [0.000000000000, 5458.47176691947, 0, -133.614738921601, 5456.83618333919, 0, -267.149404854867, 5451.93041277513, 0, -400.523972797808, 5443.75739517027, 0, -533.658513692378,
                5432.32202847183, 0, -666.473242324565, 5417.63116569613, 0, -798.888565138278, 5399.69361082164, 0, -930.825127934390, 5378.52011351288, 0];

        expect(xTable.length * 3).toEqual(yTable.length);
        expect(yTable.length).toEqual(dyTable.length);

        var yTableCombined = new Array(yTable.length * 2);

        for ( var i = 0; i < yTable.length / 3; ++i) {
            yTableCombined[i * 6 + 0] = yTable[i * 3 + 0];
            yTableCombined[i * 6 + 1] = yTable[i * 3 + 1];
            yTableCombined[i * 6 + 2] = yTable[i * 3 + 2];
            yTableCombined[i * 6 + 3] = dyTable[i * 3 + 0];
            yTableCombined[i * 6 + 4] = dyTable[i * 3 + 1];
            yTableCombined[i * 6 + 5] = dyTable[i * 3 + 2];
        }

        var x = 100.0;

        var result = HermitePolynomialApproximation.interpolate(x, xTable, yTableCombined, 3, 1, 1);

        var componentsResult = [13367002.87092863, 545695.73881006264, 0.0, -222.6516878705215, 5453.92888257129, 0.0];

        expect(result).toEqualArrayEpsilon(componentsResult, 1e-15);
    });

    it('should match the results produced by Components for large arrays', function() {
        var numPts = 50;
        var xTable = new Array(numPts);
        for ( var i = 0; i < xTable.length; i++) {
            xTable[i] = i;
        }

        var yTable = new Array(numPts * 3);
        var dyTable = new Array(numPts * 3);

        expect(xTable.length * 3).toEqual(yTable.length);
        expect(yTable.length).toEqual(dyTable.length);

        for (i = 0; i < numPts; i++) {
            yTable[3 * i] = Math.pow((xTable[i] - numPts / 2), 3);
            dyTable[3 * i] = 3 * Math.pow((xTable[i] - numPts / 2), 2);

            yTable[3 * i + 1] = 3 * Math.sin(xTable[i] / 6);
            dyTable[3 * i + 1] = 0.5 * Math.cos(xTable[i] / 6);

            yTable[3 * i + 2] = Math.pow(Math.E, (xTable[i] - numPts / 2) / 10);
            dyTable[3 * i + 2] = 0.1 * Math.pow(Math.E, (xTable[i] - numPts / 2) / 10);
        }

        var yTableCombined = new Array(yTable.length * 2);
        for (i = 0; i < yTable.length / 3; ++i) {
            yTableCombined[i * 6 + 0] = yTable[i * 3 + 0];
            yTableCombined[i * 6 + 1] = yTable[i * 3 + 1];
            yTableCombined[i * 6 + 2] = yTable[i * 3 + 2];
            yTableCombined[i * 6 + 3] = dyTable[i * 3 + 0];
            yTableCombined[i * 6 + 4] = dyTable[i * 3 + 1];
            yTableCombined[i * 6 + 5] = dyTable[i * 3 + 2];
        }

        var x = 20.5;

        var result = HermitePolynomialApproximation.interpolateWithDegree(x, xTable, yTableCombined, 7, 3, 1, 1);

        var componentsResult = [-91.125, -0.81485450435264861, 0.63762815162439379, 60.75, -0.48120254819647229, 0.06376281516395714];

        expect(result).toEqualArrayEpsilon(componentsResult, 1e-15);
    });

    it('should match the results produced by Components for small degrees', function() {
        var i;
        var numPts = 3;
        var xTable = new Array(numPts);
        xTable[0] = 19;
        xTable[1] = 20;
        xTable[2] = 21;

        var yTable = new Array(numPts * 3);
        var dyTable = new Array(numPts * 3);

        expect(xTable.length * 3).toEqual(yTable.length);
        expect(yTable.length).toEqual(dyTable.length);

        for (i = 0; i < numPts; i++) {
            yTable[3 * i] = Math.pow((xTable[i] - 25), 3);
            dyTable[3 * i] = 3 * Math.pow((xTable[i] - 25), 2);

            yTable[3 * i + 1] = 3 * Math.sin(xTable[i] / 6);
            dyTable[3 * i + 1] = 0.5 * Math.cos(xTable[i] / 6);

            yTable[3 * i + 2] = Math.pow(Math.E, (xTable[i] - 25) / 10);
            dyTable[3 * i + 2] = 0.1 * Math.pow(Math.E, (xTable[i] - 25) / 10);
        }

        var yTableCombined = new Array(yTable.length * 2);

        for (i = 0; i < yTable.length / 3; ++i) {
            yTableCombined[i * 6 + 0] = yTable[i * 3 + 0];
            yTableCombined[i * 6 + 1] = yTable[i * 3 + 1];
            yTableCombined[i * 6 + 2] = yTable[i * 3 + 2];
            yTableCombined[i * 6 + 3] = dyTable[i * 3 + 0];
            yTableCombined[i * 6 + 4] = dyTable[i * 3 + 1];
            yTableCombined[i * 6 + 5] = dyTable[i * 3 + 2];
        }

        var x = 20.5;

        var result = HermitePolynomialApproximation.interpolateWithDegree(x, xTable, yTableCombined, 7, 3, 1, 1);

        var componentsResult = [-91.125, -0.81485539380478811, 0.63762816572474934, 60.75, -0.48120550709317134, 0.0637628624090974];

        expect(result).toEqualArrayEpsilon(componentsResult, 1e-15);
    });

    it('should match the results produced by Components for a non-zero start index', function() {
        var xTable = [-5, -4, -3, -2, -1, 0, 60, 120, 180, 240, 300, 360, 420];
        var yTable = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691,
                981641.896976832, 0, 13314046.7567223, 1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];
        var dyTable = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.000000000000, 5458.47176691947, 0, -133.614738921601, 5456.83618333919, 0, -267.149404854867, 5451.93041277513, 0,
                -400.523972797808, 5443.75739517027, 0, -533.658513692378, 5432.32202847183, 0, -666.473242324565, 5417.63116569613, 0, -798.888565138278, 5399.69361082164, 0, -930.825127934390,
                5378.52011351288, 0];

        expect(xTable.length * 3).toEqual(yTable.length);
        expect(yTable.length).toEqual(dyTable.length);

        var yTableCombined = new Array(yTable.length * 2);
        for ( var i = 0; i < yTable.length / 3; ++i) {
            yTableCombined[i * 6 + 0] = yTable[i * 3 + 0];
            yTableCombined[i * 6 + 1] = yTable[i * 3 + 1];
            yTableCombined[i * 6 + 2] = yTable[i * 3 + 2];
            yTableCombined[i * 6 + 3] = dyTable[i * 3 + 0];
            yTableCombined[i * 6 + 4] = dyTable[i * 3 + 1];
            yTableCombined[i * 6 + 5] = dyTable[i * 3 + 2];
        }

        var x = 100.0;

        var expectedResult = [13367002.870928625, 545695.73881006264, 0.0, -222.65168787012135, 5453.9288825713256, 0.0];

        var result = HermitePolynomialApproximation.interpolate(x, xTable, yTableCombined, 3, 1, 1, 5, 8);
        expect(result).toEqualArrayEpsilon(expectedResult, 1e-8);
    });

    it('should produce the same result from interpolateWithDegree that it does for interpolate', function() {
        var xTable = [0, 60, 120, 180, 240, 300, 360, 420];
        var yTable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];
        var dyTable = [0.000000000000, 5458.47176691947, 0, -133.614738921601, 5456.83618333919, 0, -267.149404854867, 5451.93041277513, 0, -400.523972797808, 5443.75739517027, 0, -533.658513692378,
                5432.32202847183, 0, -666.473242324565, 5417.63116569613, 0, -798.888565138278, 5399.69361082164, 0, -930.825127934390, 5378.52011351288, 0];

        expect(yTable.length).toEqual(dyTable.length);

        var yTableCombined = new Array(yTable.length * 2);
        for ( var i = 0; i < yTable.length / 3; i++) {
            yTableCombined[i * 6 + 0] = yTable[i * 3 + 0];
            yTableCombined[i * 6 + 1] = yTable[i * 3 + 1];
            yTableCombined[i * 6 + 2] = yTable[i * 3 + 2];
            yTableCombined[i * 6 + 3] = dyTable[i * 3 + 0];
            yTableCombined[i * 6 + 4] = dyTable[i * 3 + 1];
            yTableCombined[i * 6 + 5] = dyTable[i * 3 + 2];
        }

        var result1 = HermitePolynomialApproximation.interpolateWithDegree(160.0, xTable, yTableCombined, 1, 3, 1, 1);
        var result2 = HermitePolynomialApproximation.interpolate(160.0, xTable, yTableCombined, 3, 1, 1, 2, 2);
        expect(result1).toEqual(result2);
    });

    it('should produce the same result from interpolateOrderZero that it does for interpolate', function() {
        var xtable = [0, 60, 120, 180, 240, 300, 360, 420];
        var ytable = [13378137.0000000, 0.000000000, 0, 13374128.3576279, 327475.593690065, 0, 13362104.8328212, 654754.936954423, 0, 13342073.6310691, 981641.896976832, 0, 13314046.7567223,
                1307940.576089510, 0, 13278041.0057990, 1633455.429171170, 0, 13234077.9559193, 1957991.380833850, 0, 13182183.9533740, 2281353.942328160, 0];
        var result1 = HermitePolynomialApproximation.interpolate(160.0, xtable, ytable, 3, 0, 0);
        var result2 = HermitePolynomialApproximation.interpolateOrderZero(160.0, xtable, ytable, 3);

        expect(result1).toEqual(result2);
    });

    it('to produce consistent results with different input and output orders', function() {
        var i;
        var numPts = 50;
        var xTable = new Array(numPts);
        for (i = 0; i < numPts; i++) {
            xTable[i] = i;
        }

        var yTable = new Array(numPts);
        var dyTable = new Array(numPts);
        var d2yTable = new Array(numPts);

        for (i = 0; i < numPts; i++) {
            yTable[i] = Math.pow((xTable[i] - numPts / 2), 3);
            dyTable[i] = 3 * Math.pow((xTable[i] - numPts / 2), 2);
            d2yTable[i] = 6 * (xTable[i] - numPts / 2);
        }

        var yTableOrder1 = new Array(yTable.length * 2);
        var yTableOrder2 = new Array(yTable.length * 3);

        for (i = 0; i < numPts; ++i) {
            yTableOrder1[i * 2] = yTable[i];
            yTableOrder1[i * 2 + 1] = dyTable[i];

            yTableOrder2[i * 3] = yTable[i];
            yTableOrder2[i * 3 + 1] = dyTable[i];
            yTableOrder2[i * 3 + 2] = d2yTable[i];
        }

        var x = 20.5;

        var resultInput0 = HermitePolynomialApproximation.interpolate(x, xTable, yTable, 1, 0, 4, 19, 3);

        var resultInput1 = HermitePolynomialApproximation.interpolate(x, xTable, yTableOrder1, 1, 1, 7, 19, 3);

        var resultInput2 = HermitePolynomialApproximation.interpolate(x, xTable, yTableOrder2, 1, 2, 10, 19, 3);

        expect(-90.75).toEqual(resultInput0[0]);
        expect(61.0).toEqual(resultInput0[1]);
        expect(-30.0).toEqual(resultInput0[2]);
        expect(0.0).toEqual(resultInput0[3]);
        expect(0.0).toEqual(resultInput0[4]);

        expect(-91.125).toEqual(resultInput1[0]);
        expect(60.75).toEqual(resultInput1[1]);
        expect(-27.0).toEqual(resultInput1[2]);
        expect(6.0).toEqual(resultInput1[3]);
        expect(0.0).toEqual(resultInput1[4]);
        expect(0.0).toEqual(resultInput1[5]);
        expect(0.0).toEqual(resultInput1[6]);

        expect(-91.125).toEqual(resultInput2[0]);
        expect(60.75).toEqual(resultInput2[1]);
        expect(-27.0).toEqual(resultInput2[2]);
        expect(6.0).toEqual(resultInput2[3]);
        expect(0.0).toEqual(resultInput2[4]);
        expect(0.0).toEqual(resultInput2[5]);
        expect(0.0).toEqual(resultInput2[6]);
        expect(0.0).toEqual(resultInput2[7]);
        expect(0.0).toEqual(resultInput2[8]);
        expect(0.0).toEqual(resultInput2[9]);
    });
});