(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("ContainmentTests", function () {

        it("pointInsideTriangle2D has point inside", function () {
            expect(Cesium.pointInsideTriangle2D(
                new Cesium.Cartesian2(0.25, 0.25),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeTruthy();
        });

        it("pointInsideTriangle2D has point outside", function () {
            expect(Cesium.pointInsideTriangle2D(
                new Cesium.Cartesian2(1.0, 1.0),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeFalsy();
        });

        it("pointInsideTriangle2D has point outside (2)", function () {
            expect(Cesium.pointInsideTriangle2D(
                new Cesium.Cartesian2(0.5, -0.5),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeFalsy();
        });

        it("pointInsideTriangle2D has point outside (3)", function () {
            expect(Cesium.pointInsideTriangle2D(
                new Cesium.Cartesian2(-0.5, 0.5),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeFalsy();
        });

        it("pointInsideTriangle2D has point on corner", function () {
            expect(Cesium.pointInsideTriangle2D(
                Cesium.Cartesian2.getZero(),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeFalsy();
        });

        it("pointInsideTriangle2D has point inside on edge", function () {
            expect(Cesium.pointInsideTriangle2D(
                new Cesium.Cartesian2(0.5, 0.0),
                Cesium.Cartesian2.getZero(),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0))).toBeFalsy();
        });

        it("pointInsideTriangle2D throws without point", function () {
            expect( function () {
                Cesium.pointInsideTriangle2D();
            }).toThrow();
        });

        it("pointInsideTriangle2D throws without p0", function () {
            expect( function () {
                Cesium.pointInsideTriangle2D(new Cesium.Cartesian2());
            }).toThrow();
        });

        it("pointInsideTriangle2D throws without p1", function () {
            expect( function () {
                Cesium.pointInsideTriangle2D(
                    new Cesium.Cartesian2(),
                    new Cesium.Cartesian2());
            }).toThrow();
        });

        it("pointInsideTriangle2D throws without p2", function () {
            expect( function () {
                Cesium.pointInsideTriangle2D(
                    new Cesium.Cartesian2(),
                    new Cesium.Cartesian2(),
                    new Cesium.Cartesian2());
            }).toThrow();
        });

    });
})();