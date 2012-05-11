/*global defineSuite*/
defineSuite([
         'Core/Matrix2',
         'Core/Cartesian2'
     ], function(
         Matrix2,
         Cartesian2) {
    "use strict";
    /*global it,expect*/

    it("construct0", function() {
        var m = new Matrix2();
        expect(m.getColumn0Row0()).toEqual(0);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(0);
    });

    it("construct1", function() {
        var m = new Matrix2(1);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(0);
        expect(m.getColumn1Row0()).toEqual(0);
        expect(m.getColumn1Row1()).toEqual(1);
    });

    it("construct2", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(3);
        expect(m.getColumn1Row0()).toEqual(2);
        expect(m.getColumn1Row1()).toEqual(4);
    });

    it("creates a non-uniform scale matrix", function() {
        var m = Matrix2.createNonUniformScale(new Cartesian2(1, 2));

        expect(m.getColumn0().equals(new Cartesian2(1, 0))).toBeTruthy();
        expect(m.getColumn1().equals(new Cartesian2(0, 2))).toBeTruthy();
    });

    it("creates a uniform scale matrix", function() {
        var m0 = Matrix2.createScale(2);
        var m1 = Matrix2.createNonUniformScale(new Cartesian2(2, 2));

        expect(m0.equals(m1)).toBeTruthy();
    });

    it("creates scale matrices without arguments", function() {
        expect(Matrix2.createNonUniformScale().equals(new Matrix2())).toBeTruthy();
        expect(Matrix2.createScale().equals(new Matrix2())).toBeTruthy();
    });

    it("creates from a column major array", function() {
        var values = [1, 2, 3, 4];

        var m = Matrix2.fromColumnMajorArray(values);
        expect(m.getColumn0Row0()).toEqual(1);
        expect(m.getColumn0Row1()).toEqual(2);
        expect(m.getColumn1Row0()).toEqual(3);
        expect(m.getColumn1Row1()).toEqual(4);
    });

    it("creates from a column major array 2", function() {
        expect(Matrix2.fromColumnMajorArray().equals(new Matrix2())).toBeTruthy();
    });

    it("getIdentity", function() {
        expect(Matrix2.getIdentity().equals(new Matrix2(1))).toBeTruthy();
    });

    it("getColumnMajorValue0", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        expect(m.getColumnMajorValue(0)).toEqual(1);
        expect(m.getColumnMajorValue(1)).toEqual(3);
        expect(m.getColumnMajorValue(2)).toEqual(2);
        expect(m.getColumnMajorValue(3)).toEqual(4);
    });

    it("getColumnMajorValue1", function() {
        expect(function() {
            new Matrix2().getColumnMajorValue(-1);
        }).toThrow();
    });

    it("getColumnMajorValue2", function() {
        expect(function() {
            new Matrix2().getColumnMajorValue(4);
        }).toThrow();
    });

    it("gets individual columns", function() {
        var m = new Matrix2(1, 2,
                            4, 5);

        expect(m.getColumn0().equals(new Cartesian2(1, 4))).toBeTruthy();
        expect(m.getColumn1().equals(new Cartesian2(2, 5))).toBeTruthy();
    });

    it("gets individual columns 2", function() {
        expect(Matrix2.getIdentity().getColumn0().equals(Cartesian2.getUnitX())).toBeTruthy();
        expect(Matrix2.getIdentity().getColumn1().equals(Cartesian2.getUnitY())).toBeTruthy();
    });

    it("sets individual columns", function() {
        var m = new Matrix2();
        var c0 = new Cartesian2(1, 2);
        var c1 = new Cartesian2(3, 4);

        m.setColumn0(c0);
        m.setColumn1(c1);

        expect(m.getColumn0().equals(c0)).toBeTruthy();
        expect(m.getColumn1().equals(c1)).toBeTruthy();

        expect(m.equals(new Matrix2(1, 3,
                                    2, 4))).toBeTruthy();
    });

    it("gets individual rows", function() {
        var m = new Matrix2(1, 2,
                            3, 4);

        expect(m.getRow0().equals(new Cartesian2(1, 2))).toBeTruthy();
        expect(m.getRow1().equals(new Cartesian2(3, 4))).toBeTruthy();
    });

    it("gets individual rows 2", function() {
        expect(Matrix2.getIdentity().getRow0().equals(Cartesian2.getUnitX())).toBeTruthy();
        expect(Matrix2.getIdentity().getRow1().equals(Cartesian2.getUnitY())).toBeTruthy();
    });

    it("sets individual rows", function() {
        var m = new Matrix2();
        var c0 = new Cartesian2(1, 2);
        var c1 = new Cartesian2(3, 4);

        m.setRow0(c0);
        m.setRow1(c1);

        expect(m.getRow0().equals(c0)).toBeTruthy();
        expect(m.getRow1().equals(c1)).toBeTruthy();

        expect(m.equals(new Matrix2(1, 2,
                                    3, 4))).toBeTruthy();
    });

    it("getNumberOfElements0", function() {
        expect(Matrix2.getNumberOfElements()).toEqual(4);
    });

    it("transpose", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        var mT = new Matrix2(1, 3,
                             2, 4);

        expect(m.transpose().equals(mT)).toBeTruthy();
        expect(m.transpose().transpose().equals(m)).toBeTruthy();
    });

    it("equals0", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        var m2 = new Matrix2(1, 2,
                             3, 4);
        expect(m.equals(m2)).toBeTruthy();
    });

    it("equals1", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        var m2 = new Matrix2(1, 9,
                             3, 4);
        expect(m.equals(m2)).toBeFalsy();
    });

    it("equalsEpsilon", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        var m2 = new Matrix2(2, 3,
                             4, 5);
        expect(m.equalsEpsilon(m2, 1)).toBeTruthy();
        expect(m.equalsEpsilon(m2, 0.5)).toBeFalsy();
    });

    it("toString", function() {
        var m = new Matrix2(1, 2,
                            3, 4);
        expect(m.toString()).toEqual("(1, 2)\n(3, 4)");
    });

    it("throws when creating from a column major array without enough elements", function() {
        var values = [1, 2,
                      3];

        expect(function() {
            return Matrix2.fromColumnMajorArray(values);
        }).toThrow();
    });

    it("clone", function() {
        var m = new Matrix2(1.0, 2.0,
                            3.0, 4.0);
        var n = m.clone();
        expect(m.equals(n)).toBeTruthy();
    });
});