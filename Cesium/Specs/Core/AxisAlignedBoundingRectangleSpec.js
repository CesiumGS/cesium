(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("AxisAlignedBoundingRectangle", function () {

        var positions = [
            new Cesium.Cartesian2(3, -1),
            new Cesium.Cartesian2(2, -2),
            new Cesium.Cartesian2(1, -3),
            new Cesium.Cartesian2(0, 0),
            new Cesium.Cartesian2(-1, 1),
            new Cesium.Cartesian2(-2, 2),
            new Cesium.Cartesian2(-3, 3)
        ];

        it("computes the minimum", function () {
            var rectangle = new Cesium.AxisAlignedBoundingRectangle(positions);
            expect(rectangle.minimum.equals(new Cesium.Cartesian2(-3, -3))).toBeTruthy();
        });

        it("computes the maximum", function () {
            var rectangle = new Cesium.AxisAlignedBoundingRectangle(positions);
            expect(rectangle.maximum.equals(new Cesium.Cartesian2(3, 3))).toBeTruthy();
        });

        it("computes the center", function () {
            var rectangle = new Cesium.AxisAlignedBoundingRectangle(positions);
            expect(rectangle.center.equalsEpsilon(Cesium.Cartesian2.getZero(),
                Cesium.Math.EPSILON14)).toBeTruthy();
        });

        it("computes the bounding rectangle for a single position", function () {
            var rectangle = new Cesium.AxisAlignedBoundingRectangle([{
                x : 1,
                y : 2
            }]);

            expect(rectangle.minimum.equals(new Cesium.Cartesian2(1, 2))).toBeTruthy();
            expect(rectangle.maximum.equals(new Cesium.Cartesian2(1, 2))).toBeTruthy();
            expect(rectangle.center.equals(new Cesium.Cartesian2(1, 2))).toBeTruthy();
        });

        it("has undefined properties with positions of length zero", function () {
            var rectangle = new Cesium.AxisAlignedBoundingRectangle([]);
            expect(rectangle.minimum).not.toBeDefined();
            expect(rectangle.maximum).not.toBeDefined();
            expect(rectangle.center).not.toBeDefined();
        });

        it("throws an exception when constructed without any positions", function () {
            expect( function () {
                return new Cesium.Cesium.AxisAlignedBoundingRectangle(undefined);
            }).toThrow();
        });
    });
})();