defineSuite([
        'Core/Matrix3',
        'Core/Cartesian3',
        'Core/HeadingPitchRoll',
        'Core/Math',
        'Core/Quaternion'
    ], function(
        Matrix3,
        Cartesian3,
        HeadingPitchRoll,
        CesiumMath,
        Quaternion) {
    'use strict';

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

    it('can pack and unpack', function() {
        var array = [];
        var matrix = new Matrix3(
            1.0, 2.0, 3.0,
            4.0, 5.0, 6.0,
            7.0, 8.0, 9.0);
        Matrix3.pack(matrix, array);
        expect(array.length).toEqual(Matrix3.packedLength);
        expect(Matrix3.unpack(array)).toEqual(matrix);
    });

    it('can pack and unpack with offset', function() {
        var packed = new Array(3);
        var offset = 3;
        var matrix = new Matrix3(
            1.0, 2.0, 3.0,
            4.0, 5.0, 6.0,
            7.0, 8.0, 9.0);

        Matrix3.pack(matrix, packed, offset);
        expect(packed.length).toEqual(offset + Matrix3.packedLength);

        var result = new Matrix3();
        var returnedResult = Matrix3.unpack(packed, offset, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(matrix);
    });

    it('pack throws with undefined matrix', function() {
        var array = [];
        expect(function() {
            Matrix3.pack(undefined, array);
        }).toThrowDeveloperError();
    });

    it('pack throws with undefined array', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.pack(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('unpack throws with undefined array', function() {
        expect(function() {
            Matrix3.unpack(undefined);
        }).toThrowDeveloperError();
    });

    it('fromQuaternion works without a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = Cartesian3.multiplyByScalar(new Cartesian3(0.0, 0.0, 1.0), sPiOver4, new Cartesian3());
        var quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);

        var returnedResult = Matrix3.fromQuaternion(quaternion);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromQuaternion works with a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = Cartesian3.multiplyByScalar(new Cartesian3(0.0, 0.0, 1.0), sPiOver4, new Cartesian3());
        var quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromQuaternion(quaternion, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromHeadingPitchRoll works without a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = Cartesian3.multiplyByScalar(new Cartesian3(0.0, 0.0, 1.0), sPiOver4, new Cartesian3());
        var quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var headingPitchRoll = HeadingPitchRoll.fromQuaternion(quaternion);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);

        var returnedResult = Matrix3.fromHeadingPitchRoll(headingPitchRoll);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromHeadingPitchRoll works with a result parameter', function() {
        var sPiOver4 = Math.sin(CesiumMath.PI_OVER_FOUR);
        var cPiOver4 = Math.cos(CesiumMath.PI_OVER_FOUR);
        var sPiOver2 = Math.sin(CesiumMath.PI_OVER_TWO);
        var cPiOver2 = Math.cos(CesiumMath.PI_OVER_TWO);

        var tmp = Cartesian3.multiplyByScalar(new Cartesian3(0.0, 0.0, 1.0), sPiOver4, new Cartesian3());
        var quaternion = new Quaternion(tmp.x, tmp.y, tmp.z, cPiOver4);
        var headingPitchRoll = HeadingPitchRoll.fromQuaternion(quaternion);
        var expected = new Matrix3(cPiOver2, -sPiOver2, 0.0, sPiOver2, cPiOver2, 0.0, 0.0, 0.0, 1.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromHeadingPitchRoll(headingPitchRoll, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromHeadingPitchRoll computed correctly', function() {
        // Expected generated via STK Components
        var expected = new Matrix3(
            0.754406506735489, 0.418940943945763, 0.505330889696038,
            0.133022221559489, 0.656295369162553, -0.742685314912828,
            -0.642787609686539, 0.627506871597133, 0.439385041770705);

        var headingPitchRoll = new HeadingPitchRoll(-CesiumMath.toRadians(10), -CesiumMath.toRadians(40), CesiumMath.toRadians(55));
        var result = new Matrix3();
        var returnedResult = Matrix3.fromHeadingPitchRoll(headingPitchRoll, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromScale works without a result parameter', function() {
        var expected = new Matrix3(
            7.0, 0.0, 0.0,
            0.0, 8.0, 0.0,
            0.0, 0.0, 9.0);
        var returnedResult = Matrix3.fromScale(new Cartesian3(7.0, 8.0, 9.0));
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromScale works with a result parameter', function() {
        var expected = new Matrix3(
            7.0, 0.0, 0.0,
            0.0, 8.0, 0.0,
            0.0, 0.0, 9.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromScale(new Cartesian3(7.0, 8.0, 9.0), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works without a result parameter', function() {
        var expected = new Matrix3(
            2.0, 0.0, 0.0,
            0.0, 2.0, 0.0,
            0.0, 0.0, 2.0);
        var returnedResult = Matrix3.fromUniformScale(2.0);
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works with a result parameter', function() {
        var expected = new Matrix3(
            2.0, 0.0, 0.0,
            0.0, 2.0, 0.0,
            0.0, 0.0, 2.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromUniformScale(2.0, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('fromCrossProduct works without a result parameter', function() {
        var expected = new Matrix3(
            0.0, -3.0, -2.0,
            3.0, 0.0, -1.0,
            2.0, 1.0, 0.0);
        var left = new Cartesian3(1.0, -2.0, 3.0);
        var returnedResult = Matrix3.fromCrossProduct(left);
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);

        var right = new Cartesian3(2.0, 3.0, 4.0);
        var crossProductExpected = new Cartesian3(-17.0, 2.0, 7.0);

        var crossProductResult = new Cartesian3();
        // Check Cartesian3 cross product.
        crossProductResult = Cartesian3.cross(left, right, crossProductResult);
        expect(crossProductResult).toEqual(crossProductExpected);

        // Check Matrix3 cross product equivalent.
        crossProductResult = Matrix3.multiply(returnedResult, right, crossProductResult);
        expect(crossProductResult).toEqual(crossProductExpected);
    });

    it('fromCrossProduct works with a result parameter', function() {
        var expected = new Matrix3(
            0.0, -3.0, -2.0,
            3.0, 0.0, -1.0,
            2.0, 1.0, 0.0);
        var left = new Cartesian3(1.0, -2.0, 3.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.fromCrossProduct(left, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);

        var right = new Cartesian3(2.0, 3.0, 4.0);
        var crossProductExpected = new Cartesian3(-17.0, 2.0, 7.0);

        var crossProductResult = new Cartesian3();
        // Check Cartesian3 cross product.
        crossProductResult = Cartesian3.cross(left, right, crossProductResult);
        expect(crossProductResult).toEqual(crossProductExpected);

        // Check Matrix3 cross product equivalent.
        crossProductResult = Matrix3.multiply(returnedResult, right, crossProductResult);
        expect(crossProductResult).toEqual(crossProductExpected);
    });

    it('fromArray works without a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var matrix = Matrix3.fromArray([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromArray([1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0], 0, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with an offset', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromArray([0.0, 0.0, 0.0, 1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0], 3, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
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

    it('fromRotationX works without a result parameter', function() {
        var matrix = Matrix3.fromRotationX(0.0);
        expect(matrix).toEqual(Matrix3.IDENTITY);
    });

    it('fromRotationX works with a result parameter', function() {
        var expected = new Matrix3(
            1.0, 0.0, 0.0,
            0.0, 0.0, -1.0,
            0.0, 1.0, 0.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromRotationX(CesiumMath.toRadians(90.0), result);
        expect(matrix).toBe(result);
        expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromRotationX throws without angle', function() {
        expect(function() {
            Matrix3.fromRotationX();
        }).toThrowDeveloperError();
    });

    it('fromRotationY works without a result parameter', function() {
        var matrix = Matrix3.fromRotationY(0.0);
        expect(matrix).toEqual(Matrix3.IDENTITY);
    });

    it('fromRotationY works with a result parameter', function() {
        var expected = new Matrix3(
            0.0, 0.0, 1.0,
            0.0, 1.0, 0.0,
            -1.0, 0.0, 0.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromRotationY(CesiumMath.toRadians(90.0), result);
        expect(matrix).toBe(result);
        expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromRotationY throws without angle', function() {
        expect(function() {
            Matrix3.fromRotationY();
        }).toThrowDeveloperError();
    });

    it('fromRotationZ works without a result parameter', function() {
        var matrix = Matrix3.fromRotationZ(0.0);
        expect(matrix).toEqual(Matrix3.IDENTITY);
    });

    it('fromRotationZ works with a result parameter', function() {
        var expected = new Matrix3(
            0.0, -1.0, 0.0,
            1.0, 0.0, 0.0,
            0.0, 0.0, 1.0);
        var result = new Matrix3();
        var matrix = Matrix3.fromRotationZ(CesiumMath.toRadians(90.0), result);
        expect(matrix).toBe(result);
        expect(matrix).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromRotationZ throws without angle', function() {
        expect(function() {
            Matrix3.fromRotationZ();
        }).toThrowDeveloperError();
    });

    it('clone works without a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var returnedResult = expected.clone();
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('clone works with a result parameter', function() {
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var returnedResult = expected.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('toArray works without a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        var returnedResult = Matrix3.toArray(Matrix3.fromColumnMajorArray(expected));
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0];
        var result = [];
        var returnedResult = Matrix3.toArray(Matrix3.fromColumnMajorArray(expected), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).not.toBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('getElementIndex works', function() {
        var i = 0;
        for (var col = 0; col < 3; col++) {
            for (var row = 0; row < 3; row++) {
                var index = Matrix3.getElementIndex(col, row);
                expect(index).toEqual(i);
                i++;
            }
        }
    });

    it('getColumn works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedColumn0 = new Cartesian3(1.0, 4.0, 7.0);
        var expectedColumn1 = new Cartesian3(2.0, 5.0, 8.0);
        var expectedColumn2 = new Cartesian3(3.0, 6.0, 9.0);

        var resultColumn0 = new Cartesian3();
        var resultColumn1 = new Cartesian3();
        var resultColumn2 = new Cartesian3();
        var returnedResultColumn0 = Matrix3.getColumn(matrix, 0, resultColumn0);
        var returnedResultColumn1 = Matrix3.getColumn(matrix, 1, resultColumn1);
        var returnedResultColumn2 = Matrix3.getColumn(matrix, 2, resultColumn2);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toBe(returnedResultColumn2);
        expect(resultColumn2).toEqual(expectedColumn2);
    });

    it('setColumn works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();

        var expected = new Matrix3(10.0, 2.0, 3.0, 11.0, 5.0, 6.0, 12.0, 8.0, 9.0);
        var returnedResult = Matrix3.setColumn(matrix, 0, new Cartesian3(10.0, 11.0, 12.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 13.0, 3.0, 4.0, 14.0, 6.0, 7.0, 15.0, 9.0);
        returnedResult = Matrix3.setColumn(matrix, 1, new Cartesian3(13.0, 14.0, 15.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 16.0, 4.0, 5.0, 17.0, 7.0, 8.0, 18.0);
        returnedResult = Matrix3.setColumn(matrix, 2, new Cartesian3(16.0, 17.0, 18.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getRow works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expectedRow0 = new Cartesian3(1.0, 2.0, 3.0);
        var expectedRow1 = new Cartesian3(4.0, 5.0, 6.0);
        var expectedRow2 = new Cartesian3(7.0, 8.0, 9.0);

        var resultRow0 = new Cartesian3();
        var resultRow1 = new Cartesian3();
        var resultRow2 = new Cartesian3();
        var returnedResultRow0 = Matrix3.getRow(matrix, 0, resultRow0);
        var returnedResultRow1 = Matrix3.getRow(matrix, 1, resultRow1);
        var returnedResultRow2 = Matrix3.getRow(matrix, 2, resultRow2);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toBe(returnedResultRow2);
        expect(resultRow2).toEqual(expectedRow2);
    });

    it('setRow works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();

        var expected = new Matrix3(10.0, 11.0, 12.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var returnedResult = Matrix3.setRow(matrix, 0, new Cartesian3(10.0, 11.0, 12.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 13.0, 14.0, 15.0, 7.0, 8.0, 9.0);
        returnedResult = Matrix3.setRow(matrix, 1, new Cartesian3(13.0, 14.0, 15.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 16.0, 17.0, 18.0);
        returnedResult = Matrix3.setRow(matrix, 2, new Cartesian3(16.0, 17.0, 18.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getScale works', function() {
        var scale = new Cartesian3(1.0, 2.0, 3.0);
        var result = new Cartesian3();
        var computedScale = Matrix3.getScale(Matrix3.fromScale(scale), result);

        expect(computedScale).toBe(result);
        expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
    });

    it('getScale throws without a matrix', function() {
        expect(function() {
            Matrix3.getScale();
        }).toThrowDeveloperError();
    });

    it('getMaximumScale works', function() {
        var m = Matrix3.fromScale(new Cartesian3(1.0, 2.0, 3.0));
        expect(Matrix3.getMaximumScale(m)).toEqualEpsilon(3.0, CesiumMath.EPSILON14);
    });

    it('getMaximumScale throws without a matrix', function() {
        expect(function() {
            Matrix3.getMaximumScale();
        }).toThrowDeveloperError();
    });

    it('multiply works', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
        var result = new Matrix3();
        var returnedResult = Matrix3.multiply(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter that is an input result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(84, 90, 96, 201, 216, 231, 318, 342, 366);
        var returnedResult = Matrix3.multiply(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('add works', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
        var result = new Matrix3();
        var returnedResult = Matrix3.add(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('add works with a result parameter that is an input result parameter', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
        var returnedResult = Matrix3.add(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('subtract works', function() {
        var left = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var result = new Matrix3();
        var returnedResult = Matrix3.subtract(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('subtract works with a result parameter that is an input result parameter', function() {
        var left = new Matrix3(11, 13, 15, 17, 19, 21, 23, 25, 27);
        var right = new Matrix3(10, 11, 12, 13, 14, 15, 16, 17, 18);
        var expected = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var returnedResult = Matrix3.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByScale works', function() {
        var m = new Matrix3(2, 3, 4, 6, 7, 8, 10, 11, 12);
        var scale = new Cartesian3(2.0, 3.0, 4.0);
        var expected = Matrix3.multiply(m, Matrix3.fromScale(scale), new Matrix3());
        var result = new Matrix3();
        var returnedResult = Matrix3.multiplyByScale(m, scale, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScale works with "this" result parameter', function() {
        var m = new Matrix3(1, 2, 3, 5, 6, 7, 9, 10, 11);
        var scale = new Cartesian3(1.0, 2.0, 3.0);
        var expected = Matrix3.multiply(m, Matrix3.fromScale(scale), new Matrix3());
        var returnedResult = Matrix3.multiplyByScale(m, scale, m);
        expect(returnedResult).toBe(m);
        expect(m).toEqual(expected);
    });

    it('multiplyByVector works', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = new Cartesian3(10, 11, 12);
        var expected = new Cartesian3(68, 167, 266);
        var result = new Cartesian3();
        var returnedResult = Matrix3.multiplyByVector(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works', function() {
        var left = new Matrix3(1, 2, 3, 4, 5, 6, 7, 8, 9);
        var right = 2;
        var expected = new Matrix3(2, 4, 6, 8, 10, 12, 14, 16, 18);
        var result = new Matrix3();
        var returnedResult = Matrix3.multiplyByScalar(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.negate(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var returnedResult = Matrix3.negate(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.transpose(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var expected = new Matrix3(1.0, 4.0, 7.0, 2.0, 5.0, 8.0, 3.0, 6.0, 9.0);
        var returnedResult = Matrix3.transpose(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('determinant works', function() {
        var matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
        var expected = -1.0;
        var result = Matrix3.determinant(matrix);
        expect(result).toEqual(expected);
    });

    it('inverse works', function() {
        var matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
        var expected = new Matrix3(-25.0, 26.0, -33.0, 4.0, -4.0, 5.0, 3.0, -3.0, 4.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.inverse(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('inverse works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix3(1.0, 5.0, 2.0, 1.0, 1.0, 7.0, 0.0, -3.0, 4.0);
        var expected = new Matrix3(-25.0, 26.0, -33.0, 4.0, -4.0, 5.0, 3.0, -3.0, 4.0);
        var returnedResult = Matrix3.inverse(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('computeEigenDecomposition throws without a matrix', function() {
        expect(function() {
            return Matrix3.computeEigenDecomposition();
        }).toThrowDeveloperError();
    });

    it('computes eigenvalues and eigenvectors', function() {
        var a = new Matrix3(
          4.0, -1.0, 1.0,
          -1.0, 3.0, -2.0,
          1.0, -2.0, 3.0);

        var expectedDiagonal = new Matrix3(
          3.0, 0.0, 0.0,
          0.0, 6.0, 0.0,
          0.0, 0.0, 1.0);

        var decomposition = Matrix3.computeEigenDecomposition(a);
        expect(decomposition.diagonal).toEqualEpsilon(expectedDiagonal, CesiumMath.EPSILON14);

        var v = Matrix3.getColumn(decomposition.unitary, 0, new Cartesian3());
        var lambda = Matrix3.getColumn(decomposition.diagonal, 0, new Cartesian3()).x;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);

        v = Matrix3.getColumn(decomposition.unitary, 1, new Cartesian3());
        lambda = Matrix3.getColumn(decomposition.diagonal, 1, new Cartesian3()).y;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);

        v = Matrix3.getColumn(decomposition.unitary, 2, new Cartesian3());
        lambda = Matrix3.getColumn(decomposition.diagonal, 2, new Cartesian3()).z;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);
    });

    it('computes eigenvalues and eigenvectors with result parameters', function() {
        var a = new Matrix3(
          4.0, -1.0, 1.0,
          -1.0, 3.0, -2.0,
          1.0, -2.0, 3.0);

        var expectedDiagonal = new Matrix3(
          3.0, 0.0, 0.0,
          0.0, 6.0, 0.0,
          0.0, 0.0, 1.0);
        var result = {
            unitary: new Matrix3(),
            diagonal: new Matrix3()
        };

        var decomposition = Matrix3.computeEigenDecomposition(a, result);
        expect(decomposition).toBe(result);
        expect(decomposition.diagonal).toEqualEpsilon(expectedDiagonal, CesiumMath.EPSILON14);

        var v = Matrix3.getColumn(decomposition.unitary, 0, new Cartesian3());
        var lambda = Matrix3.getColumn(decomposition.diagonal, 0, new Cartesian3()).x;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);

        v = Matrix3.getColumn(decomposition.unitary, 1, new Cartesian3());
        lambda = Matrix3.getColumn(decomposition.diagonal, 1, new Cartesian3()).y;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);

        v = Matrix3.getColumn(decomposition.unitary, 2, new Cartesian3());
        lambda = Matrix3.getColumn(decomposition.diagonal, 2, new Cartesian3()).z;
        expect(Cartesian3.multiplyByScalar(v, lambda, new Cartesian3())).toEqualEpsilon(Matrix3.multiplyByVector(a, v, new Cartesian3()), CesiumMath.EPSILON14);
    });

    it('abs throws without a matrix', function() {
        expect(function() {
            return Matrix3.abs();
        }).toThrowDeveloperError();
    });

    it('abs works', function() {
        var matrix = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var result = new Matrix3();
        var returnedResult = Matrix3.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        returnedResult = Matrix3.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix3(1.0, -2.0, -3.0, 4.0, 5.0, -6.0, 7.0, -8.0, 9.0);
        returnedResult = Matrix3.abs(matrix, result);
        expect(returnedResult).toEqual(expected);
    });

    it('abs works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix3(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0);
        var expected = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var returnedResult = Matrix3.abs(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(Matrix3.equals(left, right)).toEqual(false);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(Matrix3.equals(left, right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix3.equals(undefined, undefined)).toEqual(true);
        expect(Matrix3.equals(new Matrix3(), undefined)).toEqual(false);
        expect(Matrix3.equals(undefined, new Matrix3())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        var right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 1.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        right = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(Matrix3.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix3.equalsEpsilon(left, right, 4.0)).toEqual(true);
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

    it('fromArray throws without an array', function() {
        expect(function() {
            Matrix3.fromArray();
        }).toThrowDeveloperError();
    });

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix3.fromRowMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix3.fromColumnMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('clone returns undefined without matrix parameter', function() {
        expect(Matrix3.clone(undefined)).toBeUndefined();
    });

    it('toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix3.toArray(undefined);
        }).toThrowDeveloperError();
    });

    it('getElement throws without row parameter', function() {
        var row;
        var col = 0.0;
        expect(function() {
            Matrix3.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getElement throws without column parameter', function() {
        var row = 0.0;
        var col;
        expect(function() {
            Matrix3.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix3.getColumn(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without of range index parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.getColumn(matrix, 3);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setColumn(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.setColumn(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without of range index parameter', function() {
        var matrix = new Matrix3();
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setColumn(matrix, 3, cartesian);
        }).toThrowDeveloperError();
    });

    it('getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix3.getRow(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getRow throws without of range index parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.getRow(matrix, 3);
        }).toThrowDeveloperError();
    });

    it('setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setRow(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setRow throws without cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.setRow(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setRow throws without of range index parameter', function() {
        var matrix = new Matrix3();
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.setRow(matrix, 3, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no left parameter', function() {
        var right = new Matrix3();
        expect(function() {
            Matrix3.multiply(undefined, right);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no right parameter', function() {
        var left = new Matrix3();
        expect(function() {
            Matrix3.multiply(left, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws with no matrix parameter', function() {
        expect(function() {
            Matrix3.multiplyByScale(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws with no scale parameter', function() {
        var m = new Matrix3();
        expect(function() {
            Matrix3.multiplyByScale(m, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian3();
        expect(function() {
            Matrix3.multiplyByVector(undefined, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.multiplyByVector(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix3.multiplyByScalar(undefined, 2);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix3();
        expect(function() {
            Matrix3.multiplyByScalar(matrix, {});
        }).toThrowDeveloperError();
    });

    it('negate throws without matrix parameter', function() {
        expect(function() {
            Matrix3.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('transpose throws without matrix parameter', function() {
        expect(function() {
            Matrix3.transpose(undefined);
        }).toThrowDeveloperError();
    });

    it('determinant throws without matrix parameter', function() {
        expect(function() {
            Matrix3.determinant(undefined);
        }).toThrowDeveloperError();
    });

    it('inverse throws without matrix parameter', function() {
        expect(function() {
            Matrix3.inverse(undefined);
        }).toThrowDeveloperError();
    });

    it('inverse throws when matrix is not invertible', function() {
        expect(function() {
            Matrix3.inverse(new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0), new Matrix3());
        }).toThrowDeveloperError();
    });

    it('fromQuaternion throws without quaternion parameter', function() {
        expect(function() {
            Matrix3.fromQuaternion(undefined);
        }).toThrowDeveloperError();
    });

    it('fromHeadingPitchRoll throws without quaternion parameter', function() {
        expect(function() {
            Matrix3.fromHeadingPitchRoll(undefined);
        }).toThrowDeveloperError();
    });

    it('fromScale throws without scale parameter', function() {
        expect(function() {
            Matrix3.fromScale(undefined);
        }).toThrowDeveloperError();
    });

    it('fromUniformScale throws without scale parameter', function() {
        expect(function() {
            Matrix3.fromUniformScale(undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix3.equalsEpsilon(new Matrix3(), new Matrix3(), {});
        }).toThrowDeveloperError();
    });

    it('getColumn throws without result parameter', function() {
        expect(function() {
            Matrix3.getColumn(new Matrix3(), 2);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without result parameter', function() {
        expect(function() {
            Matrix3.setColumn(new Matrix3(), 2, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('getRow throws without result parameter', function() {
        expect(function() {
            Matrix3.getRow(new Matrix3(), 2);
        }).toThrowDeveloperError();
    });

    it('setRow throws without result parameter', function() {
        expect(function() {
            Matrix3.setRow(new Matrix3(), 2, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('getScale throws without result parameter', function() {
        expect(function() {
            Matrix3.getScale(new Matrix3());
        }).toThrowDeveloperError();
    });

    it('multiply throws without result parameter', function() {
        expect(function() {
            Matrix3.multiply(new Matrix3(), new Matrix3());
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws without result parameter', function() {
        expect(function() {
            Matrix3.multiplyByScale(new Matrix3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws without result parameter', function() {
        expect(function() {
            Matrix3.multiplyByVector(new Matrix3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws without result parameter', function() {
        expect(function() {
            Matrix3.multiplyByScalar(new Matrix3(), 2);
        }).toThrowDeveloperError();
    });

    it('negate throws without result parameter', function() {
        expect(function() {
            Matrix3.negate(new Matrix3());
        }).toThrowDeveloperError();
    });

    it('transpose throws without result parameter', function() {
        expect(function() {
            Matrix3.transpose(new Matrix3());
        }).toThrowDeveloperError();
    });

    it('abs throws without result parameter', function() {
        expect(function() {
            Matrix3.abs(new Matrix3());
        }).toThrowDeveloperError();
    });

    it('inverse throws without result parameter', function() {
        expect(function() {
            Matrix3.inverse(new Matrix3());
        }).toThrowDeveloperError();
    });

    it('Matrix3 objects can be used as array like objects', function() {
        var matrix = new Matrix3(
            1, 4, 7,
            2, 5, 8,
            3, 6, 9);
        expect(matrix.length).toEqual(9);
        var intArray = new Uint32Array(matrix.length);
        intArray.set(matrix);
        for (var index = 0; index < matrix.length; index++) {
            expect(intArray[index]).toEqual(index + 1);
        }
    });
});
