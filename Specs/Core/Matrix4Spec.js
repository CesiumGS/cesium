defineSuite([
         'Core/Matrix4',
         'Core/Matrix3',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Math'
     ], function(
         Matrix4,
         Matrix3,
         Cartesian3,
         Cartesian4,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it("construct0", function() {
        var m = new Matrix4();
        expect(m.getColumn0Row0()).toEqual(0);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn0Row2()).toEqual(0);
        expect(m.getColumn0Row3()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(0);
        expect(m.getColumn1Row2()).toEqual(0);
        expect(m.getColumn1Row3()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(0);
        expect(m.getColumn2Row1()).toEqual(0);
        expect(m.getColumn2Row2()).toEqual(0);
        expect(m.getColumn2Row3()).toEqual(0);
        expect(m.getColumn3Row0()).toEqual(0);
        expect(m.getColumn3Row1()).toEqual(0);
        expect(m.getColumn3Row2()).toEqual(0);
        expect(m.getColumn3Row3()).toEqual(0);
    });

    it("construct1", function() {
        var m = new Matrix4(1);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn0Row2()).toEqual(0);
        expect(m.getColumn0Row3()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(1);
        expect(m.getColumn1Row2()).toEqual(0);
        expect(m.getColumn1Row3()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(0);
        expect(m.getColumn2Row1()).toEqual(0);
        expect(m.getColumn2Row2()).toEqual(1);
        expect(m.getColumn2Row3()).toEqual(0);
        expect(m.getColumn3Row0()).toEqual(0);
        expect(m.getColumn3Row1()).toEqual(0);
        expect(m.getColumn3Row2()).toEqual(0);
        expect(m.getColumn3Row3()).toEqual(1);
    });

    it("construct2", function() {
        var m = new Matrix4(new Matrix3(1, 2, 3,
                                        4, 5, 6,
                                        7, 8, 9), new Cartesian3(10, 11, 12));

        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(4);
        expect(m.getColumn0Row2()).toEqual(7);
        expect(m.getColumn0Row3()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(2);
        expect(m.getColumn1Row1()).toEqual(5);
        expect(m.getColumn1Row2()).toEqual(8);
        expect(m.getColumn1Row3()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(3);
        expect(m.getColumn2Row1()).toEqual(6);
        expect(m.getColumn2Row2()).toEqual(9);
        expect(m.getColumn2Row3()).toEqual(0);
        expect(m.getColumn3Row0()).toEqual(10);
        expect(m.getColumn3Row1()).toEqual(11);
        expect(m.getColumn3Row2()).toEqual(12);
        expect(m.getColumn3Row3()).toEqual(1);
    });

    it("construct3", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);

        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(5);
        expect(m.getColumn0Row2()).toEqual(9);
        expect(m.getColumn0Row3()).toEqual(13);
        expect(m.getColumn1Row0()).toEqual(2);
        expect(m.getColumn1Row1()).toEqual(6);
        expect(m.getColumn1Row2()).toEqual(10);
        expect(m.getColumn1Row3()).toEqual(14);
        expect(m.getColumn2Row0()).toEqual(3);
        expect(m.getColumn2Row1()).toEqual(7);
        expect(m.getColumn2Row2()).toEqual(11);
        expect(m.getColumn2Row3()).toEqual(15);
        expect(m.getColumn3Row0()).toEqual(4);
        expect(m.getColumn3Row1()).toEqual(8);
        expect(m.getColumn3Row2()).toEqual(12);
        expect(m.getColumn3Row3()).toEqual(16);
    });

    it("creates from a column major array", function() {
        var values = [ 1,  2,  3,  4,
                       5,  6,  7,  8,
                       9, 10, 11, 12,
                      13, 14, 15, 16];

        var m = Matrix4.fromColumnMajorArray(values);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(2);
        expect(m.getColumn0Row2()).toEqual(3);
        expect(m.getColumn0Row3()).toEqual(4);
        expect(m.getColumn1Row0()).toEqual(5);
        expect(m.getColumn1Row1()).toEqual(6);
        expect(m.getColumn1Row2()).toEqual(7);
        expect(m.getColumn1Row3()).toEqual(8);
        expect(m.getColumn2Row0()).toEqual(9);
        expect(m.getColumn2Row1()).toEqual(10);
        expect(m.getColumn2Row2()).toEqual(11);
        expect(m.getColumn2Row3()).toEqual(12);
        expect(m.getColumn3Row0()).toEqual(13);
        expect(m.getColumn3Row1()).toEqual(14);
        expect(m.getColumn3Row2()).toEqual(15);
        expect(m.getColumn3Row3()).toEqual(16);
    });

    it("creates from a column major array 2", function() {
        expect(Matrix4.fromColumnMajorArray().equals(new Matrix4())).toBeTruthy();
    });

    it("creates a non-uniform scale matrix", function() {
        var m = Matrix4.createNonUniformScale(new Cartesian3(1, 2, 3));

        expect(m.getColumn0().equals(new Cartesian4(1, 0, 0, 0))).toBeTruthy();
        expect(m.getColumn1().equals(new Cartesian4(0, 2, 0, 0))).toBeTruthy();
        expect(m.getColumn2().equals(new Cartesian4(0, 0, 3, 0))).toBeTruthy();
        expect(m.getColumn3().equals(new Cartesian4(0, 0, 0, 1))).toBeTruthy();
    });

    it("creates a uniform scale matrix", function() {
        var m0 = Matrix4.createScale(2);
        var m1 = Matrix4.createNonUniformScale(new Cartesian3(2, 2, 2));

        expect(m0.equals(m1)).toBeTruthy();
    });

    it("creates scale matrices without arguments", function() {
        expect(Matrix4.createNonUniformScale().equals(new Matrix4())).toBeTruthy();
        expect(Matrix4.createScale().equals(new Matrix4())).toBeTruthy();
    });

    it("creates a translation matrix", function() {
        var t = new Cartesian3(1, 2, 3);
        var m = Matrix4.createTranslation(t);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn0Row2()).toEqual(0);
        expect(m.getColumn0Row3()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(1);
        expect(m.getColumn1Row2()).toEqual(0);
        expect(m.getColumn1Row3()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(0);
        expect(m.getColumn2Row1()).toEqual(0);
        expect(m.getColumn2Row2()).toEqual(1);
        expect(m.getColumn2Row3()).toEqual(0);
        expect(m.getColumn3Row0()).toEqual(t.x);
        expect(m.getColumn3Row1()).toEqual(t.y);
        expect(m.getColumn3Row2()).toEqual(t.z);
        expect(m.getColumn3Row3()).toEqual(1);
    });

    it("creates a translation matrix without arguments", function() {
       var m = Matrix4.createTranslation();
       expect(m.getColumn0Row0()).toEqual(0);
       expect(m.getColumn0Row1()).toEqual(0);
       expect(m.getColumn0Row2()).toEqual(0);
       expect(m.getColumn0Row3()).toEqual(0);
       expect(m.getColumn1Row0()).toEqual(0);
       expect(m.getColumn1Row1()).toEqual(0);
       expect(m.getColumn1Row2()).toEqual(0);
       expect(m.getColumn1Row3()).toEqual(0);
       expect(m.getColumn2Row0()).toEqual(0);
       expect(m.getColumn2Row1()).toEqual(0);
       expect(m.getColumn2Row2()).toEqual(0);
       expect(m.getColumn2Row3()).toEqual(0);
       expect(m.getColumn3Row0()).toEqual(0);
       expect(m.getColumn3Row1()).toEqual(0);
       expect(m.getColumn3Row2()).toEqual(0);
       expect(m.getColumn3Row3()).toEqual(0);
    });

    it("getIdentity", function() {
        expect(Matrix4.getIdentity().equals(new Matrix4(1))).toBeTruthy();
    });

    it("getColumnMajorValue0", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);

        expect(m.getColumnMajorValue(0)).toEqual(1);
        expect(m.getColumnMajorValue(1)).toEqual(5);
        expect(m.getColumnMajorValue(2)).toEqual(9);
        expect(m.getColumnMajorValue(3)).toEqual(13);
        expect(m.getColumnMajorValue(4)).toEqual(2);
        expect(m.getColumnMajorValue(5)).toEqual(6);
        expect(m.getColumnMajorValue(6)).toEqual(10);
        expect(m.getColumnMajorValue(7)).toEqual(14);
        expect(m.getColumnMajorValue(8)).toEqual(3);
        expect(m.getColumnMajorValue(9)).toEqual(7);
        expect(m.getColumnMajorValue(10)).toEqual(11);
        expect(m.getColumnMajorValue(11)).toEqual(15);
        expect(m.getColumnMajorValue(12)).toEqual(4);
        expect(m.getColumnMajorValue(13)).toEqual(8);
        expect(m.getColumnMajorValue(14)).toEqual(12);
        expect(m.getColumnMajorValue(15)).toEqual(16);
    });

    it("getColumnMajorValue1", function() {
        expect(function() {
            new Matrix4().getColumnMajorValue(-1);
        }).toThrow();
    });

    it("getColumnMajorValue2", function() {
        expect(function() {
            new Matrix4().getColumnMajorValue(16);
        }).toThrow();
    });

    it("gets individual columns", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);

        expect(m.getColumn0().equals(new Cartesian4(1, 5, 9, 13))).toBeTruthy();
        expect(m.getColumn1().equals(new Cartesian4(2, 6, 10, 14))).toBeTruthy();
        expect(m.getColumn2().equals(new Cartesian4(3, 7, 11, 15))).toBeTruthy();
        expect(m.getColumn3().equals(new Cartesian4(4, 8, 12, 16))).toBeTruthy();
    });

    it("gets individual columns 2", function() {
        expect(Matrix4.getIdentity().getColumn0().equals(Cartesian4.getUnitX())).toBeTruthy();
        expect(Matrix4.getIdentity().getColumn1().equals(Cartesian4.getUnitY())).toBeTruthy();
        expect(Matrix4.getIdentity().getColumn2().equals(Cartesian4.getUnitZ())).toBeTruthy();
        expect(Matrix4.getIdentity().getColumn3().equals(Cartesian4.getUnitW())).toBeTruthy();
    });

    it("sets individual columns", function() {
        var m = new Matrix4();
        var c0 = new Cartesian4(1, 2, 3, 4);
        var c1 = new Cartesian4(5, 6, 7, 8);
        var c2 = new Cartesian4(9, 10, 11, 12);
        var c3 = new Cartesian4(13, 14, 15, 16);

        m.setColumn0(c0);
        m.setColumn1(c1);
        m.setColumn2(c2);
        m.setColumn3(c3);

        expect(m.getColumn0().equals(c0)).toBeTruthy();
        expect(m.getColumn1().equals(c1)).toBeTruthy();
        expect(m.getColumn2().equals(c2)).toBeTruthy();
        expect(m.getColumn3().equals(c3)).toBeTruthy();

        expect(m.equals(new Matrix4(1, 5,  9, 13,
                                    2, 6, 10, 14,
                                    3, 7, 11, 15,
                                    4, 8, 12, 16))).toBeTruthy();
    });

    it("gets individual rows", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);

        expect(m.getRow0().equals(new Cartesian4(1, 2, 3, 4))).toBeTruthy();
        expect(m.getRow1().equals(new Cartesian4(5, 6, 7, 8))).toBeTruthy();
        expect(m.getRow2().equals(new Cartesian4(9, 10, 11, 12))).toBeTruthy();
        expect(m.getRow3().equals(new Cartesian4(13, 14, 15, 16))).toBeTruthy();
    });

    it("gets individual rows 2", function() {
        expect(Matrix4.getIdentity().getRow0().equals(Cartesian4.getUnitX())).toBeTruthy();
        expect(Matrix4.getIdentity().getRow1().equals(Cartesian4.getUnitY())).toBeTruthy();
        expect(Matrix4.getIdentity().getRow2().equals(Cartesian4.getUnitZ())).toBeTruthy();
        expect(Matrix4.getIdentity().getRow3().equals(Cartesian4.getUnitW())).toBeTruthy();
    });

    it("sets individual rows", function() {
        var m = new Matrix4();
        var c0 = new Cartesian4(1, 2, 3, 4);
        var c1 = new Cartesian4(5, 6, 7, 8);
        var c2 = new Cartesian4(9, 10, 11, 12);
        var c3 = new Cartesian4(13, 14, 15, 16);

        m.setRow0(c0);
        m.setRow1(c1);
        m.setRow2(c2);
        m.setRow3(c3);

        expect(m.getRow0().equals(c0)).toBeTruthy();
        expect(m.getRow1().equals(c1)).toBeTruthy();
        expect(m.getRow2().equals(c2)).toBeTruthy();
        expect(m.getRow3().equals(c3)).toBeTruthy();

        expect(m.equals(new Matrix4( 1,  2,  3,  4,
                                     5,  6,  7,  8,
                                     9, 10, 11, 12,
                                    13, 14, 15, 16))).toBeTruthy();
    });

    it("getNumberOfElements0", function() {
        expect(Matrix4.getNumberOfElements()).toEqual(16);
    });

    it("equals0", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        var m2 = new Matrix4( 1,  2,  3,  4,
                              5,  6,  7,  8,
                              9, 10, 11, 12,
                             13, 14, 15, 16);
        expect(m.equals(m2)).toBeTruthy();
    });

    it("equals1", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        var m2 = new Matrix4( 1,  2,  3,  4,
                              5,  6,  7,  0,
                              9, 10, 11, 12,
                             13, 14, 15, 16);
        expect(m.equals(m2)).toBeFalsy();
    });

    it("equalsEpsilon", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        var m2 = new Matrix4( 2,  3,  4,  5,
                              6,  7,  8,  9,
                             10, 11, 12, 13,
                             14, 15, 16, 17);
        expect(m.equalsEpsilon(m2, 1)).toBeTruthy();
        expect(m.equalsEpsilon(m2, 0.5)).toBeFalsy();
    });

    it("toString", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        expect(m.toString()).toEqual("(1, 2, 3, 4)\n(5, 6, 7, 8)\n(9, 10, 11, 12)\n(13, 14, 15, 16)");
    });

    it("getRotation", function() {
        var r = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var m = new Matrix4(r, new Cartesian3());
        var r2 = m.getRotation();

        expect(r.equals(r2)).toBeTruthy();
    });

    it("getRotationTranspose", function() {
        var r = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var m = new Matrix4(r, new Cartesian3());
        var r2 = m.getRotationTranspose();

        expect(r.transpose().equals(r2)).toBeTruthy();
    });

    it("inverseTransformation0", function() {
        var m = new Matrix4(Matrix3.getIdentity(), Cartesian3.getZero());
        var mInverse = m.inverseTransformation();

        var v = new Cartesian4(1, 2, 3, 1);
        var vPrime = m.multiplyWithVector(v);
        var vv = mInverse.multiplyWithVector(vPrime);

        expect(v.equals(vv)).toBeTruthy();
    });

    it("inverseTransformation1", function() {
        var rotation = new Matrix3(1, 0, 0,
                                   0, 0, 1,
                                   0, 1, 0);
        var translation = new Cartesian3(10, 20, 30);

        var m = new Matrix4(rotation, translation);
        var mInverse = m.inverseTransformation();

        var v = new Cartesian4(1, 2, 3, 1);
        var vPrime = m.multiplyWithVector(v);
        var vv = mInverse.multiplyWithVector(vPrime);

        expect(v.equals(vv)).toBeTruthy();
    });

    it("inverseTransformation2", function() {
        var rotation = new Matrix3(1, 0, 0,
                                   0, 0, 1,
                                   0, 1, 0);
        var translation = new Cartesian3(1, 2, 3);

        var m = new Matrix4(rotation, translation);
        var mInverse = m.inverseTransformation();

        expect(Matrix4.getIdentity().equals(mInverse.multiplyWithMatrix(m))).toBeTruthy();
    });

    it("inverse0", function() {
        var m = new Matrix4(Matrix3.getIdentity(), Cartesian3.getZero());
        var mInverse = m.inverse();

        expect(Matrix4.getIdentity().equals(mInverse.multiplyWithMatrix(m))).toBeTruthy();
    });

    it("inverse1", function() {
        var m = new Matrix4(Matrix3.getIdentity(), new Cartesian3(1, 2, 3));
        var mInverse = m.inverse();

        expect(Matrix4.getIdentity().equals(mInverse.multiplyWithMatrix(m))).toBeTruthy();
    });

    it("inverse2", function() {
        var m = new Matrix4( 0.72,  0.70, 0.00,  0.00,
                            -0.40,  0.41, 0.82,  0.00,
                             0.57, -0.59, 0.57, -3.86,
                             0.00,  0.00, 0.00,  1.00);
        var mInverse = m.inverse();

        expect(Matrix4.getIdentity().equalsEpsilon(mInverse.multiplyWithMatrix(m), CesiumMath.EPSILON10)).toBeTruthy();
    });

    it("inverse3", function() {
        expect(function() {
            new Matrix4( 1.0,  2.0,  3.0,  4.0,
                         5.0,  6.0,  7.0,  8.0,
                         9.0, 10.0, 11.0, 12.0,
                        13.0, 14.0, 15.0, 16.0).inverse();
        }).toThrow();
    });

    it("getTranslation", function() {
        var t = new Cartesian3(1, 2, 3);
        var m = new Matrix4(new Matrix3(), t);
        var t2 = m.getTranslation();

        expect(t.equals(t2)).toBeTruthy();
    });

    it("transpose", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        var mT = new Matrix4(1, 5,  9, 13,
                             2, 6, 10, 14,
                             3, 7, 11, 15,
                             4, 8, 12, 16);

        expect(m.transpose().equals(mT)).toBeTruthy();
        expect(m.transpose().transpose().equals(m)).toBeTruthy();
    });

    it("multiplyWithVector0", function() {
        var m = new Matrix4(1);
        var v = new Cartesian4(1, 2, 3, 4);
        expect(m.multiplyWithVector(v).equals(v)).toBeTruthy();
    });

    it("multiplyWithVector1", function() {
        var m = new Matrix4(2);
        var v = new Cartesian4(1, 2, 3, 4);
        var u = new Cartesian4(2, 4, 6, 8);
        expect(m.multiplyWithVector(v).equals(u)).toBeTruthy();
    });

    it("multiplyWithMatrix0", function() {
        var zero = new Matrix4(0);
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        expect(zero.multiplyWithMatrix(m).equals(zero)).toBeTruthy();
    });

    it("multiplyWithMatrix1", function() {
        var i = Matrix4.getIdentity();
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        expect(i.multiplyWithMatrix(m).equals(m)).toBeTruthy();
    });

    it("multiplyWithMatrix2", function() {
        var m = new Matrix4(1, 1, 1, 1,
                            1, 1, 1, 1,
                            1, 1, 1, 1,
                            1, 1, 1, 1);
        var result = new Matrix4(4, 4, 4, 4,
                                 4, 4, 4, 4,
                                 4, 4, 4, 4,
                                 4, 4, 4, 4);
        expect(m.multiplyWithMatrix(m).equals(result)).toBeTruthy();
    });

    it("negate", function() {
        var m = new Matrix4( 1,  2,  3,  4,
                             5,  6,  7,  8,
                             9, 10, 11, 12,
                            13, 14, 15, 16);
        var n = new Matrix4( -1,  -2,  -3,  -4,
                             -5,  -6,  -7,  -8,
                             -9, -10, -11, -12,
                            -13, -14, -15, -16);

        expect(m.negate().equals(n)).toBeTruthy();
        expect(m.negate().negate().equals(m)).toBeTruthy();
    });

    it("createPerspectiveFieldOfView0", function() {
        expect(function() {
            Matrix4.createPerspectiveFieldOfView(-1, 1, 1, 1);
        }).toThrow();
    });

    it("createPerspectiveFieldOfView1", function() {
        expect(function() {
            Matrix4.createPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 0, 1, 1);
        }).toThrow();
    });

    it("createPerspectiveFieldOfView2", function() {
        expect(function() {
            Matrix4.createPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 0, 1);
        }).toThrow();
    });

    it("createPerspectiveFieldOfView3", function() {
        expect(function() {
            Matrix4.createPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 0);
        }).toThrow();
    });

    it("createPerspectiveFieldOfView4", function() {
        var mExpected = new Matrix4(1, 0,     0,     0,
                                    0, 1,     0,     0,
                                    0, 0, -1.22, -2.22,
                                    0, 0,    -1,     0);
        var m = Matrix4.createPerspectiveFieldOfView(CesiumMath.PI_OVER_TWO, 1, 1, 10);

        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("createPerspectiveOffCenter", function() {
        var mExpected = new Matrix4(2, 0,  3,  0,
                                    0, 2,  5,  0,
                                    0, 0, -3, -4,
                                    0, 0, -1,  0);
        var m = Matrix4.createPerspectiveOffCenter(1, 2, 2, 3, 1, 2);

        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("createInfinitePerspectiveOffCenter", function() {
        var mExpected = new Matrix4(2, 0,  3,  0,
                                    0, 2,  5,  0,
                                    0, 0, -1, -2,
                                    0, 0, -1,  0);
        var m = Matrix4.createInfinitePerspectiveOffCenter(1, 2, 2, 3, 1);

        expect(mExpected.equalsEpsilon(m, CesiumMath.EPSILON2)).toBeTruthy();
    });

    it("createOrthographicOffCenter", function() {
        var mExpected = new Matrix4(2, 0,  0, -1,
                                    0, 2,  0, -5,
                                    0, 0, -2, -1,
                                    0, 0,  0,  1);
        var m = Matrix4.createOrthographicOffCenter(0, 1, 2, 3, 0, 1);

        expect(mExpected.equals(m)).toBeTruthy();
    });

    it("creates a viewport transformation", function() {
        var mExpected = new Matrix4(2.0, 0.0, 0.0, 2.0,
                                    0.0, 3.0, 0.0, 3.0,
                                    0.0, 0.0, 1.0, 1.0,
                                    0.0, 0.0, 0.0, 1.0);
        var m = Matrix4.createViewportTransformation({
            x : 0,
            y : 0,
            width : 4.0,
            height : 6.0
        }, 0.0, 2.0);

        expect(mExpected.equals(m)).toBeTruthy();
    });

    it("createLookAt", function() {
        var mExpected = new Matrix4(1);
        var m = Matrix4.createLookAt(Cartesian3.getZero(), Cartesian3.getUnitZ().negate(), Cartesian3.getUnitY());

        expect(mExpected.equals(m)).toBeTruthy();
    });

    it("throws when creating from a column major array without enough elements", function() {
        var values = [ 1,  2,  3,  4,
                       5,  6,  7,  8,
                       9, 10, 11, 12,
                      13, 14, 15];

        expect(function() {
            return Matrix4.fromColumnMajorArray(values);
        }).toThrow();
    });

    it("clone", function() {
        var m = new Matrix4( 1.0,  2.0,  3.0,  4.0,
                             5.0,  6.0,  7.0,  8.0,
                             9.0, 10.0, 11.0, 12.0,
                            13.0, 14.0, 15.0, 16.0);
        var n = m.clone();
        expect(m.equals(n)).toBeTruthy();
    });
});