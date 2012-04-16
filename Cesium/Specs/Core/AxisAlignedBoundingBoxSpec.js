(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("AxisAlignedBoundingBox", function () {

		var positions = [
			new Cesium.Cartesian3(3, -1, -3),
			new Cesium.Cartesian3(2, -2, -2),
			new Cesium.Cartesian3(1, -3, -1),
			new Cesium.Cartesian3(0, 0, 0),
			new Cesium.Cartesian3(-1, 1, 1),
			new Cesium.Cartesian3(-2, 2, 2),
			new Cesium.Cartesian3(-3, 3, 3)
		];

		it("computes the minimum", function () {
			var box = new Cesium.AxisAlignedBoundingBox(positions);
			expect(box.minimum.equals(new Cesium.Cartesian3(-3, -3, -3))).toBeTruthy();
		});

		it("computes the maximum", function () {
			var box = new Cesium.AxisAlignedBoundingBox(positions);
			expect(box.maximum.equals(new Cesium.Cartesian3(3, 3, 3))).toBeTruthy();
		});

		it("computes a center", function () {
			var box = new Cesium.AxisAlignedBoundingBox(positions);
			expect(box.center.equalsEpsilon(Cesium.Cartesian3.getZero(),
				Cesium.Math.EPSILON14)).toBeTruthy();
		});

        it("computes the bounding box for a single position", function () {
            var box = new Cesium.AxisAlignedBoundingBox([{
                x : 1,
                y : 2,
                z : 3
            }]);

            expect(box.minimum.equals(new Cesium.Cartesian3(1, 2, 3))).toBeTruthy();
            expect(box.maximum.equals(new Cesium.Cartesian3(1, 2, 3))).toBeTruthy();
            expect(box.center.equals(new Cesium.Cartesian3(1, 2, 3))).toBeTruthy();
        });

        it("has undefined properties with positions of length zero", function () {
            var box = new Cesium.AxisAlignedBoundingBox([]);
            expect(box.minimum).not.toBeDefined();
            expect(box.maximum).not.toBeDefined();
            expect(box.center).not.toBeDefined();
        });

        it("throws an exception when constructed without any positions", function () {
            expect( function () {
                return new Cesium.AxisAlignedBoundingBox(undefined);
            }).toThrow();
        });
    });
})();