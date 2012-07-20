/*global defineSuite*/
defineSuite([
         'Core/Matrix2',
         'Core/Cartesian2'
     ], function(
         Matrix2,
         Cartesian2) {
    "use strict";
    /*global it,expect*/

    it('default constructor creates values array with all zeros.', function() {
        var matrix = new Matrix2();
        expect(matrix[Matrix2.COLUMN0ROW0]).toEqual(0.0);
        expect(matrix[Matrix2.COLUMN1ROW0]).toEqual(0.0);
        expect(matrix[Matrix2.COLUMN0ROW1]).toEqual(0.0);
        expect(matrix[Matrix2.COLUMN1ROW1]).toEqual(0.0);
    });

    it('constructor sets properties from parameters.', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        expect(matrix[Matrix2.COLUMN0ROW0]).toEqual(1.0);
        expect(matrix[Matrix2.COLUMN1ROW0]).toEqual(2.0);
        expect(matrix[Matrix2.COLUMN0ROW1]).toEqual(3.0);
        expect(matrix[Matrix2.COLUMN1ROW1]).toEqual(4.0);
    });

    it('fromRowMajorArray works without a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var matrix = Matrix2.fromRowMajorArray([1.0, 2.0, 3.0, 4.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromRowMajorArray works with a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var matrix = Matrix2.fromRowMajorArray([1.0, 2.0, 3.0, 4.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works without a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var matrix = Matrix2.fromColumnMajorArray([1.0, 3.0, 2.0, 4.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works with a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var matrix = Matrix2.fromColumnMajorArray([1.0, 3.0, 2.0, 4.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('clone works without a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var returnedResult = expected.clone();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('clone works with a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var returnedResult = expected.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });


    it('toArray works without a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0];
        var returnedResult = Matrix2.fromColumnMajorArray(expected).toArray();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0];
        var result = [];
        var returnedResult = Matrix2.fromColumnMajorArray(expected).toArray(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('getColumn works without a result parameter', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedColumn0 = new Cartesian2(1.0, 3.0);
        var expectedColumn1 = new Cartesian2(2.0, 4.0);

        var resultColumn0 = matrix.getColumn(0);
        var resultColumn1 = matrix.getColumn(1);

        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toEqual(expectedColumn1);
    });

    it('getColumn works with a result parameter', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedColumn0 = new Cartesian2(1.0, 3.0);
        var expectedColumn1 = new Cartesian2(2.0, 4.0);

        var resultColumn0 = new Cartesian2();
        var resultColumn1 = new Cartesian2();
        var returnedResultColumn0 = matrix.getColumn(0, resultColumn0);
        var returnedResultColumn1 = matrix.getColumn(1, resultColumn1);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
    });

    it('setColumn works without a result parameter for each column', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);

        var expected = new Matrix2(5.0, 2.0, 6.0, 4.0);
        var result = matrix.setColumn(0, new Cartesian2(5.0, 6.0));
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 7.0, 3.0, 8.0);
        result = matrix.setColumn(1, new Cartesian2(7.0, 8.0));
        expect(result).toEqual(expected);
    });

    it('setColumn works with a result parameter for each column', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();

        var expected = new Matrix2(5.0, 2.0, 6.0, 4.0);
        var returnedResult = matrix.setColumn(0, new Cartesian2(5.0, 6.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 7.0, 3.0, 8.0);
        returnedResult = matrix.setColumn(1, new Cartesian2(7.0, 8.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getRow works without a result parameter', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedRow0 = new Cartesian2(1.0, 2.0);
        var expectedRow1 = new Cartesian2(3.0, 4.0);

        var resultRow0 = matrix.getRow(0);
        var resultRow1 = matrix.getRow(1);

        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toEqual(expectedRow1);
    });

    it('getRow works with a result parameter', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedRow0 = new Cartesian2(1.0, 2.0);
        var expectedRow1 = new Cartesian2(3.0, 4.0);

        var resultRow0 = new Cartesian2();
        var resultRow1 = new Cartesian2();
        var returnedResultRow0 = matrix.getRow(0, resultRow0);
        var returnedResultRow1 = matrix.getRow(1, resultRow1);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
    });

    it('setRow works without a result parameter for each row', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);

        var expected = new Matrix2(5.0, 6.0, 3.0, 4.0);
        var result = matrix.setRow(0, new Cartesian2(5.0, 6.0));
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 2.0, 7.0, 8.0);
        result = matrix.setRow(1, new Cartesian2(7.0, 8.0));
        expect(result).toEqual(expected);
    });

    it('setRow works with a result parameter for each row', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();

        var expected = new Matrix2(5.0, 6.0, 3.0, 4.0);
        var returnedResult = matrix.setRow(0, new Cartesian2(5.0, 6.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 2.0, 7.0, 8.0);
        returnedResult = matrix.setRow(1, new Cartesian2(7.0, 8.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('multiply works without a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(5, 6, 7, 8);
        var expected = new Matrix2(19, 22, 43, 50);
        var result = left.multiply(right);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(5, 6, 7, 8);
        var expected = new Matrix2(19, 22, 43, 50);
        var result = new Matrix2();
        var returnedResult = left.multiply(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with "this" result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(5, 6, 7, 8);
        var expected = new Matrix2(19, 22, 43, 50);
        var returnedResult = left.multiply(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByVector works without a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Cartesian2(5, 6);
        var expected = new Cartesian2(17, 39);
        var result = left.multiplyByVector(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByVector works with a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Cartesian2(5, 6);
        var expected = new Cartesian2(17, 39);
        var result = new Cartesian2();
        var returnedResult = left.multiplyByVector(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works without a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = 2;
        var expected = new Matrix2(2, 4, 6, 8);
        var result = left.multiplyByScalar(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works with a result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = 2;
        var expected = new Matrix2(2, 4, 6, 8);
        var result = new Matrix2();
        var returnedResult = left.multiplyByScalar(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works without a result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(-1, -2, -3, -4);
        var result = matrix.negate();
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(-1, -2, -3, -4);
        var result = new Matrix2();
        var returnedResult = matrix.negate(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with "this" result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(-1, -2, -3, -4);
        var returnedResult = matrix.negate(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works without a result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(1, 3, 2, 4);
        var result = matrix.transpose();
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(1, 3, 2, 4);
        var result = new Matrix2();
        var returnedResult = matrix.transpose(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with "this" result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(1, 3, 2, 4);
        var returnedResult = matrix.transpose(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var right = new Matrix2(1.0, 2.0, 3.0, 4.0);
        expect(left.equals(right)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(5.0, 2.0, 3.0, 4.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 6.0, 3.0, 4.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 7.0, 4.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 3.0, 8.0);
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix2.equals(undefined, undefined)).toEqual(true);
        expect(Matrix2.equals(new Matrix2(), undefined)).toEqual(false);
        expect(Matrix2.equals(undefined, new Matrix2())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var right = new Matrix2(1.0, 2.0, 3.0, 4.0);
        expect(left.equalsEpsilon(right, 1.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(5.0, 2.0, 3.0, 4.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 6.0, 3.0, 4.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 7.0, 4.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 3.0, 8.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);
    });

    it('equalsEpsilon works with undefined', function() {
        expect(Matrix2.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
        expect(Matrix2.equalsEpsilon(new Matrix2(), undefined, 1.0)).toEqual(false);
        expect(Matrix2.equalsEpsilon(undefined, new Matrix2(), 1.0)).toEqual(false);
    });

    it('toString', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        expect(matrix.toString()).toEqual('(1, 2)\n(3, 4)');
    });

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix2.fromRowMajorArray(undefined);
        }).toThrow();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix2.fromColumnMajorArray(undefined);
        }).toThrow();
    });

    it('static clone throws without matrix parameter', function() {
        expect(function() {
            Matrix2.clone(undefined);
        }).toThrow();
    });

    it('static toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix2.toArray(undefined);
        }).toThrow();
    });

    it('static getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix2.getColumn(undefined, 1);
        }).toThrow();
    });

    it('static getColumn throws without of range index parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.getColumn(matrix, 2);
        }).toThrow();
    });

    it('static setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setColumn(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.setColumn(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setColumn throws without of range index parameter', function() {
        var matrix = new Matrix2();
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setColumn(matrix, 2, cartesian);
        }).toThrow();
    });

    it('static getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix2.getRow(undefined, 1);
        }).toThrow();
    });

    it('static getRow throws without of range index parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.getRow(matrix, 2);
        }).toThrow();
    });

    it('static setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setRow(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setRow throws without cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.setRow(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setRow throws without of range index parameter', function() {
        var matrix = new Matrix2();
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setRow(matrix, 2, cartesian);
        }).toThrow();
    });

    it('static multiply throws with no left parameter', function() {
        var right = new Matrix2();
        expect(function() {
            Matrix2.multiply(undefined, right);
        }).toThrow();
    });

    it('static multiply throws with no right parameter', function() {
        var left = new Matrix2();
        expect(function() {
            Matrix2.multiply(left, undefined);
        }).toThrow();
    });

    it('static multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.multiplyByVector(undefined, cartesian);
        }).toThrow();
    });

    it('static multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.multiplyByVector(matrix, undefined);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix2.multiplyByScalar(undefined, 2);
        }).toThrow();
    });

    it('static multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.multiplyByScalar(matrix, {});
        }).toThrow();
    });

    it('static negate throws with matrix parameter', function() {
        expect(function() {
            Matrix2.negate(undefined);
        }).toThrow();
    });

    it('static transpose throws with matrix parameter', function() {
        expect(function() {
            Matrix2.transpose(undefined);
        }).toThrow();
    });

    it('static equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix2.equalsEpsilon(new Matrix2(), new Matrix2(), {});
        }).toThrow();
    });
});