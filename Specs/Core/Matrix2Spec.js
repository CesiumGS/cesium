/*global defineSuite*/
defineSuite([
        'Core/Matrix2',
        'Core/Cartesian2',
        'Core/Math'
    ], function(
        Matrix2,
        Cartesian2,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('can pack and unpack', function() {
        var array = [];
        var matrix = new Matrix2(
                1.0, 2.0,
                3.0, 4.0);
        Matrix2.pack(matrix, array);
        expect(array.length).toEqual(Matrix2.packedLength);
        expect(Matrix2.unpack(array)).toEqual(matrix);
    });

    it('can pack and unpack with offset', function() {
        var packed = new Array(3);
        var offset = 3;
        var matrix = new Matrix2(
                1.0, 2.0,
                3.0, 4.0);

        Matrix2.pack(matrix, packed, offset);
        expect(packed.length).toEqual(offset + Matrix2.packedLength);

        var result = new Matrix2();
        var returnedResult = Matrix2.unpack(packed, offset, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(matrix);
    });

    it('pack throws with undefined matrix', function() {
        var array = [];
        expect(function() {
            Matrix2.pack(undefined, array);
        }).toThrowDeveloperError();
    });

    it('pack throws with undefined array', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.pack(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('unpack throws with undefined array', function() {
        expect(function() {
            Matrix2.unpack(undefined);
        }).toThrowDeveloperError();
    });

    it('fromArray works without a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var matrix = Matrix2.fromArray([1.0, 3.0, 2.0, 4.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with a result parameter', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var matrix = Matrix2.fromArray([1.0, 3.0, 2.0, 4.0], 0, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with a starting index', function() {
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var matrix = Matrix2.fromArray([0.0, 0.0, 0.0, 1.0, 3.0, 2.0, 4.0], 3, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
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

    it('fromScale works without a result parameter', function() {
        var expected = new Matrix2(
                7.0, 0.0,
                0.0, 8.0);
        var returnedResult = Matrix2.fromScale(new Cartesian2(7.0, 8.0));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromScale works with a result parameter', function() {
        var expected = new Matrix2(
                7.0, 0.0,
                0.0, 8.0);
        var result = new Matrix2();
        var returnedResult = Matrix2.fromScale(new Cartesian2(7.0, 8.0), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works without a result parameter', function() {
        var expected = new Matrix2(
                2.0, 0.0,
                0.0, 2.0);
        var returnedResult = Matrix2.fromUniformScale(2.0);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works with a result parameter', function() {
        var expected = new Matrix2(
                2.0, 0.0,
                0.0, 2.0);
        var result = new Matrix2();
        var returnedResult = Matrix2.fromUniformScale(2.0, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('fromRotation works without a result parameter', function() {
        var matrix = Matrix2.fromRotation(0.0);
        expect(matrix).toEqual(Matrix2.IDENTITY);
    });

    it('fromRotation works with a result parameter', function() {
        var expected = new Matrix2(0.0, -1.0, 1.0, 0.0);
        var result = new Matrix2();
        var matrix = Matrix2.fromRotation(CesiumMath.toRadians(90.0), result);
        expect(matrix).toBe(result);
        expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromRotation throws without angle', function() {
        expect(function() {
            Matrix2.fromRotation();
        }).toThrowDeveloperError();
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
        var returnedResult = Matrix2.toArray(Matrix2.fromColumnMajorArray(expected));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0];
        var result = [];
        var returnedResult = Matrix2.toArray(Matrix2.fromColumnMajorArray(expected), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('getElementIndex works', function() {
        var i = 0;
        for ( var col = 0; col < 2; col++) {
            for ( var row = 0; row < 2; row++) {
                var index = Matrix2.getElementIndex(col, row);
                expect(index).toEqual(i);
                i++;
            }
        }
    });

    it('getColumn works', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedColumn0 = new Cartesian2(1.0, 3.0);
        var expectedColumn1 = new Cartesian2(2.0, 4.0);

        var resultColumn0 = new Cartesian2();
        var resultColumn1 = new Cartesian2();
        var returnedResultColumn0 = Matrix2.getColumn(matrix, 0, resultColumn0);
        var returnedResultColumn1 = Matrix2.getColumn(matrix, 1, resultColumn1);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
    });

    it('setColumn works', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();

        var expected = new Matrix2(5.0, 2.0, 6.0, 4.0);
        var returnedResult = Matrix2.setColumn(matrix, 0, new Cartesian2(5.0, 6.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 7.0, 3.0, 8.0);
        returnedResult = Matrix2.setColumn(matrix, 1, new Cartesian2(7.0, 8.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getRow works', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var expectedRow0 = new Cartesian2(1.0, 2.0);
        var expectedRow1 = new Cartesian2(3.0, 4.0);

        var resultRow0 = new Cartesian2();
        var resultRow1 = new Cartesian2();
        var returnedResultRow0 = Matrix2.getRow(matrix, 0, resultRow0);
        var returnedResultRow1 = Matrix2.getRow(matrix, 1, resultRow1);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
    });

    it('setRow works', function() {
        var matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();

        var expected = new Matrix2(5.0, 6.0, 3.0, 4.0);
        var returnedResult = Matrix2.setRow(matrix, 0, new Cartesian2(5.0, 6.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix2(1.0, 2.0, 7.0, 8.0);
        returnedResult = Matrix2.setRow(matrix, 1, new Cartesian2(7.0, 8.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getScale works', function() {
        var scale = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var computedScale = Matrix2.getScale(Matrix2.fromScale(scale), result);

        expect(computedScale).toBe(result);
        expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
    });

    it('getScale throws without a matrix', function() {
        expect(function() {
            Matrix2.getScale();
        }).toThrowDeveloperError();
    });

    it('getMaximumScale works', function() {
        var m = Matrix2.fromScale(new Cartesian2(1.0, 2.0));
        expect(Matrix2.getMaximumScale(m)).toEqualEpsilon(2.0, CesiumMath.EPSILON14);
    });

    it('getMaximumScale throws without a matrix', function() {
        expect(function() {
            Matrix2.getMaximumScale();
        }).toThrowDeveloperError();
    });

    it('multiply works', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(5, 6, 7, 8);
        var expected = new Matrix2(19, 22, 43, 50);
        var result = new Matrix2();
        var returnedResult = Matrix2.multiply(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter that is an input result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(5, 6, 7, 8);
        var expected = new Matrix2(19, 22, 43, 50);
        var returnedResult = Matrix2.multiply(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('add works', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(10, 11, 12, 13);
        var expected = new Matrix2(11, 13, 15, 17);
        var result = new Matrix2();
        var returnedResult = Matrix2.add(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('add works with a result parameter that is an input result parameter', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Matrix2(10, 11, 12, 13);
        var expected = new Matrix2(11, 13, 15, 17);
        var returnedResult = Matrix2.add(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('subtract works', function() {
        var left = new Matrix2(11, 13, 15, 17);
        var right = new Matrix2(10, 11, 12, 13);
        var expected = new Matrix2(1, 2, 3, 4);
        var result = new Matrix2();
        var returnedResult = Matrix2.subtract(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('subtract works with a result parameter that is an input result parameter', function() {
        var left = new Matrix2(11, 13, 15, 17);
        var right = new Matrix2(10, 11, 12, 13);
        var expected = new Matrix2(1, 2, 3, 4);
        var returnedResult = Matrix2.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByVector works', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = new Cartesian2(5, 6);
        var expected = new Cartesian2(17, 39);
        var result = new Cartesian2();
        var returnedResult = Matrix2.multiplyByVector(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works', function() {
        var left = new Matrix2(1, 2, 3, 4);
        var right = 2;
        var expected = new Matrix2(2, 4, 6, 8);
        var result = new Matrix2();
        var returnedResult = Matrix2.multiplyByScalar(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(-1, -2, -3, -4);
        var result = new Matrix2();
        var returnedResult = Matrix2.negate(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter that is an input parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(-1, -2, -3, -4);
        var returnedResult = Matrix2.negate(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(1, 3, 2, 4);
        var result = new Matrix2();
        var returnedResult = Matrix2.transpose(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix2(1, 2, 3, 4);
        var expected = new Matrix2(1, 3, 2, 4);
        var returnedResult = Matrix2.transpose(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('abs throws without a matrix', function() {
        expect(function() {
            return Matrix2.abs();
        }).toThrowDeveloperError();
    });

    it('abs works', function() {
        var matrix = new Matrix2(-1.0, -2.0, -3.0, -4.0);
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var result = new Matrix2();
        var returnedResult = Matrix2.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix2(1.0, 2.0, 3.0, 4.0);
        returnedResult = Matrix2.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix2(1.0, -2.0, -3.0, 4.0);
        returnedResult = Matrix2.abs(matrix, result);
        expect(returnedResult).toEqual(expected);
    });

    it('abs works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix2(-1.0, -2.0, -3.0, -4.0);
        var expected = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var returnedResult = Matrix2.abs(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var right = new Matrix2(1.0, 2.0, 3.0, 4.0);
        expect(Matrix2.equals(left, right)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(5.0, 2.0, 3.0, 4.0);
        expect(Matrix2.equals(left, right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 6.0, 3.0, 4.0);
        expect(Matrix2.equals(left, right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 7.0, 4.0);
        expect(Matrix2.equals(left, right)).toEqual(false);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 3.0, 8.0);
        expect(Matrix2.equals(left, right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix2.equals(undefined, undefined)).toEqual(true);
        expect(Matrix2.equals(new Matrix2(), undefined)).toEqual(false);
        expect(Matrix2.equals(undefined, new Matrix2())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        var right = new Matrix2(1.0, 2.0, 3.0, 4.0);
        expect(Matrix2.equalsEpsilon(left, right, 1.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(5.0, 2.0, 3.0, 4.0);
        expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 6.0, 3.0, 4.0);
        expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 7.0, 4.0);
        expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix2(1.0, 2.0, 3.0, 4.0);
        right = new Matrix2(1.0, 2.0, 3.0, 8.0);
        expect(Matrix2.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix2.equalsEpsilon(left, right, 4.0)).toEqual(true);
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

    it('fromArray throws without an array', function() {
        expect(function() {
            Matrix2.fromArray();
        }).toThrowDeveloperError();
    });

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix2.fromRowMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix2.fromColumnMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('fromScale throws without scale parameter', function() {
        expect(function() {
            Matrix2.fromScale(undefined);
        }).toThrowDeveloperError();
    });

    it('fromUniformScale throws without scale parameter', function() {
        expect(function() {
            Matrix2.fromUniformScale(undefined);
        }).toThrowDeveloperError();
    });

    it('clone returns undefined without matrix parameter', function() {
        expect(Matrix2.clone(undefined)).toBeUndefined();
    });

    it('toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix2.toArray(undefined);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix2.getColumn(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getElement throws without row parameter', function() {
        var row;
        var col = 0.0;
        expect(function() {
            Matrix2.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getElement throws without column parameter', function() {
        var row = 0.0;
        var col;
        expect(function() {
            Matrix2.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without of range index parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.getColumn(matrix, 2);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setColumn(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.setColumn(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without of range index parameter', function() {
        var matrix = new Matrix2();
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setColumn(matrix, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix2.getRow(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getRow throws without of range index parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.getRow(matrix, 2);
        }).toThrowDeveloperError();
    });

    it('setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setRow(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setRow throws without cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.setRow(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setRow throws without of range index parameter', function() {
        var matrix = new Matrix2();
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.setRow(matrix, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no left parameter', function() {
        var right = new Matrix2();
        expect(function() {
            Matrix2.multiply(undefined, right);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no right parameter', function() {
        var left = new Matrix2();
        expect(function() {
            Matrix2.multiply(left, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian2();
        expect(function() {
            Matrix2.multiplyByVector(undefined, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.multiplyByVector(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix2.multiplyByScalar(undefined, 2);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix2();
        expect(function() {
            Matrix2.multiplyByScalar(matrix, {});
        }).toThrowDeveloperError();
    });

    it('negate throws with matrix parameter', function() {
        expect(function() {
            Matrix2.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('transpose throws with matrix parameter', function() {
        expect(function() {
            Matrix2.transpose(undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix2.equalsEpsilon(new Matrix2(), new Matrix2(), {});
        }).toThrowDeveloperError();
    });

    it('getColumn throws without result parameter', function() {
        expect(function() {
            Matrix2.getColumn(new Matrix2(), 1);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without result parameter', function() {
        expect(function() {
            Matrix2.setColumn(new Matrix2(), 1, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('getRow throws without result parameter', function() {
        expect(function() {
            Matrix2.getRow(new Matrix2(), 1);
        }).toThrowDeveloperError();
    });

    it('setRow throws without result parameter', function() {
        expect(function() {
            Matrix2.setRow(new Matrix2(), 1, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('getScale throws without result parameter', function() {
        expect(function() {
            Matrix2.getScale(new Matrix2());
        }).toThrowDeveloperError();
    });

    it('multiply throws without result parameter', function() {
        expect(function() {
            Matrix2.multiply(new Matrix2(), new Matrix2());
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws without result parameter', function() {
        expect(function() {
            Matrix2.multiplyByVector(new Matrix2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws without result parameter', function() {
        expect(function() {
            Matrix2.multiplyByScalar(new Matrix2(), 2);
        }).toThrowDeveloperError();
    });

    it('negate throws without result parameter', function() {
        expect(function() {
            Matrix2.negate(new Matrix2());
        }).toThrowDeveloperError();
    });

    it('transpose throws without result parameter', function() {
        expect(function() {
            Matrix2.transpose(new Matrix2());
        }).toThrowDeveloperError();
    });

    it('abs throws without result parameter', function() {
        expect(function() {
            Matrix2.abs(new Matrix2());
        }).toThrowDeveloperError();
    });
});
