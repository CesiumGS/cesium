/*global defineSuite*/
defineSuite([
        'Core/Matrix4',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Math',
        'Core/Matrix3',
        'Core/Quaternion'
    ], function(
        Matrix4,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        Matrix3,
        Quaternion) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor creates values array with all zeros.', function() {
        var matrix = new Matrix4();
        expect(matrix[Matrix4.COLUMN0ROW0]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN1ROW0]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN2ROW0]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN3ROW0]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN0ROW1]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN1ROW1]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN2ROW1]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN3ROW1]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN0ROW2]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN1ROW2]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN2ROW2]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN3ROW2]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN0ROW3]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN1ROW3]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN2ROW3]).toEqual(0.0);
        expect(matrix[Matrix4.COLUMN3ROW3]).toEqual(0.0);
    });

    it('constructor sets properties from parameters.', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(matrix[Matrix4.COLUMN0ROW0]).toEqual(1.0);
        expect(matrix[Matrix4.COLUMN1ROW0]).toEqual(2.0);
        expect(matrix[Matrix4.COLUMN2ROW0]).toEqual(3.0);
        expect(matrix[Matrix4.COLUMN3ROW0]).toEqual(4.0);
        expect(matrix[Matrix4.COLUMN0ROW1]).toEqual(5.0);
        expect(matrix[Matrix4.COLUMN1ROW1]).toEqual(6.0);
        expect(matrix[Matrix4.COLUMN2ROW1]).toEqual(7.0);
        expect(matrix[Matrix4.COLUMN3ROW1]).toEqual(8.0);
        expect(matrix[Matrix4.COLUMN0ROW2]).toEqual(9.0);
        expect(matrix[Matrix4.COLUMN1ROW2]).toEqual(10.0);
        expect(matrix[Matrix4.COLUMN2ROW2]).toEqual(11.0);
        expect(matrix[Matrix4.COLUMN3ROW2]).toEqual(12.0);
        expect(matrix[Matrix4.COLUMN0ROW3]).toEqual(13.0);
        expect(matrix[Matrix4.COLUMN1ROW3]).toEqual(14.0);
        expect(matrix[Matrix4.COLUMN2ROW3]).toEqual(15.0);
        expect(matrix[Matrix4.COLUMN3ROW3]).toEqual(16.0);
    });

    it('can pack and unpack', function() {
        var array = [];
        var matrix4 = new Matrix4(
                1.0, 2.0, 3.0, 4.0,
                5.0, 6.0, 7.0, 8.0,
                9.0, 10.0, 11.0, 12.0,
                13.0, 14.0, 15.0, 16.0);
        Matrix4.pack(matrix4, array);
        expect(array.length).toEqual(Matrix4.packedLength);
        expect(Matrix4.unpack(array)).toEqual(matrix4);
    });

    it('can pack and unpack with offset', function() {
        var packed = new Array(3);
        var offset = 3;
        var matrix4 = new Matrix4(
                1.0, 2.0, 3.0, 4.0,
                5.0, 6.0, 7.0, 8.0,
                9.0, 10.0, 11.0, 12.0,
                13.0, 14.0, 15.0, 16.0);

        Matrix4.pack(matrix4, packed, offset);
        expect(packed.length).toEqual(offset + Matrix4.packedLength);

        var result = new Matrix4();
        var returnedResult = Matrix4.unpack(packed, offset, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(matrix4);
    });

    it('pack throws with undefined matrix4', function() {
        var array = [];
        expect(function() {
            Matrix4.pack(undefined, array);
        }).toThrowDeveloperError();
    });

    it('pack throws with undefined array', function() {
        var matrix4 = new Matrix4();
        expect(function() {
            Matrix4.pack(matrix4, undefined);
        }).toThrowDeveloperError();
    });

    it('fromArray works without a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var matrix = Matrix4.fromArray([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var matrix = Matrix4.fromArray([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0], 0, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromArray works with a starting index', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var matrix = Matrix4.fromArray([0.0, 0.0, 0.0, 1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0], 3, result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromRowMajorArray works without a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var matrix = Matrix4.fromRowMajorArray([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromRowMajorArray works with a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var matrix = Matrix4.fromRowMajorArray([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works without a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var matrix = Matrix4.fromColumnMajorArray([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0]);
        expect(matrix).toEqual(expected);
    });

    it('fromColumnMajorArray works with a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var matrix = Matrix4.fromColumnMajorArray([1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0], result);
        expect(matrix).toBe(result);
        expect(matrix).toEqual(expected);
    });

    it('clone works without a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var returnedResult = expected.clone();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('clone works with a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var returnedResult = expected.clone(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromRotationTranslation works without a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 10.0, 4.0, 5.0, 6.0, 11.0, 7.0, 8.0, 9.0, 12.0, 0.0, 0.0, 0.0, 1.0);
        var returnedResult = Matrix4.fromRotationTranslation(new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0), new Cartesian3(10.0, 11.0, 12.0));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromRotationTranslation works with a result parameter', function() {
        var expected = new Matrix4(1.0, 2.0, 3.0, 10.0, 4.0, 5.0, 6.0, 11.0, 7.0, 8.0, 9.0, 12.0, 0.0, 0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.fromRotationTranslation(new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0), new Cartesian3(10.0, 11.0, 12.0), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromTranslation works without a result parameter', function() {
        var expected = new Matrix4(1.0, 0.0, 0.0, 10.0, 0.0, 1.0, 0.0, 11.0, 0.0, 0.0, 1.0, 12.0, 0.0, 0.0, 0.0, 1.0);
        var returnedResult = Matrix4.fromTranslation(new Cartesian3(10.0, 11.0, 12.0));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromTranslationQuaternionRotationScale works without a result parameter', function() {
        var expected = new Matrix4(
            7.0,  0.0, 0.0, 1.0,
            0.0,  0.0, 9.0, 2.0,
            0.0, -8.0, 0.0, 3.0,
            0.0,  0.0, 0.0, 1.0);
        var returnedResult = Matrix4.fromTranslationQuaternionRotationScale(
            new Cartesian3(1.0, 2.0, 3.0),                                            // translation
            Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)), // rotation
            new Cartesian3(7.0, 8.0, 9.0));                                           // scale
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
    });

    it('fromTranslationQuaternionRotationScale works with a result parameter', function() {
        var expected = new Matrix4(
                7.0,  0.0, 0.0, 1.0,
                0.0,  0.0, 9.0, 2.0,
                0.0, -8.0, 0.0, 3.0,
                0.0,  0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.fromTranslationQuaternionRotationScale(
            new Cartesian3(1.0, 2.0, 3.0),                                            // translation
            Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.toRadians(-90.0)), // rotation
            new Cartesian3(7.0, 8.0, 9.0),                                            // scale
            result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON14);
    });

    it('fromTranslation works with a result parameter', function() {
        var expected = new Matrix4(1.0, 0.0, 0.0, 10.0, 0.0, 1.0, 0.0, 11.0, 0.0, 0.0, 1.0, 12.0, 0.0, 0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.fromTranslation(new Cartesian3(10.0, 11.0, 12.0), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromScale works without a result parameter', function() {
        var expected = new Matrix4(
                7.0, 0.0, 0.0, 0.0,
                0.0, 8.0, 0.0, 0.0,
                0.0, 0.0, 9.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        var returnedResult = Matrix4.fromScale(new Cartesian3(7.0, 8.0, 9.0));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromScale works with a result parameter', function() {
        var expected = new Matrix4(
                7.0, 0.0, 0.0, 0.0,
                0.0, 8.0, 0.0, 0.0,
                0.0, 0.0, 9.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.fromScale(new Cartesian3(7.0, 8.0, 9.0), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works without a result parameter', function() {
        var expected = new Matrix4(
                2.0, 0.0, 0.0, 0.0,
                0.0, 2.0, 0.0, 0.0,
                0.0, 0.0, 2.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        var returnedResult = Matrix4.fromUniformScale(2.0);
        expect(returnedResult).toEqual(expected);
    });

    it('fromUniformScale works with a result parameter', function() {
        var expected = new Matrix4(
                2.0, 0.0, 0.0, 0.0,
                0.0, 2.0, 0.0, 0.0,
                0.0, 0.0, 2.0, 0.0,
                0.0, 0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.fromUniformScale(2.0, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('computePerspectiveFieldOfView works', function() {
        var expected = new Matrix4(1, 0,                   0,                  0,
                                   0, 1,                  0,                  0,
                                   0, 0, -1.222222222222222, -2.222222222222222,
                                   0, 0,                  -1,                 0);
        var result = new Matrix4();
        var returnedResult = Matrix4.computePerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 10, result);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('fromCamera works without a result parameter', function() {
        var expected = Matrix4.IDENTITY;
        var returnedResult = Matrix4.fromCamera({
            eye : Cartesian3.ZERO,
            target : Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
            up : Cartesian3.UNIT_Y
        });
        expect(expected).toEqual(returnedResult);
    });

    it('fromCamera works with a result parameter', function() {
        var expected = Matrix4.IDENTITY;
        var result = new Matrix4();
        var returnedResult = Matrix4.fromCamera({
            eye : Cartesian3.ZERO,
            target : Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
            up : Cartesian3.UNIT_Y
        }, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('computeOrthographicOffCenter works', function() {
        var expected = new Matrix4(2, 0, 0, -1, 0, 2, 0, -5, 0, 0, -2, -1, 0, 0, 0, 1);
        var result = new Matrix4();
        var returnedResult = Matrix4.computeOrthographicOffCenter(0, 1, 2, 3, 0, 1, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expected);
    });

    it('computeViewportTransformation  works', function() {
        var expected = new Matrix4(2.0, 0.0, 0.0, 2.0,
                                   0.0, 3.0, 0.0, 3.0,
                                   0.0, 0.0, 1.0, 1.0,
                                   0.0, 0.0, 0.0, 1.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.computeViewportTransformation({
            x : 0,
            y : 0,
            width : 4.0,
            height : 6.0
        }, 0.0, 2.0, result);
        expect(returnedResult).toEqual(expected);
        expect(returnedResult).toBe(result);
    });

    it('computePerspectiveOffCenter works', function() {
        var expected = new Matrix4(2, 0, 3, 0, 0, 2, 5, 0, 0, 0, -3, -4, 0, 0, -1, 0);
        var result = new Matrix4();
        var returnedResult = Matrix4.computePerspectiveOffCenter(1, 2, 2, 3, 1, 2, result);
        expect(returnedResult).toEqual(expected);
        expect(returnedResult).toBe(result);
    });

    it('computeInfinitePerspectiveOffCenter  works', function() {
        var expected = new Matrix4(2, 0, 3, 0, 0, 2, 5, 0, 0, 0, -1, -2, 0, 0, -1, 0);
        var result = new Matrix4();
        var returnedResult = Matrix4.computeInfinitePerspectiveOffCenter(1, 2, 2, 3, 1, result);
        expect(returnedResult).toEqual(expected);
    });

    it('toArray works without a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0];
        var returnedResult = Matrix4.toArray(Matrix4.fromColumnMajorArray(expected));
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0];
        var result = [];
        var returnedResult = Matrix4.toArray(Matrix4.fromColumnMajorArray(expected), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqual(expected);
    });

    it('getElementIndex works', function() {
        var i = 0;
        for ( var col = 0; col < 4; col++) {
            for ( var row = 0; row < 4; row++) {
                var index = Matrix4.getElementIndex(col, row);
                expect(index).toEqual(i);
                i++;
            }
        }
    });

    it('getColumn works for each column', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedColumn0 = new Cartesian4(1.0, 5.0, 9.0, 13.0);
        var expectedColumn1 = new Cartesian4(2.0, 6.0, 10.0, 14.0);
        var expectedColumn2 = new Cartesian4(3.0, 7.0, 11.0, 15.0);
        var expectedColumn3 = new Cartesian4(4.0, 8.0, 12.0, 16.0);

        var resultColumn0 = new Cartesian4();
        var resultColumn1 = new Cartesian4();
        var resultColumn2 = new Cartesian4();
        var resultColumn3 = new Cartesian4();
        var returnedResultColumn0 = Matrix4.getColumn(matrix, 0, resultColumn0);
        var returnedResultColumn1 = Matrix4.getColumn(matrix, 1, resultColumn1);
        var returnedResultColumn2 = Matrix4.getColumn(matrix, 2, resultColumn2);
        var returnedResultColumn3 = Matrix4.getColumn(matrix, 3, resultColumn3);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toBe(returnedResultColumn2);
        expect(resultColumn2).toEqual(expectedColumn2);
        expect(resultColumn3).toBe(returnedResultColumn3);
        expect(resultColumn3).toEqual(expectedColumn3);
    });

    it('setColumn works for each column', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        var result = new Matrix4();

        var expected = new Matrix4(17.0, 2.0, 3.0, 4.0, 18.0, 6.0, 7.0, 8.0, 19.0, 10.0, 11.0, 12.0, 20.0, 14.0, 15.0, 16.0);
        var returnedResult = Matrix4.setColumn(matrix, 0, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 17.0, 3.0, 4.0, 5.0, 18.0, 7.0, 8.0, 9.0, 19.0, 11.0, 12.0, 13.0, 20.0, 15.0, 16.0);
        returnedResult = Matrix4.setColumn(matrix, 1, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 17.0, 4.0, 5.0, 6.0, 18.0, 8.0, 9.0, 10.0, 19.0, 12.0, 13.0, 14.0, 20.0, 16.0);
        returnedResult = Matrix4.setColumn(matrix, 2, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 17.0, 5.0, 6.0, 7.0, 18.0, 9.0, 10.0, 11.0, 19.0, 13.0, 14.0, 15.0, 20.0);
        returnedResult = Matrix4.setColumn(matrix, 3, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
});

    it('getRow works for each row', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedRow0 = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var expectedRow1 = new Cartesian4(5.0, 6.0, 7.0, 8.0);
        var expectedRow2 = new Cartesian4(9.0, 10.0, 11.0, 12.0);
        var expectedRow3 = new Cartesian4(13.0, 14.0, 15.0, 16.0);

        var resultRow0 = new Cartesian4();
        var resultRow1 = new Cartesian4();
        var resultRow2 = new Cartesian4();
        var resultRow3 = new Cartesian4();
        var returnedResultRow0 = Matrix4.getRow(matrix, 0, resultRow0);
        var returnedResultRow1 = Matrix4.getRow(matrix, 1, resultRow1);
        var returnedResultRow2 = Matrix4.getRow(matrix, 2, resultRow2);
        var returnedResultRow3 = Matrix4.getRow(matrix, 3, resultRow3);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toBe(returnedResultRow2);
        expect(resultRow2).toEqual(expectedRow2);
        expect(resultRow3).toBe(returnedResultRow3);
        expect(resultRow3).toEqual(expectedRow3);
    });

    it('setRow works for each row', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();

        var expected = new Matrix4(91.0, 92.0, 93.0, 94.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var returnedResult = Matrix4.setRow(matrix, 0, new Cartesian4(91.0, 92.0, 93.0, 94.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 95.0, 96.0, 97.0, 98.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        returnedResult = Matrix4.setRow(matrix, 1, new Cartesian4(95.0, 96.0, 97.0, 98.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 99.0, 910.0, 911.0, 912.0, 13.0, 14.0, 15.0, 16.0);
        returnedResult = Matrix4.setRow(matrix, 2, new Cartesian4(99.0, 910.0, 911.0, 912.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 913.0, 914.0, 915.0, 916.0);
        returnedResult = Matrix4.setRow(matrix, 3, new Cartesian4(913.0, 914.0, 915.0, 916.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('getScale works', function() {
        var scale = new Cartesian3(1.0, 2.0, 3.0);
        var result = new Cartesian3();
        var computedScale = Matrix4.getScale(Matrix4.fromScale(scale), result);

        expect(computedScale).toBe(result);
        expect(computedScale).toEqualEpsilon(scale, CesiumMath.EPSILON14);
    });

    it('getScale throws without a matrix', function() {
        expect(function() {
            Matrix4.getScale();
        }).toThrowDeveloperError();
    });

    it('getMaximumScale works', function() {
        var m = Matrix4.fromScale(new Cartesian3(1.0, 2.0, 3.0));
        expect(Matrix4.getMaximumScale(m)).toEqualEpsilon(3.0, CesiumMath.EPSILON14);
    });

    it('getMaximumScale throws without a matrix', function() {
        expect(function() {
            Matrix4.getMaximumScale();
        }).toThrowDeveloperError();
    });

    it('multiply works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(250, 260, 270, 280, 618, 644, 670, 696, 986, 1028, 1070, 1112, 1354, 1412, 1470, 1528);
        var result = new Matrix4();
        var returnedResult = Matrix4.multiply(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter that is an input result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(250, 260, 270, 280, 618, 644, 670, 696, 986, 1028, 1070, 1112, 1354, 1412, 1470, 1528);
        var returnedResult = Matrix4.multiply(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('add works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48);
        var result = new Matrix4();
        var returnedResult = Matrix4.add(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('add works with a result parameter that is an input result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48);
        var returnedResult = Matrix4.add(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('subtract works', function() {
        var left = new Matrix4(18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var result = new Matrix4();
        var returnedResult = Matrix4.subtract(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('subtract works with a result parameter that is an input result parameter', function() {
        var left = new Matrix4(18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var returnedResult = Matrix4.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyTransformation works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 0, 0, 0, 1);
        var expected = new Matrix4(134, 140, 146, 156, 386, 404, 422, 448, 638, 668, 698, 740, 0, 0, 0, 1);
        var result = new Matrix4();
        var returnedResult = Matrix4.multiplyTransformation(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyTransformation works with a result parameter that is an input result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 0, 0, 0, 1);
        var expected = new Matrix4(134, 140, 146, 156, 386, 404, 422, 448, 638, 668, 698, 740, 0, 0, 0, 1);
        var returnedResult = Matrix4.multiplyTransformation(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByTranslation works', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var translation = new Cartesian3(17, 18, 19);
        var expected = Matrix4.multiply(m, Matrix4.fromTranslation(translation), new Matrix4());
        var result = new Matrix4();
        var returnedResult = Matrix4.multiplyByTranslation(m, translation, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByTranslation works with a result parameter that is an input result parameter', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var translation = new Cartesian3(17, 18, 19);
        var expected = Matrix4.multiply(m, Matrix4.fromTranslation(translation), new Matrix4());
        var returnedResult = Matrix4.multiplyByTranslation(m, translation, m);
        expect(returnedResult).toBe(m);
        expect(m).toEqual(expected);
    });

    it('multiplyByUniformScale works', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var scale = 1.0;
        var expected = Matrix4.multiply(m, Matrix4.fromUniformScale(scale), new Matrix4());
        var result = new Matrix4();
        var returnedResult = Matrix4.multiplyByUniformScale(m, scale, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByUniformScale works with a result parameter that is an input result parameter', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var scale = 2.0;
        var expected = Matrix4.multiply(m, Matrix4.fromUniformScale(scale), new Matrix4());
        var returnedResult = Matrix4.multiplyByUniformScale(m, scale, m);
        expect(returnedResult).toBe(m);
        expect(m).toEqual(expected);
    });

    it('multiplyByScale works', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var scale = new Cartesian3(1.0, 1.0, 1.0);
        var expected = Matrix4.multiply(m, Matrix4.fromScale(scale), new Matrix4());
        var result = new Matrix4();
        var returnedResult = Matrix4.multiplyByScale(m, scale, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScale works with "this" result parameter', function() {
        var m = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1);
        var scale = new Cartesian3(1.0, 2.0, 3.0);
        var expected = Matrix4.multiply(m, Matrix4.fromScale(scale), new Matrix4());
        var returnedResult = Matrix4.multiplyByScale(m, scale, m);
        expect(returnedResult).toBe(m);
        expect(m).toEqual(expected);
    });

    it('multiplyByVector works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Cartesian4(17, 18, 19, 20);
        var expected = new Cartesian4(190, 486, 782, 1078);
        var result = new Cartesian4();
        var returnedResult = Matrix4.multiplyByVector(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByPoint works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Cartesian3(17, 18, 19);
        var expected = new Cartesian3(114, 334, 554);
        var result = new Cartesian3();
        var returnedResult = Matrix4.multiplyByPoint(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByPointAsVector works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Cartesian3(17, 18, 19);
        var expected = new Cartesian3(110, 326, 542);
        var result = new Cartesian3();
        var returnedResult = Matrix4.multiplyByPointAsVector(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = 2;
        var expected = new Matrix4(2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32);
        var result = new Matrix4();
        var returnedResult = Matrix4.multiplyByScalar(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.negate(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var returnedResult = Matrix4.negate(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.transpose(matrix, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);
        var returnedResult = Matrix4.transpose(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equals(left, right)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(Matrix4.equals(left, right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(Matrix4.equals(left, right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix4.equals(undefined, undefined)).toEqual(true);
        expect(Matrix4.equals(new Matrix4(), undefined)).toEqual(false);
        expect(Matrix4.equals(undefined, new Matrix4())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 1.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 14.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 15.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 16.0, 13.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 17.0, 14.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 18.0, 15.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 19.0, 16.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);


        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 20.0);
        expect(Matrix4.equalsEpsilon(left, right, 3.9)).toEqual(false);
        expect(Matrix4.equalsEpsilon(left, right, 4.0)).toEqual(true);
    });

    it('equalsEpsilon works with undefined', function() {
        expect(Matrix4.equalsEpsilon(undefined, undefined, 1.0)).toEqual(true);
        expect(Matrix4.equalsEpsilon(new Matrix4(), undefined, 1.0)).toEqual(false);
        expect(Matrix4.equalsEpsilon(undefined, new Matrix4(), 1.0)).toEqual(false);
    });

    it('toString', function() {
        var matrix = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        expect(matrix.toString()).toEqual('(1, 2, 3, 4)\n(5, 6, 7, 8)\n(9, 10, 11, 12)\n(13, 14, 15, 16)');
    });

    it('getTranslation works', function() {
        var matrix = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var expected = new Cartesian3(4, 8, 12);
        var result = new Cartesian3();
        var returnedResult = Matrix4.getTranslation(matrix, result);
        expect(returnedResult).toBe(result);
        expect(expected).toEqual(returnedResult);
    });

    it('getRotation works', function() {
        var matrix = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var expected = new Matrix3(1, 2, 3, 5, 6, 7, 9, 10, 11);
        var result = new Matrix3();
        var returnedResult = Matrix4.getRotation(matrix, result);
        expect(returnedResult).toBe(result);
        expect(expected).toEqual(returnedResult);
    });

    it('inverse works', function() {
        var matrix = new Matrix4(0.72,  0.70, 0.00,  0.00,
                                -0.40,  0.41, 0.82,  0.00,
                                 0.57, -0.59, 0.57, -3.86,
                                 0.00,  0.00, 0.00,  1.00);

        var expected = new Matrix4(0.7150830193944467,    -0.3976559229803265,  0.5720664155155574,  2.2081763638900513,
                                   0.6930574657657118,    0.40901752077976433, -0.5884111702445733, -2.271267117144053,
                                   0.0022922521876059163, 0.8210249357172755,   0.5732623731786561,  2.2127927604696125,
                                   0.0,                   0.0,                  0.0,                 1.0);

        var result = new Matrix4();
        var returnedResult = Matrix4.inverse(matrix, result);
        expect(returnedResult).toBe(result);
        expect(expected).toEqualEpsilon(returnedResult, CesiumMath.EPSILON20);
        expect(Matrix4.multiply(returnedResult, matrix, new Matrix4())).toEqualEpsilon(Matrix4.IDENTITY, CesiumMath.EPSILON15);
    });

    it('inverseTransformation works', function() {
        var matrix = new Matrix4(1, 0, 0, 10,
                                 0, 0, 1, 20,
                                 0, 1, 0, 30,
                                 0, 0, 0,  1);

        var expected = new Matrix4(1, 0, 0, -10,
                                   0, 0, 1, -30,
                                   0, 1, 0, -20,
                                   0, 0, 0, 1);

        var result = new Matrix4();
        var returnedResult = Matrix4.inverseTransformation(matrix, result);
        expect(returnedResult).toBe(result);
        expect(expected).toEqual(returnedResult);
        expect(Matrix4.multiply(returnedResult, matrix, new Matrix4())).toEqual(Matrix4.IDENTITY);
    });

    it('abs throws without a matrix', function() {
        expect(function() {
            return Matrix4.abs();
        }).toThrowDeveloperError();
    });

    it('abs works', function() {
        var matrix = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();
        var returnedResult = Matrix4.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        returnedResult = Matrix4.abs(matrix, result);
        expect(returnedResult).toEqual(expected);

        matrix = new Matrix4(1.0, -2.0, -3.0, 4.0, 5.0, -6.0, 7.0, -8.0, 9.0, -10.0, 11.0, -12.0, 13.0, -14.0, 15.0, -16.0);
        returnedResult = Matrix4.abs(matrix, result);
        expect(returnedResult).toEqual(expected);
    });

    it('abs works with a result parameter that is an input result parameter', function() {
        var matrix = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var returnedResult = Matrix4.abs(matrix, matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('fromArray throws without an array', function() {
        expect(function() {
            return Matrix4.fromArray();
        }).toThrowDeveloperError();
    });

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix4.fromRowMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix4.fromColumnMajorArray(undefined);
        }).toThrowDeveloperError();
    });

    it('fromRotationTranslation throws without rotation parameter', function() {
        expect(function() {
            Matrix4.fromRotationTranslation(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('fromRotationTranslation throws without translation parameter', function() {
        expect(function() {
            Matrix4.fromRotationTranslation(new Matrix4(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromTranslationQuaternionRotationScale throws without translation parameter', function() {
        expect(function() {
            Matrix4.fromTranslationQuaternionRotationScale(undefined, new Quaternion(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('fromTranslationQuaternionRotationScale throws without rotation parameter', function() {
        expect(function() {
            Matrix4.fromTranslationQuaternionRotationScale(new Matrix3(), undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('fromTranslationQuaternionRotationScale throws without scale parameter', function() {
        expect(function() {
            Matrix4.fromTranslationQuaternionRotationScale(new Matrix3(), new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromTranslation throws without translation parameter', function() {
        expect(function() {
            Matrix4.fromTranslation(undefined);
        }).toThrowDeveloperError();
    });

    it('fromScale throws without scale parameter', function() {
        expect(function() {
            Matrix4.fromScale(undefined);
        }).toThrowDeveloperError();
    });

    it('fromUniformScale throws without scale parameter', function() {
        expect(function() {
            Matrix4.fromUniformScale(undefined);
        }).toThrowDeveloperError();
    });

    it('fromCamera throws without camera', function() {
        expect(function() {
            Matrix4.fromCamera(undefined);
        }).toThrowDeveloperError();
    });

    it('fromCamera throws without eye', function() {
        expect(function() {
            Matrix4.fromCamera({
                target : Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
                up : Cartesian3.UNIT_Y
            });
        }).toThrowDeveloperError();
    });

    it('fromCamera throws without target', function() {
        expect(function() {
            Matrix4.fromCamera({
                eye : Cartesian3.ZERO,
                up : Cartesian3.UNIT_Y
            });
        }).toThrowDeveloperError();
    });

    it('fromCamera throws without up', function() {
        expect(function() {
            Matrix4.fromCamera({
                eye : Cartesian3.ZERO,
                target : Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3())
            });
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without left', function() {
        expect(function() {
            var right = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computeOrthographicOffCenter(undefined, right, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without right', function() {
        expect(function() {
            var left = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computeOrthographicOffCenter(left, undefined, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without bottom', function() {
        expect(function() {
            var left = 0, right = 0, top = 0, near = 0, far = 0;
            Matrix4.computeOrthographicOffCenter(left, right, undefined, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without top', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, near = 0, far = 0;
            Matrix4.computeOrthographicOffCenter(left, right, bottom, undefined, near, far);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without near', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, far = 0;
            Matrix4.computeOrthographicOffCenter(left, right, bottom, top, undefined, far);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without far', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, near = 0;
            Matrix4.computeOrthographicOffCenter(left, right, bottom, top, near, undefined);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without left', function() {
        expect(function() {
            var right = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computePerspectiveOffCenter (undefined, right, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without right', function() {
        expect(function() {
            var left = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computePerspectiveOffCenter (left, undefined, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without bottom', function() {
        expect(function() {
            var left = 0, right = 0, top = 0, near = 0, far = 0;
            Matrix4.computePerspectiveOffCenter (left, right, undefined, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without top', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, near = 0, far = 0;
            Matrix4.computePerspectiveOffCenter (left, right, bottom, undefined, near, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without near', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, far = 0;
            Matrix4.computePerspectiveOffCenter (left, right, bottom, top, undefined, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without far', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, near = 0;
            Matrix4.computePerspectiveOffCenter (left, right, bottom, top, near, undefined);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter  throws without left', function() {
        expect(function() {
            var right = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (undefined, right, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter  throws without right', function() {
        expect(function() {
            var left = 0, bottom = 0, top = 0, near = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (left, undefined, bottom, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter  throws without bottom', function() {
        expect(function() {
            var left = 0, right = 0, top = 0, near = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (left, right, undefined, top, near, far);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter  throws without top', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, near = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (left, right, bottom, undefined, near, far);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter  throws without near', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (left, right, bottom, top, undefined, far);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveFieldOfView throws with out of range y field of view', function() {
        expect(function() {
            Matrix4.computePerspectiveFieldOfView(0, 1, 2, 3);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveFieldOfView throws with out of range aspect', function() {
        expect(function() {
            Matrix4.computePerspectiveFieldOfView(1, 0, 2, 3);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveFieldOfView throws with out of range near', function() {
        expect(function() {
            Matrix4.computePerspectiveFieldOfView(1, 1, 0, 3);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveFieldOfView throws with out of range far', function() {
        expect(function() {
            Matrix4.computePerspectiveFieldOfView(1, 1, 2, 0);
        }).toThrowDeveloperError();
    });

    it('clone returns undefined without matrix parameter', function() {
        expect(Matrix4.clone(undefined)).toBeUndefined();
    });

    it('toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix4.toArray(undefined);
        }).toThrowDeveloperError();
    });

    it('getElement throws without row parameter', function() {
        var row;
        var col = 0.0;
        expect(function() {
            Matrix4.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getElement throws without column parameter', function() {
        var row = 0.0;
        var col;
        expect(function() {
            Matrix4.getElementIndex(col, row);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getColumn(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without of range index parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.getColumn(matrix, 4);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setColumn(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.setColumn(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without of range index parameter', function() {
        var matrix = new Matrix4();
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setColumn(matrix, 4, cartesian);
        }).toThrowDeveloperError();
    });

    it('getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getRow(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('getRow throws without of range index parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.getRow(matrix, 4);
        }).toThrowDeveloperError();
    });

    it('setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setRow(undefined, 2, cartesian);
        }).toThrowDeveloperError();
    });

    it('setRow throws without cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.setRow(matrix, 1, undefined);
        }).toThrowDeveloperError();
    });

    it('setRow throws without of range index parameter', function() {
        var matrix = new Matrix4();
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setRow(matrix, 4, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no left parameter', function() {
        var right = new Matrix4();
        expect(function() {
            Matrix4.multiply(undefined, right);
        }).toThrowDeveloperError();
    });

    it('multiply throws with no right parameter', function() {
        var left = new Matrix4();
        expect(function() {
            Matrix4.multiply(left, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByTranslation throws with no matrix parameter', function() {
        var translation = new Cartesian3();
        expect(function() {
            Matrix4.multiplyByTranslation(undefined, translation);
        }).toThrowDeveloperError();
    });

    it('multiplyByTranslation throws with no translation parameter', function() {
        var m = new Matrix4();
        expect(function() {
            Matrix4.multiplyByTranslation(m, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByUniformScale throws with no matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByUniformScale(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('multiplyByUniformScale throws with no scale parameter', function() {
        var m = new Matrix4();
        expect(function() {
            Matrix4.multiplyByUniformScale(m, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws with no matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByScale(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws with no scale parameter', function() {
        var m = new Matrix4();
        expect(function() {
            Matrix4.multiplyByScale(m, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.multiplyByVector(undefined, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.multiplyByVector(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByPoint throws with no matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.multiplyByPoint(undefined, cartesian);
        }).toThrowDeveloperError();
    });

    it('multiplyByPoint throws with no cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.multiplyByPoint(matrix, undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByScalar(undefined, 2);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.multiplyByScalar(matrix, {});
        }).toThrowDeveloperError();
    });

    it('negate throws without matrix parameter', function() {
        expect(function() {
            Matrix4.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('transpose throws without matrix parameter', function() {
        expect(function() {
            Matrix4.transpose(undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix4.equalsEpsilon(new Matrix4(), new Matrix4(), {});
        }).toThrowDeveloperError();
    });

    it('getTranslation throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getTranslation(undefined);
        }).toThrowDeveloperError();
    });

    it('getRotation throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getRotation(undefined);
        }).toThrowDeveloperError();
    });

    it('inverse throws without matrix parameter', function() {
        expect(function() {
            Matrix4.inverse(undefined);
        }).toThrowDeveloperError();
    });

    it('inverse throws with non-inversable matrix', function() {
        var matrix = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        expect(function() {
            Matrix4.inverse(matrix, new Matrix4());
        }).toThrowRuntimeError();
    });

    it('inverseTransformation throws without matrix parameter', function() {
        expect(function() {
            Matrix4.inverseTransformation(undefined);
        }).toThrowDeveloperError();
    });

    it('getColumn throws without result parameter', function() {
        expect(function() {
            Matrix4.getColumn(new Matrix4(), 2);
        }).toThrowDeveloperError();
    });

    it('setColumn throws without result parameter', function() {
        expect(function() {
            Matrix4.setColumn(new Matrix4(), 2, new Cartesian4());
        }).toThrowDeveloperError();
    });

    it('getRow throws without result parameter', function() {
        expect(function() {
            Matrix4.getRow(new Matrix4(), 2);
        }).toThrowDeveloperError();
    });

    it('setRow throws without result parameter', function() {
        expect(function() {
            Matrix4.setRow(new Matrix4(), 2, new Cartesian4());
        }).toThrowDeveloperError();
    });

    it('getScale throws without result parameter', function() {
        expect(function() {
            Matrix4.getScale(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('multiply throws without result parameter', function() {
        expect(function() {
            Matrix4.multiply(new Matrix4(), new Matrix3());
        }).toThrowDeveloperError();
    });

    it('multiplyByVector throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByVector(new Matrix4(), new Cartesian4());
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByScalar(new Matrix4(), 2);
        }).toThrowDeveloperError();
    });

    it('negate throws without result parameter', function() {
        expect(function() {
            Matrix4.negate(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('transpose throws without result parameter', function() {
        expect(function() {
            Matrix4.transpose(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('abs throws without result parameter', function() {
        expect(function() {
            Matrix4.abs(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('inverse throws without result parameter', function() {
        expect(function() {
            Matrix4.inverse(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('multiplyTransformation throws without left parameter', function() {
        expect(function() {
            Matrix4.multiplyTransformation();
        }).toThrowDeveloperError();
    });

    it('multiplyTransformation throws without right parameter', function() {
        expect(function() {
            Matrix4.multiplyTransformation(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('multiplyTransformation throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyTransformation(new Matrix4(), new Matrix4());
        }).toThrowDeveloperError();
    });

    it('multiplyByUniformScale throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByUniformScale(new Matrix4(), 2);
        }).toThrowDeveloperError();
    });

    it('multiplyByScale throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByScale(new Matrix4(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByPointAsVector throws without matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByPointAsVector();
        }).toThrowDeveloperError();
    });

    it('multiplyByPointAsVector throws without cartesian parameter', function() {
        expect(function() {
            Matrix4.multiplyByPointAsVector(new Matrix4());
        }).toThrowDeveloperError();
    });


    it('multiplyByPointAsVector throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByPointAsVector(new Matrix4(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByPoint throws without matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByPoint(new Matrix4(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('getTranslation throws without result parameter', function() {
        expect(function() {
            Matrix4.getTranslation(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('getRotation throws without result parameter', function() {
        expect(function() {
            Matrix4.getRotation(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('inverseTransformtation throws without result parameter', function() {
        expect(function() {
            Matrix4.inverseTransformation(new Matrix4());
        }).toThrowDeveloperError();
    });

    it('multiplyByTranslation throws without result parameter', function() {
        expect(function() {
            Matrix4.multiplyByTranslation(new Matrix4(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('computePerspectiveFieldOfView throws without result parameter', function() {
        expect(function() {
            Matrix4.computePerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 10);
        }).toThrowDeveloperError();
    });

    it('computeOrthographicOffCenter throws without result parameter', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, near = 0;
            Matrix4.computeOrthographicOffCenter(left, right, bottom, top, near, 0);
        }).toThrowDeveloperError();
    });

    it('computePerspectiveOffCenter throws without result parameter', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, near = 0;
            Matrix4.computePerspectiveOffCenter (left, right, bottom, top, near, 0);
        }).toThrowDeveloperError();
    });

    it('computeInfinitePerspectiveOffCenter throws without near', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, far = 0;
            Matrix4.computeInfinitePerspectiveOffCenter (left, right, bottom, top, 0);
        }).toThrowDeveloperError();
    });

    it('computeViewportTransformation works', function() {
        expect(function() {
            var left = 0, right = 0, bottom = 0, top = 0, far = 0;
            Matrix4.computeViewportTransformation ({
                x : 0,
                y : 0,
                width : 4.0,
                height : 6.0
            }, 0.0, 2.0);
        }).toThrowDeveloperError();
    });
});
