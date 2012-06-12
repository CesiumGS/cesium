/*global defineSuite*/
defineSuite([
         'Core/Matrix3',
         'Core/Cartesian3'
     ], function(
         Matrix3,
         Cartesian3) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var m = new Matrix3();
        expect(m.getColumn0Row0()).toEqual(0);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn0Row2()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(0);
        expect(m.getColumn1Row2()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(0);
        expect(m.getColumn2Row1()).toEqual(0);
        expect(m.getColumn2Row2()).toEqual(0);
    });

    it('construct1', function() {
        var m = new Matrix3(1);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn0Row2()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(1);
        expect(m.getColumn1Row2()).toEqual(0);
        expect(m.getColumn2Row0()).toEqual(0);
        expect(m.getColumn2Row1()).toEqual(0);
        expect(m.getColumn2Row2()).toEqual(1);
    });

    it('construct2', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(4);
        expect(m.getColumn0Row2()).toEqual(7);
        expect(m.getColumn1Row0()).toEqual(2);
        expect(m.getColumn1Row1()).toEqual(5);
        expect(m.getColumn1Row2()).toEqual(8);
        expect(m.getColumn2Row0()).toEqual(3);
        expect(m.getColumn2Row1()).toEqual(6);
        expect(m.getColumn2Row2()).toEqual(9);
    });

    it('creates a non-uniform scale matrix', function() {
        var m = Matrix3.createNonUniformScale(new Cartesian3(1, 2, 3));

        expect(m.getColumn0().equals(new Cartesian3(1, 0, 0))).toEqual(true);
        expect(m.getColumn1().equals(new Cartesian3(0, 2, 0))).toEqual(true);
        expect(m.getColumn2().equals(new Cartesian3(0, 0, 3))).toEqual(true);
    });

    it('creates a uniform scale matrix', function() {
        var m0 = Matrix3.createScale(2);
        var m1 = Matrix3.createNonUniformScale(new Cartesian3(2, 2, 2));

        expect(m0.equals(m1)).toEqual(true);
    });

    it('creates scale matrices without arguments', function() {
        expect(Matrix3.createNonUniformScale().equals(new Matrix3())).toEqual(true);
        expect(Matrix3.createScale().equals(new Matrix3())).toEqual(true);
    });

    it('creates from a column major array', function() {
        var values = [1, 2, 3,
                      4, 5, 6,
                      7, 8, 9];

        var m = Matrix3.fromColumnMajorArray(values);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(2);
        expect(m.getColumn0Row2()).toEqual(3);
        expect(m.getColumn1Row0()).toEqual(4);
        expect(m.getColumn1Row1()).toEqual(5);
        expect(m.getColumn1Row2()).toEqual(6);
        expect(m.getColumn2Row0()).toEqual(7);
        expect(m.getColumn2Row1()).toEqual(8);
        expect(m.getColumn2Row2()).toEqual(9);
    });

    it('creates from a column major array 2', function() {
        expect(Matrix3.fromColumnMajorArray().equals(new Matrix3())).toEqual(true);
    });

    it('IDENTITY', function() {
        expect(Matrix3.IDENTITY.equals(new Matrix3(1))).toEqual(true);
    });

    it('getColumnMajorValue0', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        expect(m.getColumnMajorValue(0)).toEqual(1);
        expect(m.getColumnMajorValue(1)).toEqual(4);
        expect(m.getColumnMajorValue(2)).toEqual(7);
        expect(m.getColumnMajorValue(3)).toEqual(2);
        expect(m.getColumnMajorValue(4)).toEqual(5);
        expect(m.getColumnMajorValue(5)).toEqual(8);
        expect(m.getColumnMajorValue(6)).toEqual(3);
        expect(m.getColumnMajorValue(7)).toEqual(6);
        expect(m.getColumnMajorValue(8)).toEqual(9);
    });

    it('getColumnMajorValue1', function() {
        expect(function() {
            new Matrix3().getColumnMajorValue(-1);
        }).toThrow();
    });

    it('getColumnMajorValue2', function() {
        expect(function() {
            new Matrix3().getColumnMajorValue(9);
        }).toThrow();
    });

    it('gets individual columns', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);

        expect(m.getColumn0().equals(new Cartesian3(1, 4, 7))).toEqual(true);
        expect(m.getColumn1().equals(new Cartesian3(2, 5, 8))).toEqual(true);
        expect(m.getColumn2().equals(new Cartesian3(3, 6, 9))).toEqual(true);
    });

    it('gets individual columns 2', function() {
        expect(Matrix3.IDENTITY.getColumn0().equals(Cartesian3.UNIT_X)).toEqual(true);
        expect(Matrix3.IDENTITY.getColumn1().equals(Cartesian3.UNIT_Y)).toEqual(true);
        expect(Matrix3.IDENTITY.getColumn2().equals(Cartesian3.UNIT_Z)).toEqual(true);
    });

    it('sets individual columns', function() {
        var m = new Matrix3();
        var c0 = new Cartesian3(1, 2, 3);
        var c1 = new Cartesian3(4, 5, 6);
        var c2 = new Cartesian3(7, 8, 9);

        m.setColumn0(c0);
        m.setColumn1(c1);
        m.setColumn2(c2);

        expect(m.getColumn0().equals(c0)).toEqual(true);
        expect(m.getColumn1().equals(c1)).toEqual(true);
        expect(m.getColumn2().equals(c2)).toEqual(true);

        expect(m.equals(new Matrix3(1, 4, 7,
                                    2, 5, 8,
                                    3, 6, 9))).toEqual(true);
    });

    it('gets individual rows', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);

        expect(m.getRow0().equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(m.getRow1().equals(new Cartesian3(4, 5, 6))).toEqual(true);
        expect(m.getRow2().equals(new Cartesian3(7, 8, 9))).toEqual(true);
    });

    it('gets individual rows 2', function() {
        expect(Matrix3.IDENTITY.getRow0().equals(Cartesian3.UNIT_X)).toEqual(true);
        expect(Matrix3.IDENTITY.getRow1().equals(Cartesian3.UNIT_Y)).toEqual(true);
        expect(Matrix3.IDENTITY.getRow2().equals(Cartesian3.UNIT_Z)).toEqual(true);
    });

    it('sets individual rows', function() {
        var m = new Matrix3();
        var c0 = new Cartesian3(1, 2, 3);
        var c1 = new Cartesian3(4, 5, 6);
        var c2 = new Cartesian3(7, 8, 9);

        m.setRow0(c0);
        m.setRow1(c1);
        m.setRow2(c2);

        expect(m.getRow0().equals(c0)).toEqual(true);
        expect(m.getRow1().equals(c1)).toEqual(true);
        expect(m.getRow2().equals(c2)).toEqual(true);

        expect(m.equals(new Matrix3(1, 2, 3,
                                    4, 5, 6,
                                    7, 8, 9))).toEqual(true);
    });

    it('getNumberOfElements0', function() {
        expect(Matrix3.getNumberOfElements()).toEqual(9);
    });

    it('equals0', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var m2 = new Matrix3(1, 2, 3,
                             4, 5, 6,
                             7, 8, 9);
        expect(m.equals(m2)).toEqual(true);
    });

    it('equals1', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var m2 = new Matrix3(1, 2, 3,
                             4, 5, 0,
                             7, 8, 9);
        expect(m.equals(m2)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var m2 = new Matrix3(0, 1, 2,
                             3, 4, 5,
                             6, 7, 8);
        expect(m.equalsEpsilon(m2, 1)).toEqual(true);
        expect(m.equalsEpsilon(m2, 0.5)).toEqual(false);
    });

    it('toString', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        expect(m.toString()).toEqual('(1, 2, 3)\n(4, 5, 6)\n(7, 8, 9)');
    });

    it('transpose', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var mT = new Matrix3(1, 4, 7,
                             2, 5, 8,
                             3, 6, 9);

        expect(m.transpose().equals(mT)).toEqual(true);
        expect(m.transpose().transpose().equals(m)).toEqual(true);
    });

    it('multiplyWithVector0', function() {
        var m = new Matrix3(1);
        var v = new Cartesian3(1, 2, 3);
        expect(m.multiplyWithVector(v).equals(v)).toEqual(true);
    });

    it('multiplyWithVector1', function() {
        var m = new Matrix3(2);
        var v = new Cartesian3(1, 2, 3);
        var u = new Cartesian3(2, 4, 6);
        expect(m.multiplyWithVector(v).equals(u)).toEqual(true);
    });

    it('negate', function() {
        var m = new Matrix3(1, 2, 3,
                            4, 5, 6,
                            7, 8, 9);
        var n = new Matrix3(-1, -2, -3,
                            -4, -5, -6,
                            -7, -8, -9);

        expect(m.negate().equals(n)).toEqual(true);
        expect(m.negate().negate().equals(m)).toEqual(true);
    });

    it('multiplyWithMatrix', function() {
        var m = new Matrix3(1, 2, 3,
                            1, 2, 3,
                            1, 2, 3);
        var n = new Matrix3(6, 12, 18,
                            6, 12, 18,
                            6, 12, 18);
        expect(m.multiplyWithMatrix(m).equals(n)).toEqual(true);
    });

    it('rotates around Z', function() {
        var theta = Math.PI / 3;
        var s = Math.sin(theta);
        var c = Math.cos(theta);

        var m = new Matrix3(  c,  -s, 0.0,
                              s,   c, 0.0,
                            0.0, 0.0, 1.0);

        expect(Matrix3.rotationAroundZ(theta).equals(m)).toEqual(true);
    });

    it('rotates around Y', function() {
        var theta = Math.PI / 3;
        var s = Math.sin(theta);
        var c = Math.cos(theta);

        var m = new Matrix3(  c, 0.0,   s,
                            0.0, 1.0, 0.0,
                             -s, 0.0,   c);

        expect(Matrix3.rotationAroundY(theta).equals(m)).toEqual(true);
    });

    it('rotates around X', function() {
        var theta = Math.PI / 3;
        var s = Math.sin(theta);
        var c = Math.cos(theta);

        var m = new Matrix3(1.0, 0.0, 0.0,
                            0.0,   c,  -s,
                            0.0,   s,   c);

        expect(Matrix3.rotationAroundX(theta).equals(m)).toEqual(true);
    });

    it('fromAxisAngle (z)', function() {
        var theta = Math.PI / 3;
        var zAxis = new Cartesian3(0.0, 0.0, 1.0);
        expect(Matrix3.fromAxisAngle(zAxis, theta).equals(Matrix3.rotationAroundZ(theta))).toEqual(true);
    });

    it('fromAxisAngle (y)', function() {
        var theta = Math.PI / 3;
        var yAxis = new Cartesian3(0.0, 1.0, 0.0);
        expect(Matrix3.fromAxisAngle(yAxis, theta).equals(Matrix3.rotationAroundY(theta))).toEqual(true);
    });

    it('fromAxisAngle (x)', function() {
        var theta = Math.PI / 3;
        var xAxis = new Cartesian3(1.0, 0.0, 0.0);
        expect(Matrix3.fromAxisAngle(xAxis, theta).equals(Matrix3.rotationAroundX(theta))).toEqual(true);
    });

    it('throws when creating from a column major array without enough elements', function() {
        var values = [1, 2, 3,
                      4, 5, 6,
                      7, 8];

        expect(function() {
            return Matrix3.fromColumnMajorArray(values);
        }).toThrow();
    });

    it('clone', function() {
        var m = new Matrix3(1.0, 2.0, 3.0,
                            4.0, 5.0, 6.0,
                            7.0, 8.0, 9.0);
        var n = m.clone();
        expect(m.equals(n)).toEqual(true);
    });
});