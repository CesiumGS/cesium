/*global defineSuite*/
defineSuite([
         'Core/Matrix3',
         'Core/Cartesian3',
         'Core/Math',
         'Core/Quaternion'
     ], function(
         Matrix3,
         Cartesian3,
         CesiumMath,
         Quaternion) {
    "use strict";
    /*global it,expect*/

    it('default constructor creates values array with all zeros.', function() {
        var matrix = new Matrix3();
        expect(matrix[Matrix3.COLUMN0ROW0]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN1ROW0]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN2ROW0]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN0ROW1]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN1ROW1]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN2ROW1]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN0ROW2]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN1ROW2]).toEqual(0.0);
        expect(matrix[Matrix3.COLUMN2ROW2]).toEqual(0.0);
    });

    it('constructor sets properties from parameters.', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(matrix[Matrix3.COLUMN0ROW0]).toEqual(1.0);
        expect(matrix[Matrix3.COLUMN1ROW0]).toEqual(2.0);
        expect(matrix[Matrix3.COLUMN2ROW0]).toEqual(3.0);
        expect(matrix[Matrix3.COLUMN0ROW1]).toEqual(4.0);
        expect(matrix[Matrix3.COLUMN1ROW1]).toEqual(5.0);
        expect(matrix[Matrix3.COLUMN2ROW1]).toEqual(6.0);
        expect(matrix[Matrix3.COLUMN0ROW2]).toEqual(7.0);
        expect(matrix[Matrix3.COLUMN1ROW2]).toEqual(8.0);
        expect(matrix[Matrix3.COLUMN2ROW2]).toEqual(9.0);
    });

    it('fromQuaternion works without a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(sPiOver4);
        var quatnerion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);

        var returnedResult = Matrix3.fromQuaternion(quatnerion);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromQuaternion works with a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = new Cartesian3(0.0, 0.0, 1.0).multiplyByScalar(sPiOver4);
        var quatnerion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromQuaternion(quatnerion, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromRowMajorArray works without a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var matrix = Matrix3.fromRowMajorArray([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromRowMajorArray works with a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromRowMajorArray([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works without a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var matrix = Matrix3.fromColumnMajorArray([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works with a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromColumnMajorArray([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('clone works without a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var returnedResult = expected.clone();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('clone works with a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var returnedResult = expected.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });


    it('toArray works without a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        var returnedResult = Matrix3.fromColumnMajorArray(expected).toArray();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        var result = [];
        var returnedResult = Matrix3.fromColumnMajorArray(expected).toArray(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('getColumn works without a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedColumn0 = new Cartesian3(1.0, 4.0, 7.0);
        var expectedColumn1 = new Cartesian3(2.0, 5.0, 8.0);
        var expectedColumn2 = new Cartesian3(3.0, 6.0, 9.0);

        var resultColumn0 = matrix.getColumn(0);
        var resultColumn1 = matrix.getColumn(1);
        var resultColumn2 = matrix.getColumn(2);

        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toEqual(expectedColumn2);
    });

    it('getColumn works with a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedColumn0 = new Cartesian3(1.0, 4.0, 7.0);
        var expectedColumn1 = new Cartesian3(2.0, 5.0, 8.0);
        var expectedColumn2 = new Cartesian3(3.0, 6.0, 9.0);

        var resultColumn0 = new Cartesian3();
        var resultColumn1 = new Cartesian3();
        var resultColumn2 = new Cartesian3();
        var returnedResultColumn0 = matrix.getColumn(0, resultColumn0);
        var returnedResultColumn1 = matrix.getColumn(1, resultColumn1);
        var returnedResultColumn2 = matrix.getColumn(2, resultColumn2);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toBe(returnedResultColumn2);
        expect(resultColumn2).toEqual(expectedColumn2);
    });

    it('setColumn works without a result parameter for each column', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);

        var expected = new Matrix3(10.0, 2.0, 3.0, 11.0, 5.0, 6.0, 12.0, 8.0, 9.0);
        var result = matrix.setColumn(0, new Cartesian3(10.0, 11.0, 12.0));
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 13.0, 3.0, 4.0, 14.0, 6.0, 7.0, 15.0, 9.0);
        result = matrix.setColumn(1, new Cartesian3(13.0, 14.0, 15.0));
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 16.0, 4.0, 5.0, 17.0, 7.0, 8.0, 18.0);
        result = matrix.setColumn(2, new Cartesian3(16.0, 17.0, 18.0));
        expect(result).toEqual(expected);
    });

    it('setColumn works with a result parameter for each column', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();

        var expected = new Matrix3(10.0, 2.0, 3.0, 11.0, 5.0, 6.0, 12.0, 8.0, 9.0);
        var returnedResult = matrix.setColumn(0, new Cartesian3(10.0, 11.0, 12.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 13.0, 3.0, 4.0, 14.0, 6.0, 7.0, 15.0, 9.0);
        returnedResult = matrix.setColumn(1, new Cartesian3(13.0, 14.0, 15.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 16.0, 4.0, 5.0, 17.0, 7.0, 8.0, 18.0);
        returnedResult = matrix.setColumn(2, new Cartesian3(16.0, 17.0, 18.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getRow works without a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedRow0 = new Cartesian3(1.0, 2.0, 3.0);
        var expectedRow1 = new Cartesian3(4.0, 5.0, 6.0);
        var expectedRow2 = new Cartesian3(7.0, 8.0, 9.0);

        var resultRow0 = matrix.getRow(0);
        var resultRow1 = matrix.getRow(1);
        var resultRow2 = matrix.getRow(2);

        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toEqual(expectedRow2);
    });

    it('getRow works with a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedRow0 = new Cartesian3(1.0, 2.0, 3.0);
        var expectedRow1 = new Cartesian3(4.0, 5.0, 6.0);
        var expectedRow2 = new Cartesian3(7.0, 8.0, 9.0);

        var resultRow0 = new Cartesian3();
        var resultRow1 = new Cartesian3();
        var resultRow2 = new Cartesian3();
        var returnedResultRow0 = matrix.getRow(0, resultRow0);
        var returnedResultRow1 = matrix.getRow(1, resultRow1);
        var returnedResultRow2 = matrix.getRow(2, resultRow2);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toBe(returnedResultRow2);
        expect(resultRow2).toEqual(expectedRow2);
    });

    it('setRow works without a result parameter for each row', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);

        var expected = new Matrix3(10.0, 11.0, 12.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = matrix.setRow(0, new Cartesian3(10.0, 11.0, 12.0));
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 13.0, 14.0, 15.0, 7.0, 8.0, 9.0);
        result = matrix.setRow(1, new Cartesian3(13.0, 14.0, 15.0));
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 16.0, 17.0, 18.0);
        result = matrix.setRow(2, new Cartesian3(16.0, 17.0, 18.0));
        expect(result).toEqual(expected);
    });

    it('setRow works with a result parameter for each row', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();

        var expected = new Matrix3(10.0, 11.0, 12.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var returnedResult = matrix.setRow(0, new Cartesian3(10.0, 11.0, 12.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 13.0, 14.0, 15.0, 7.0, 8.0, 9.0);
        returnedResult = matrix.setRow(1, new Cartesian3(13.0, 14.0, 15.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 16.0, 17.0, 18.0);
        returnedResult = matrix.setRow(2, new Cartesian3(16.0, 17.0, 18.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('multiply works without a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
        var result = left.multiply(right);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
        var result = new Matrix3();
        var returnedResult = left.multiply(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with "this" result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
        var returnedResult = left.multiply(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByVector works without a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Cartesian3(10, 11, 12);
        var expected = new Cartesian3(68, 167, 266);
        var result = left.multiplyByVector(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByVector works with a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Cartesian3(10, 11, 12);
        var expected = new Cartesian3(68, 167, 266);
        var result = new Cartesian3();
        var returnedResult = left.multiplyByVector(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works without a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = 2;
        var expected = new Matrix3(2, 4, 6, 8, 10, 12, 14, 16, 18);
        var result = left.multiplyByScalar(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works with a result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = 2;
        var expected = new Matrix3(2, 4, 6, 8, 10, 12, 14, 16, 18);
        var result = new Matrix3();
        var returnedResult = left.multiplyByScalar(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works without a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var result = matrix.negate();
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var result = new Matrix3();
        var returnedResult = matrix.negate(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with "this" result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var returnedResult = matrix.negate(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works without a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
        var result = matrix.transpose();
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
        var result = new Matrix3();
        var returnedResult = matrix.transpose(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with "this" result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
        var returnedResult = matrix.transpose(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix3.equals(undefined, undefined)).toEqual(true);
        expect(Matrix3.equals(new Matrix3(), undefined)).toEqual(false);
        expect(Matrix3.equals(undefined, new Matrix3())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 1.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);
    });

    it('equalsEpsilon works with undefined', function() {
        expect(Matrix3.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
        expect(Matrix3.equalsEpsilon(new Matrix3(), undefined, 1.0)).toEqual(false);
        expect(Matrix3.equalsEpsilon(undefined, new Matrix3(), 1.0)).toEqual(false);
    });

    it('toString', function() {
        var matrix = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        expect(matrix.toString()).toEqual('(1, 2, 3)\n(4, 5, 6)\n(7, 8, 9)');
    });

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix3.fromRowMajorArray(undefined);
        }).toThrow();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix3.fromColumnMajorArray(undefined);
        }).toThrow();
    });

    it('static clone throws without matrix parameter', function() {
        expect(function() {
            Matrix3.clone(undefined);
        }).toThrow();
    });

    it('static toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix3.toArray(undefined);
        }).toThrow();
    });

    it('static getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix3.getColumn(undefined, 1);
        }).toThrow();
    });

    it('static getColumn throws without of range index parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.getColumn(matrix, 3);
        }).toThrow();
    });

    it('static setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setColumn(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.setColumn(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setColumn throws without of range index parameter', function() {
        var matrix = new Matrix3();
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setColumn(matrix, 3, cartesian);
        }).toThrow();
    });

    it('static getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix3.getRow(undefined, 1);
        }).toThrow();
    });

    it('static getRow throws without of range index parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.getRow(matrix, 3);
        }).toThrow();
    });

    it('static setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setRow(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setRow throws without cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.setRow(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setRow throws without of range index parameter', function() {
        var matrix = new Matrix3();
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setRow(matrix, 3, cartesian);
        }).toThrow();
    });

    it('static multiply throws with no left parameter', function() {
        var right = new Matrix3();
        expect(function() {
            Matrix3.multiply(undefined, right);
        }).toThrow();
    });

    it('static multiply throws with no right parameter', function() {
        var left = new Matrix3();
        expect(function() {
            Matrix3.multiply(left, undefined);
        }).toThrow();
    });

    it('static multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.multiplyByVector(undefined, cartesian);
        }).toThrow();
    });

    it('static multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.multiplyByVector(matrix, undefined);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix3.multiplyByScalar(undefined, 2);
        }).toThrow();
    });

    it('static multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.multiplyByScalar(matrix, {});
        }).toThrow();
    });

    it('static negate throws without matrix parameter', function() {
        expect(function() {
            Matrix3.negate(undefined);
        }).toThrow();
    });

    it('static transpose throws without matrix parameter', function() {
        expect(function() {
            Matrix3.transpose(undefined);
        }).toThrow();
    });

    it('static fromQuaternion throws without quaternion parameter', function() {
        expect(function() {
            Matrix3.fromQuaternion(undefined);
        }).toThrow();
    });

    it('static equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix3.equalsEpsilon(new Matrix3(), new Matrix3(), {});
        }).toThrow();
    });
});