/*global defineSuite*/
defineSuite([
         'Core/Matrix4',
         'Core/Cartesian4',
         'Core/Math'
     ], function(
         Matrix4,
         Cartesian4,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

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
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
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


    it('toArray works without a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0];
        var returnedResult = Matrix4.fromColumnMajorArray(expected).toArray();
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('toArray works with a result parameter', function() {
        var expected = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0];
        var result = [];
        var returnedResult = Matrix4.fromColumnMajorArray(expected).toArray(result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toNotBe(expected);
        expect(returnedResult).toEqualArray(expected);
    });

    it('getColumn works without a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedColumn0 = new Cartesian4(1.0, 5.0, 9.0, 13.0);
        var expectedColumn1 = new Cartesian4(2.0, 6.0, 10.0, 14.0);
        var expectedColumn2 = new Cartesian4(3.0, 7.0, 11.0, 15.0);
        var expectedColumn3 = new Cartesian4(4.0, 8.0, 12.0, 16.0);

        var resultColumn0 = matrix.getColumn(0);
        var resultColumn1 = matrix.getColumn(1);
        var resultColumn2 = matrix.getColumn(2);
        var resultColumn3 = matrix.getColumn(3);

        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toEqual(expectedColumn2);
        expect(resultColumn3).toEqual(expectedColumn3);
    });

    it('getColumn works with a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedColumn0 = new Cartesian4(1.0, 5.0, 9.0, 13.0);
        var expectedColumn1 = new Cartesian4(2.0, 6.0, 10.0, 14.0);
        var expectedColumn2 = new Cartesian4(3.0, 7.0, 11.0, 15.0);
        var expectedColumn3 = new Cartesian4(4.0, 8.0, 12.0, 16.0);

        var resultColumn0 = new Cartesian4();
        var resultColumn1 = new Cartesian4();
        var resultColumn2 = new Cartesian4();
        var resultColumn3 = new Cartesian4();
        var returnedResultColumn0 = matrix.getColumn(0, resultColumn0);
        var returnedResultColumn1 = matrix.getColumn(1, resultColumn1);
        var returnedResultColumn2 = matrix.getColumn(2, resultColumn2);
        var returnedResultColumn3 = matrix.getColumn(3, resultColumn3);

        expect(resultColumn0).toBe(returnedResultColumn0);
        expect(resultColumn0).toEqual(expectedColumn0);
        expect(resultColumn1).toBe(returnedResultColumn1);
        expect(resultColumn1).toEqual(expectedColumn1);
        expect(resultColumn2).toBe(returnedResultColumn2);
        expect(resultColumn2).toEqual(expectedColumn2);
        expect(resultColumn3).toBe(returnedResultColumn3);
        expect(resultColumn3).toEqual(expectedColumn3);
    });

    it('setColumn works without a result parameter for each column', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        var expected = new Matrix4(17.0, 2.0, 3.0, 4.0, 18.0, 6.0, 7.0, 8.0, 19.0, 10.0, 11.0, 12.0, 20.0, 14.0, 15.0, 16.0);
        var result = matrix.setColumn(0, new Cartesian4(17.0, 18.0, 19.0, 20.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 17.0, 3.0, 4.0, 5.0, 18.0, 7.0, 8.0, 9.0, 19.0, 11.0, 12.0, 13.0, 20.0, 15.0, 16.0);
        result = matrix.setColumn(1, new Cartesian4(17.0, 18.0, 19.0, 20.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 17.0, 4.0, 5.0, 6.0, 18.0, 8.0, 9.0, 10.0, 19.0, 12.0, 13.0, 14.0, 20.0, 16.0);
        result = matrix.setColumn(2, new Cartesian4(17.0, 18.0, 19.0, 20.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 17.0, 5.0, 6.0, 7.0, 18.0, 9.0, 10.0, 11.0, 19.0, 13.0, 14.0, 15.0, 20.0);
        result = matrix.setColumn(3, new Cartesian4(17.0, 18.0, 19.0, 20.0));
        expect(result).toEqual(expected);
    });

    it('setColumn works with a result parameter for each column', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        var result = new Matrix4();

        var expected = new Matrix4(17.0, 2.0, 3.0, 4.0, 18.0, 6.0, 7.0, 8.0, 19.0, 10.0, 11.0, 12.0, 20.0, 14.0, 15.0, 16.0);
        var returnedResult = matrix.setColumn(0, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 17.0, 3.0, 4.0, 5.0, 18.0, 7.0, 8.0, 9.0, 19.0, 11.0, 12.0, 13.0, 20.0, 15.0, 16.0);
        returnedResult = matrix.setColumn(1, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 17.0, 4.0, 5.0, 6.0, 18.0, 8.0, 9.0, 10.0, 19.0, 12.0, 13.0, 14.0, 20.0, 16.0);
        returnedResult = matrix.setColumn(2, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 17.0, 5.0, 6.0, 7.0, 18.0, 9.0, 10.0, 11.0, 19.0, 13.0, 14.0, 15.0, 20.0);
        returnedResult = matrix.setColumn(3, new Cartesian4(17.0, 18.0, 19.0, 20.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
});

    it('getRow works without a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedRow0 = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var expectedRow1 = new Cartesian4(5.0, 6.0, 7.0, 8.0);
        var expectedRow2 = new Cartesian4(9.0, 10.0, 11.0, 12.0);
        var expectedRow3 = new Cartesian4(13.0, 14.0, 15.0, 16.0);

        var resultRow0 = matrix.getRow(0);
        var resultRow1 = matrix.getRow(1);
        var resultRow2 = matrix.getRow(2);
        var resultRow3 = matrix.getRow(3);

        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toEqual(expectedRow2);
        expect(resultRow3).toEqual(expectedRow3);
    });

    it('getRow works with a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expectedRow0 = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var expectedRow1 = new Cartesian4(5.0, 6.0, 7.0, 8.0);
        var expectedRow2 = new Cartesian4(9.0, 10.0, 11.0, 12.0);
        var expectedRow3 = new Cartesian4(13.0, 14.0, 15.0, 16.0);

        var resultRow0 = new Cartesian4();
        var resultRow1 = new Cartesian4();
        var resultRow2 = new Cartesian4();
        var resultRow3 = new Cartesian4();
        var returnedResultRow0 = matrix.getRow(0, resultRow0);
        var returnedResultRow1 = matrix.getRow(1, resultRow1);
        var returnedResultRow2 = matrix.getRow(2, resultRow2);
        var returnedResultRow3 = matrix.getRow(3, resultRow3);

        expect(resultRow0).toBe(returnedResultRow0);
        expect(resultRow0).toEqual(expectedRow0);
        expect(resultRow1).toBe(returnedResultRow1);
        expect(resultRow1).toEqual(expectedRow1);
        expect(resultRow2).toBe(returnedResultRow2);
        expect(resultRow2).toEqual(expectedRow2);
        expect(resultRow3).toBe(returnedResultRow3);
        expect(resultRow3).toEqual(expectedRow3);
    });

    it('setRow works without a result parameter for each row', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);

        var expected = new Matrix4(91.0, 92.0, 93.0, 94.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = matrix.setRow(0, new Cartesian4(91.0, 92.0, 93.0, 94.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 95.0, 96.0, 97.0, 98.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        result = matrix.setRow(1, new Cartesian4(95.0, 96.0, 97.0, 98.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 99.0, 910.0, 911.0, 912.0, 13.0, 14.0, 15.0, 16.0);
        result = matrix.setRow(2, new Cartesian4(99.0, 910.0, 911.0, 912.0));
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 913.0, 914.0, 915.0, 916.0);
        result = matrix.setRow(3, new Cartesian4(913.0, 914.0, 915.0, 916.0));
        expect(result).toEqual(expected);
    });

    it('setRow works with a result parameter for each row', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var result = new Matrix4();

        var expected = new Matrix4(91.0, 92.0, 93.0, 94.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var returnedResult = matrix.setRow(0, new Cartesian4(91.0, 92.0, 93.0, 94.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 95.0, 96.0, 97.0, 98.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        returnedResult = matrix.setRow(1, new Cartesian4(95.0, 96.0, 97.0, 98.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 99.0, 910.0, 911.0, 912.0, 13.0, 14.0, 15.0, 16.0);
        returnedResult = matrix.setRow(2, new Cartesian4(99.0, 910.0, 911.0, 912.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);

        expected = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 913.0, 914.0, 915.0, 916.0);
        returnedResult = matrix.setRow(3, new Cartesian4(913.0, 914.0, 915.0, 916.0), result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('multiply works without a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(250, 260, 270, 280, 618, 644, 670, 696, 986, 1028, 1070, 1112, 1354, 1412, 1470, 1528);
        var result = left.multiply(right);
        expect(result).toEqual(expected);
    });

    it('multiply works with a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(250, 260, 270, 280, 618, 644, 670, 696, 986, 1028, 1070, 1112, 1354, 1412, 1470, 1528);
        var result = new Matrix4();
        var returnedResult = left.multiply(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiply works with "this" result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Matrix4(17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32);
        var expected = new Matrix4(250, 260, 270, 280, 618, 644, 670, 696, 986, 1028, 1070, 1112, 1354, 1412, 1470, 1528);
        var returnedResult = left.multiply(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expected);
    });

    it('multiplyByVector works without a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Cartesian4(17, 18, 19, 20);
        var expected = new Cartesian4(190, 486, 782, 1078);
        var result = left.multiplyByVector(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByVector works with a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = new Cartesian4(17, 18, 19, 20);
        var expected = new Cartesian4(190, 486, 782, 1078);
        var result = new Cartesian4();
        var returnedResult = left.multiplyByVector(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works without a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = 2;
        var expected = new Matrix4(2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32);
        var result = left.multiplyByScalar(right);
        expect(result).toEqual(expected);
    });

    it('multiplyByScalar works with a result parameter', function() {
        var left = new Matrix4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        var right = 2;
        var expected = new Matrix4(2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32);
        var result = new Matrix4();
        var returnedResult = left.multiplyByScalar(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expected);
    });

    it('negate works without a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var result = matrix.negate();
        expect(result).toEqual(expected);
    });

    it('negate works with a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var result = new Matrix4();
        var returnedResult = matrix.negate(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('negate works with "this" result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(-1.0, -2.0, -3.0, -4.0, -5.0, -6.0, -7.0, -8.0, -9.0, -10.0, -11.0, -12.0, -13.0, -14.0, -15.0, -16.0);
        var returnedResult = matrix.negate(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('transpose works without a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);
        var result = matrix.transpose();
        expect(result).toEqual(expected);
    });

    it('transpose works with a result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);
        var result = new Matrix4();
        var returnedResult = matrix.transpose(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expected);
    });

    it('transpose works with "this" result parameter', function() {
        var matrix = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var expected = new Matrix4(1.0, 5.0, 9.0, 13.0, 2.0, 6.0, 10.0, 14.0, 3.0, 7.0, 11.0, 15.0, 4.0, 8.0, 12.0, 16.0);
        var returnedResult = matrix.transpose(matrix);
        expect(matrix).toBe(returnedResult);
        expect(matrix).toEqual(expected);
    });

    it('equals works in all cases', function() {
        var left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equals(right)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0);
        expect(left.equals(right)).toEqual(false);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0);
        expect(left.equals(right)).toEqual(false);
    });

    it('equals works with undefined', function() {
        expect(Matrix4.equals(undefined, undefined)).toEqual(true);
        expect(Matrix4.equals(new Matrix4(), undefined)).toEqual(false);
        expect(Matrix4.equals(undefined, new Matrix4())).toEqual(false);
    });

    it('equalsEpsilon works in all cases', function() {
        var left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        var right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 1.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(5.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 6.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 7.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 8.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 9.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 11.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 12.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 13.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 14.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 15.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 16.0, 13.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 17.0, 14.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 18.0, 15.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);

        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 19.0, 16.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);


        left = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0);
        right = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 20.0);
        expect(left.equalsEpsilon(right, 3.9)).toEqual(false);
        expect(left.equalsEpsilon(right, 4.0)).toEqual(true);
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

    it('fromRowMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix4.fromRowMajorArray(undefined);
        }).toThrow();
    });

    it('fromColumnMajorArray throws with undefined parameter', function() {
        expect(function() {
            Matrix4.fromColumnMajorArray(undefined);
        }).toThrow();
    });

    it('static clone throws without matrix parameter', function() {
        expect(function() {
            Matrix4.clone(undefined);
        }).toThrow();
    });

    it('static toArray throws without matrix parameter', function() {
        expect(function() {
            Matrix4.toArray(undefined);
        }).toThrow();
    });

    it('static getColumn throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getColumn(undefined, 1);
        }).toThrow();
    });

    it('static getColumn throws without of range index parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.getColumn(matrix, 4);
        }).toThrow();
    });

    it('static setColumn throws without matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setColumn(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setColumn throws without cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.setColumn(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setColumn throws without of range index parameter', function() {
        var matrix = new Matrix4();
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setColumn(matrix, 4, cartesian);
        }).toThrow();
    });

    it('static getRow throws without matrix parameter', function() {
        expect(function() {
            Matrix4.getRow(undefined, 1);
        }).toThrow();
    });

    it('static getRow throws without of range index parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.getRow(matrix, 4);
        }).toThrow();
    });

    it('static setRow throws without matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setRow(undefined, 2, cartesian);
        }).toThrow();
    });

    it('static setRow throws without cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.setRow(matrix, 1, undefined);
        }).toThrow();
    });

    it('static setRow throws without of range index parameter', function() {
        var matrix = new Matrix4();
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.setRow(matrix, 4, cartesian);
        }).toThrow();
    });

    it('static multiply throws with no left parameter', function() {
        var right = new Matrix4();
        expect(function() {
            Matrix4.multiply(undefined, right);
        }).toThrow();
    });

    it('static multiply throws with no right parameter', function() {
        var left = new Matrix4();
        expect(function() {
            Matrix4.multiply(left, undefined);
        }).toThrow();
    });

    it('static multiplyByVector throws with no matrix parameter', function() {
        var cartesian = new Cartesian4();
        expect(function() {
            Matrix4.multiplyByVector(undefined, cartesian);
        }).toThrow();
    });

    it('static multiplyByVector throws with no cartesian parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.multiplyByVector(matrix, undefined);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no matrix parameter', function() {
        expect(function() {
            Matrix4.multiplyByScalar(undefined, 2);
        }).toThrow();
    });

    it('static multiplyByScalar throws with non-numeric scalar parameter', function() {
        var matrix = new Matrix4();
        expect(function() {
            Matrix4.multiplyByScalar(matrix, {});
        }).toThrow();
    });

    it('static negate throws without matrix parameter', function() {
        expect(function() {
            Matrix4.negate(undefined);
        }).toThrow();
    });

    it('static transpose throws without matrix parameter', function() {
        expect(function() {
            Matrix4.transpose(undefined);
        }).toThrow();
    });

    it('static equalsEpsilon throws with non-number parameter', function() {
        expect(function() {
            Matrix4.equalsEpsilon(new Matrix4(), new Matrix4(), {});
        }).toThrow();
    });
});

//defineSuite([
//         'Core/Matrix4',
//         'Core/Matrix3',
//         'Core/Cartesian3',
//         'Core/Cartesian4',
//         'Core/Math'
//     ], function(
//         Matrix4,
//         Matrix3,
//         Cartesian3,
//         Cartesian4,
//         CesiumMath) {
//    "use strict";
//    /*global it,expect*/
//
//    it('construct0', function() {
//        var m = new Matrix4();
//        expect(m.getColumn0Row0()).toEqual(0);
//        expect(m.getColumn0Row1()).toEqual(0);
//        expect(m.getColumn0Row2()).toEqual(0);
//        expect(m.getColumn0Row3()).toEqual(0);
//        expect(m.getColumn1Row0()).toEqual(0);
//        expect(m.getColumn1Row1()).toEqual(0);
//        expect(m.getColumn1Row2()).toEqual(0);
//        expect(m.getColumn1Row3()).toEqual(0);
//        expect(m.getColumn2Row0()).toEqual(0);
//        expect(m.getColumn2Row1()).toEqual(0);
//        expect(m.getColumn2Row2()).toEqual(0);
//        expect(m.getColumn2Row3()).toEqual(0);
//        expect(m.getColumn3Row0()).toEqual(0);
//        expect(m.getColumn3Row1()).toEqual(0);
//        expect(m.getColumn3Row2()).toEqual(0);
//        expect(m.getColumn3Row3()).toEqual(0);
//    });
//
//    it('construct1', function() {
//        var m = new Matrix4(1);
//        expect(m.getColumn0Row0()).toEqual(1);
//        expect(m.getColumn0Row1()).toEqual(0);
//        expect(m.getColumn0Row2()).toEqual(0);
//        expect(m.getColumn0Row3()).toEqual(0);
//        expect(m.getColumn1Row0()).toEqual(0);
//        expect(m.getColumn1Row1()).toEqual(1);
//        expect(m.getColumn1Row2()).toEqual(0);
//        expect(m.getColumn1Row3()).toEqual(0);
//        expect(m.getColumn2Row0()).toEqual(0);
//        expect(m.getColumn2Row1()).toEqual(0);
//        expect(m.getColumn2Row2()).toEqual(1);
//        expect(m.getColumn2Row3()).toEqual(0);
//        expect(m.getColumn3Row0()).toEqual(0);
//        expect(m.getColumn3Row1()).toEqual(0);
//        expect(m.getColumn3Row2()).toEqual(0);
//        expect(m.getColumn3Row3()).toEqual(1);
//    });
//
//    it('construct2', function() {
//        var m = new Matrix4(new Matrix3(1, 2, 3,
//                                        4, 5, 6,
//                                        7, 8, 9), new Cartesian3(10, 11, 12));
//
//        expect(m.getColumn0Row0()).toEqual(1);
//        expect(m.getColumn0Row1()).toEqual(4);
//        expect(m.getColumn0Row2()).toEqual(7);
//        expect(m.getColumn0Row3()).toEqual(0);
//        expect(m.getColumn1Row0()).toEqual(2);
//        expect(m.getColumn1Row1()).toEqual(5);
//        expect(m.getColumn1Row2()).toEqual(8);
//        expect(m.getColumn1Row3()).toEqual(0);
//        expect(m.getColumn2Row0()).toEqual(3);
//        expect(m.getColumn2Row1()).toEqual(6);
//        expect(m.getColumn2Row2()).toEqual(9);
//        expect(m.getColumn2Row3()).toEqual(0);
//        expect(m.getColumn3Row0()).toEqual(10);
//        expect(m.getColumn3Row1()).toEqual(11);
//        expect(m.getColumn3Row2()).toEqual(12);
//        expect(m.getColumn3Row3()).toEqual(1);
//    });
//
//    it('construct3', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//
//        expect(m.getColumn0Row0()).toEqual(1);
//        expect(m.getColumn0Row1()).toEqual(5);
//        expect(m.getColumn0Row2()).toEqual(9);
//        expect(m.getColumn0Row3()).toEqual(13);
//        expect(m.getColumn1Row0()).toEqual(2);
//        expect(m.getColumn1Row1()).toEqual(6);
//        expect(m.getColumn1Row2()).toEqual(10);
//        expect(m.getColumn1Row3()).toEqual(14);
//        expect(m.getColumn2Row0()).toEqual(3);
//        expect(m.getColumn2Row1()).toEqual(7);
//        expect(m.getColumn2Row2()).toEqual(11);
//        expect(m.getColumn2Row3()).toEqual(15);
//        expect(m.getColumn3Row0()).toEqual(4);
//        expect(m.getColumn3Row1()).toEqual(8);
//        expect(m.getColumn3Row2()).toEqual(12);
//        expect(m.getColumn3Row3()).toEqual(16);
//    });
//
//    it('creates from a column major array', function() {
//        var values = [ 1,  2,  3,  4,
//                       5,  6,  7,  8,
//                       9, 10, 11, 12,
//                      13, 14, 15, 16];
//
//        var m = Matrix4.fromColumnMajorArray(values);
//        expect(m.getColumn0Row0()).toEqual(1);
//        expect(m.getColumn0Row1()).toEqual(2);
//        expect(m.getColumn0Row2()).toEqual(3);
//        expect(m.getColumn0Row3()).toEqual(4);
//        expect(m.getColumn1Row0()).toEqual(5);
//        expect(m.getColumn1Row1()).toEqual(6);
//        expect(m.getColumn1Row2()).toEqual(7);
//        expect(m.getColumn1Row3()).toEqual(8);
//        expect(m.getColumn2Row0()).toEqual(9);
//        expect(m.getColumn2Row1()).toEqual(10);
//        expect(m.getColumn2Row2()).toEqual(11);
//        expect(m.getColumn2Row3()).toEqual(12);
//        expect(m.getColumn3Row0()).toEqual(13);
//        expect(m.getColumn3Row1()).toEqual(14);
//        expect(m.getColumn3Row2()).toEqual(15);
//        expect(m.getColumn3Row3()).toEqual(16);
//    });
//
//    it('creates from a column major array 2', function() {
//        expect(Matrix4.fromColumnMajorArray().equals(new Matrix4())).toEqual(true);
//    });
//
//    it('creates a non-uniform scale matrix', function() {
//        var m = Matrix4.fromNonUniformScale(new Cartesian3(1, 2, 3));
//
//        expect(m.getColumn0().equals(new Cartesian4(1, 0, 0, 0))).toEqual(true);
//        expect(m.getColumn1().equals(new Cartesian4(0, 2, 0, 0))).toEqual(true);
//        expect(m.getColumn2().equals(new Cartesian4(0, 0, 3, 0))).toEqual(true);
//        expect(m.getColumn3().equals(new Cartesian4(0, 0, 0, 1))).toEqual(true);
//    });
//
//    it('creates a uniform scale matrix', function() {
//        var m0 = Matrix4.fromScale(2);
//        var m1 = Matrix4.fromNonUniformScale(new Cartesian3(2, 2, 2));
//
//        expect(m0.equals(m1)).toEqual(true);
//    });
//
//    it('creates scale matrices without arguments', function() {
//        expect(Matrix4.fromNonUniformScale().equals(new Matrix4())).toEqual(true);
//        expect(Matrix4.fromScale().equals(new Matrix4())).toEqual(true);
//    });
//
//    it('creates a translation matrix', function() {
//        var t = new Cartesian3(1, 2, 3);
//        var m = Matrix4.fromTranslation(t);
//        expect(m.getColumn0Row0()).toEqual(1);
//        expect(m.getColumn0Row1()).toEqual(0);
//        expect(m.getColumn0Row2()).toEqual(0);
//        expect(m.getColumn0Row3()).toEqual(0);
//        expect(m.getColumn1Row0()).toEqual(0);
//        expect(m.getColumn1Row1()).toEqual(1);
//        expect(m.getColumn1Row2()).toEqual(0);
//        expect(m.getColumn1Row3()).toEqual(0);
//        expect(m.getColumn2Row0()).toEqual(0);
//        expect(m.getColumn2Row1()).toEqual(0);
//        expect(m.getColumn2Row2()).toEqual(1);
//        expect(m.getColumn2Row3()).toEqual(0);
//        expect(m.getColumn3Row0()).toEqual(t.x);
//        expect(m.getColumn3Row1()).toEqual(t.y);
//        expect(m.getColumn3Row2()).toEqual(t.z);
//        expect(m.getColumn3Row3()).toEqual(1);
//    });
//
//    it('creates a translation matrix without arguments', function() {
//       var m = Matrix4.fromTranslation();
//       expect(m.getColumn0Row0()).toEqual(0);
//       expect(m.getColumn0Row1()).toEqual(0);
//       expect(m.getColumn0Row2()).toEqual(0);
//       expect(m.getColumn0Row3()).toEqual(0);
//       expect(m.getColumn1Row0()).toEqual(0);
//       expect(m.getColumn1Row1()).toEqual(0);
//       expect(m.getColumn1Row2()).toEqual(0);
//       expect(m.getColumn1Row3()).toEqual(0);
//       expect(m.getColumn2Row0()).toEqual(0);
//       expect(m.getColumn2Row1()).toEqual(0);
//       expect(m.getColumn2Row2()).toEqual(0);
//       expect(m.getColumn2Row3()).toEqual(0);
//       expect(m.getColumn3Row0()).toEqual(0);
//       expect(m.getColumn3Row1()).toEqual(0);
//       expect(m.getColumn3Row2()).toEqual(0);
//       expect(m.getColumn3Row3()).toEqual(0);
//    });
//
//    it('IDENTITY', function() {
//        expect(Matrix4.IDENTITY.equals(new Matrix4(1))).toEqual(true);
//    });
//
//    it('getColumnMajorValue0', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//
//        expect(m.getColumnMajorValue(0)).toEqual(1);
//        expect(m.getColumnMajorValue(1)).toEqual(5);
//        expect(m.getColumnMajorValue(2)).toEqual(9);
//        expect(m.getColumnMajorValue(3)).toEqual(13);
//        expect(m.getColumnMajorValue(4)).toEqual(2);
//        expect(m.getColumnMajorValue(5)).toEqual(6);
//        expect(m.getColumnMajorValue(6)).toEqual(10);
//        expect(m.getColumnMajorValue(7)).toEqual(14);
//        expect(m.getColumnMajorValue(8)).toEqual(3);
//        expect(m.getColumnMajorValue(9)).toEqual(7);
//        expect(m.getColumnMajorValue(10)).toEqual(11);
//        expect(m.getColumnMajorValue(11)).toEqual(15);
//        expect(m.getColumnMajorValue(12)).toEqual(4);
//        expect(m.getColumnMajorValue(13)).toEqual(8);
//        expect(m.getColumnMajorValue(14)).toEqual(12);
//        expect(m.getColumnMajorValue(15)).toEqual(16);
//    });
//
//    it('getColumnMajorValue1', function() {
//        expect(function() {
//            new Matrix4().getColumnMajorValue(-1);
//        }).toThrow();
//    });
//
//    it('getColumnMajorValue2', function() {
//        expect(function() {
//            new Matrix4().getColumnMajorValue(16);
//        }).toThrow();
//    });
//
//    it('gets individual columns', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//
//        expect(m.getColumn0().equals(new Cartesian4(1, 5, 9, 13))).toEqual(true);
//        expect(m.getColumn1().equals(new Cartesian4(2, 6, 10, 14))).toEqual(true);
//        expect(m.getColumn2().equals(new Cartesian4(3, 7, 11, 15))).toEqual(true);
//        expect(m.getColumn3().equals(new Cartesian4(4, 8, 12, 16))).toEqual(true);
//    });
//
//    it('gets individual columns 2', function() {
//        expect(Matrix4.IDENTITY.getColumn0().equals(Cartesian4.UNIT_X)).toEqual(true);
//        expect(Matrix4.IDENTITY.getColumn1().equals(Cartesian4.UNIT_Y)).toEqual(true);
//        expect(Matrix4.IDENTITY.getColumn2().equals(Cartesian4.UNIT_Z)).toEqual(true);
//        expect(Matrix4.IDENTITY.getColumn3().equals(Cartesian4.UNIT_W)).toEqual(true);
//    });
//
//    it('sets individual columns', function() {
//        var m = new Matrix4();
//        var c0 = new Cartesian4(1, 2, 3, 4);
//        var c1 = new Cartesian4(5, 6, 7, 8);
//        var c2 = new Cartesian4(9, 10, 11, 12);
//        var c3 = new Cartesian4(13, 14, 15, 16);
//
//        m.setColumn0(c0);
//        m.setColumn1(c1);
//        m.setColumn2(c2);
//        m.setColumn3(c3);
//
//        expect(m.getColumn0().equals(c0)).toEqual(true);
//        expect(m.getColumn1().equals(c1)).toEqual(true);
//        expect(m.getColumn2().equals(c2)).toEqual(true);
//        expect(m.getColumn3().equals(c3)).toEqual(true);
//
//        expect(m.equals(new Matrix4(1, 5,  9, 13,
//                                    2, 6, 10, 14,
//                                    3, 7, 11, 15,
//                                    4, 8, 12, 16))).toEqual(true);
//    });
//
//    it('gets individual rows', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//
//        expect(m.getRow0().equals(new Cartesian4(1, 2, 3, 4))).toEqual(true);
//        expect(m.getRow1().equals(new Cartesian4(5, 6, 7, 8))).toEqual(true);
//        expect(m.getRow2().equals(new Cartesian4(9, 10, 11, 12))).toEqual(true);
//        expect(m.getRow3().equals(new Cartesian4(13, 14, 15, 16))).toEqual(true);
//    });
//
//    it('gets individual rows 2', function() {
//        expect(Matrix4.IDENTITY.getRow0().equals(Cartesian4.UNIT_X)).toEqual(true);
//        expect(Matrix4.IDENTITY.getRow1().equals(Cartesian4.UNIT_Y)).toEqual(true);
//        expect(Matrix4.IDENTITY.getRow2().equals(Cartesian4.UNIT_Z)).toEqual(true);
//        expect(Matrix4.IDENTITY.getRow3().equals(Cartesian4.UNIT_W)).toEqual(true);
//    });
//
//    it('sets individual rows', function() {
//        var m = new Matrix4();
//        var c0 = new Cartesian4(1, 2, 3, 4);
//        var c1 = new Cartesian4(5, 6, 7, 8);
//        var c2 = new Cartesian4(9, 10, 11, 12);
//        var c3 = new Cartesian4(13, 14, 15, 16);
//
//        m.setRow0(c0);
//        m.setRow1(c1);
//        m.setRow2(c2);
//        m.setRow3(c3);
//
//        expect(m.getRow0().equals(c0)).toEqual(true);
//        expect(m.getRow1().equals(c1)).toEqual(true);
//        expect(m.getRow2().equals(c2)).toEqual(true);
//        expect(m.getRow3().equals(c3)).toEqual(true);
//
//        expect(m.equals(new Matrix4( 1,  2,  3,  4,
//                                     5,  6,  7,  8,
//                                     9, 10, 11, 12,
//                                    13, 14, 15, 16))).toEqual(true);
//    });
//
//    it('getNumberOfElements0', function() {
//        expect(Matrix4.getNumberOfElements()).toEqual(16);
//    });
//
//    it('equals0', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        var m2 = new Matrix4( 1,  2,  3,  4,
//                              5,  6,  7,  8,
//                              9, 10, 11, 12,
//                             13, 14, 15, 16);
//        expect(m.equals(m2)).toEqual(true);
//    });
//
//    it('equals1', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        var m2 = new Matrix4( 1,  2,  3,  4,
//                              5,  6,  7,  0,
//                              9, 10, 11, 12,
//                             13, 14, 15, 16);
//        expect(m.equals(m2)).toEqual(false);
//    });
//
//    it('equalsEpsilon', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        var m2 = new Matrix4( 2,  3,  4,  5,
//                              6,  7,  8,  9,
//                             10, 11, 12, 13,
//                             14, 15, 16, 17);
//        expect(m.equalsEpsilon(m2, 1)).toEqual(true);
//        expect(m.equalsEpsilon(m2, 0.5)).toEqual(false);
//    });
//
//    it('toString', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        expect(m.toString()).toEqual('(1, 2, 3, 4)\n(5, 6, 7, 8)\n(9, 10, 11, 12)\n(13, 14, 15, 16)');
//    });
//
//    it('getRotation', function() {
//        var r = new Matrix3(1, 2, 3,
//                            4, 5, 6,
//                            7, 8, 9);
//        var m = new Matrix4(r, new Cartesian3());
//        var r2 = m.getRotation();
//
//        expect(r.equals(r2)).toEqual(true);
//    });
//
//    it('getRotationTranspose', function() {
//        var r = new Matrix3(1, 2, 3,
//                            4, 5, 6,
//                            7, 8, 9);
//        var m = new Matrix4(r, new Cartesian3());
//        var r2 = m.getRotationTranspose();
//
//        expect(r.transpose().equals(r2)).toEqual(true);
//    });
//
//    it('inverseTransformation0', function() {
//        var m = new Matrix4(Matrix3.IDENTITY, Cartesian3.ZERO);
//        var mInverse = m.inverseTransformation();
//
//        var v = new Cartesian4(1, 2, 3, 1);
//        var vPrime = m.multiplyByVector(v);
//        var vv = mInverse.multiplyByVector(vPrime);
//
//        expect(v.equals(vv)).toEqual(true);
//    });
//
//    it('inverseTransformation1', function() {
//        var rotation = new Matrix3(1, 0, 0,
//                                   0, 0, 1,
//                                   0, 1, 0);
//        var translation = new Cartesian3(10, 20, 30);
//
//        var m = new Matrix4(rotation, translation);
//        var mInverse = m.inverseTransformation();
//
//        var v = new Cartesian4(1, 2, 3, 1);
//        var vPrime = m.multiplyByVector(v);
//        var vv = mInverse.multiplyByVector(vPrime);
//
//        expect(v.equals(vv)).toEqual(true);
//    });
//
//    it('inverseTransformation2', function() {
//        var rotation = new Matrix3(1, 0, 0,
//                                   0, 0, 1,
//                                   0, 1, 0);
//        var translation = new Cartesian3(1, 2, 3);
//
//        var m = new Matrix4(rotation, translation);
//        var mInverse = m.inverseTransformation();
//
//        expect(Matrix4.IDENTITY.equals(mInverse.multiply(m))).toEqual(true);
//    });
//
//    it('inverse0', function() {
//        var m = new Matrix4(Matrix3.IDENTITY, Cartesian3.ZERO);
//        var mInverse = m.inverse();
//
//        expect(Matrix4.IDENTITY.equals(mInverse.multiply(m))).toEqual(true);
//    });
//
//    it('inverse1', function() {
//        var m = new Matrix4(Matrix3.IDENTITY, new Cartesian3(1, 2, 3));
//        var mInverse = m.inverse();
//
//        expect(Matrix4.IDENTITY.equals(mInverse.multiply(m))).toEqual(true);
//    });
//
//    it('inverse2', function() {
//        var m = new Matrix4( 0.72,  0.70, 0.00,  0.00,
//                            -0.40,  0.41, 0.82,  0.00,
//                             0.57, -0.59, 0.57, -3.86,
//                             0.00,  0.00, 0.00,  1.00);
//        var mInverse = m.inverse();
//
//        expect(Matrix4.IDENTITY.equalsEpsilon(mInverse.multiply(m), CesiumMath.EPSILON10)).toEqual(true);
//    });
//
//    it('inverse3', function() {
//        expect(function() {
//            new Matrix4( 1.0,  2.0,  3.0,  4.0,
//                         5.0,  6.0,  7.0,  8.0,
//                         9.0, 10.0, 11.0, 12.0,
//                        13.0, 14.0, 15.0, 16.0).inverse();
//        }).toThrow();
//    });
//
//    it('getTranslation', function() {
//        var t = new Cartesian3(1, 2, 3);
//        var m = new Matrix4(new Matrix3(), t);
//        var t2 = m.getTranslation();
//
//        expect(t.equals(t2)).toEqual(true);
//    });
//
//    it('transpose', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        var mT = new Matrix4(1, 5,  9, 13,
//                             2, 6, 10, 14,
//                             3, 7, 11, 15,
//                             4, 8, 12, 16);
//
//        expect(m.transpose().equals(mT)).toEqual(true);
//        expect(m.transpose().transpose().equals(m)).toEqual(true);
//    });
//
//    it('multiplyByVector0', function() {
//        var m = new Matrix4(1);
//        var v = new Cartesian4(1, 2, 3, 4);
//        expect(m.multiplyByVector(v).equals(v)).toEqual(true);
//    });
//
//    it('multiplyByVector1', function() {
//        var m = new Matrix4(2);
//        var v = new Cartesian4(1, 2, 3, 4);
//        var u = new Cartesian4(2, 4, 6, 8);
//        expect(m.multiplyByVector(v).equals(u)).toEqual(true);
//    });
//
//    it('multiply0', function() {
//        var zero = new Matrix4(0);
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        expect(zero.multiply(m).equals(zero)).toEqual(true);
//    });
//
//    it('multiply1', function() {
//        var i = Matrix4.IDENTITY;
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        expect(i.multiply(m).equals(m)).toEqual(true);
//    });
//
//    it('multiply2', function() {
//        var m = new Matrix4(1, 1, 1, 1,
//                            1, 1, 1, 1,
//                            1, 1, 1, 1,
//                            1, 1, 1, 1);
//        var result = new Matrix4(4, 4, 4, 4,
//                                 4, 4, 4, 4,
//                                 4, 4, 4, 4,
//                                 4, 4, 4, 4);
//        expect(m.multiply(m).equals(result)).toEqual(true);
//    });
//
//    it('negate', function() {
//        var m = new Matrix4( 1,  2,  3,  4,
//                             5,  6,  7,  8,
//                             9, 10, 11, 12,
//                            13, 14, 15, 16);
//        var n = new Matrix4( -1,  -2,  -3,  -4,
//                             -5,  -6,  -7,  -8,
//                             -9, -10, -11, -12,
//                            -13, -14, -15, -16);
//
//        expect(m.negate().equals(n)).toEqual(true);
//        expect(m.negate().negate().equals(m)).toEqual(true);
//    });
//
//    it('createPerspectiveFieldOfView0', function() {
//        expect(function() {
//            Matrix4.fromPerspectiveFieldOfView(-1, 1, 1, 1);
//        }).toThrow();
//    });
//
//    it('createPerspectiveFieldOfView1', function() {
//        expect(function() {
//            Matrix4.fromPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 0, 1, 1);
//        }).toThrow();
//    });
//
//    it('createPerspectiveFieldOfView2', function() {
//        expect(function() {
//            Matrix4.fromPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 0, 1);
//        }).toThrow();
//    });
//
//    it('createPerspectiveFieldOfView3', function() {
//        expect(function() {
//            Matrix4.fromPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 0);
//        }).toThrow();
//    });
//
//    it('createPerspectiveFieldOfView4', function() {
//        var mExpected = new Matrix4(1, 0,     0,     0,
//                                    0, 1,     0,     0,
//                                    0, 0, -1.22, -2.22,
//                                    0, 0,    -1,     0);
//        var m = Matrix4.fromPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 10);
//
//        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toEqual(true);
//    });
//
//    it('createPerspectiveOffCenter', function() {
//        var mExpected = new Matrix4(2, 0,  3,  0,
//                                    0, 2,  5,  0,
//                                    0, 0, -3, -4,
//                                    0, 0, -1,  0);
//        var m = Matrix4.fromPerspectiveOffCenter(1, 2, 2, 3, 1, 2);
//
//        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toEqual(true);
//    });
//
//    it('createInfinitePerspectiveOffCenter', function() {
//        var mExpected = new Matrix4(2, 0,  3,  0,
//                                    0, 2,  5,  0,
//                                    0, 0, -1, -2,
//                                    0, 0, -1,  0);
//        var m = Matrix4.fromInfinitePerspectiveOffCenter(1, 2, 2, 3, 1);
//
//        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toEqual(true);
//    });
//
//    it('createOrthographicOffCenter', function() {
//        var mExpected = new Matrix4(2, 0,  0, -1,
//                                    0, 2,  0, -5,
//                                    0, 0, -2, -1,
//                                    0, 0,  0,  1);
//        var m = Matrix4.fromOrthographicOffCenter(0, 1, 2, 3, 0, 1);
//
//        expect(mExpected.equals(m)).toEqual(true);
//    });
//
//    it('creates a viewport transformation', function() {
//        var mExpected = new Matrix4(2.0, 0.0, 0.0, 2.0,
//                                    0.0, 3.0, 0.0, 3.0,
//                                    0.0, 0.0, 1.0, 1.0,
//                                    0.0, 0.0, 0.0, 1.0);
//        var m = Matrix4.fromViewportTransformation({
//            x : 0,
//            y : 0,
//            width : 4.0,
//            height : 6.0
//        }, 0.0, 2.0);
//
//        expect(mExpected.equals(m)).toEqual(true);
//    });
//
//    it('createLookAt', function() {
//        var mExpected = new Matrix4(1);
//        var m = Matrix4.fromLookAt(Cartesian3.ZERO, Cartesian3.UNIT_Z.negate(), Cartesian3.UNIT_Y);
//
//        expect(mExpected.equals(m)).toEqual(true);
//    });
//
//    it('throws when creating from a column major array without enough elements', function() {
//        var values = [ 1,  2,  3,  4,
//                       5,  6,  7,  8,
//                       9, 10, 11, 12,
//                      13, 14, 15];
//
//        expect(function() {
//            return Matrix4.fromColumnMajorArray(values);
//        }).toThrow();
//    });
//
//    it('clone', function() {
//        var m = new Matrix4( 1.0,  2.0,  3.0,  4.0,
//                             5.0,  6.0,  7.0,  8.0,
//                             9.0, 10.0, 11.0, 12.0,
//                            13.0, 14.0, 15.0, 16.0);
//        var n = m.clone();
//        expect(m.equals(n)).toEqual(true);
//    });
//});