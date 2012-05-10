/*global defineSuite*/
defineSuite([
         'Core/AxisAlignedBoundingRectangle',
         'Core/Cartesian2'
     ], function(
         AxisAlignedBoundingRectangle,
         Cartesian2) {
    "use strict";
    /*global it,expect*/

    var positions = [
                     new Cartesian2(3, -1),
                     new Cartesian2(2, -2),
                     new Cartesian2(1, -3),
                     new Cartesian2(0, 0),
                     new Cartesian2(-1, 1),
                     new Cartesian2(-2, 2),
                     new Cartesian2(-3, 3)
                 ];

    it("computes the minimum", function() {
        var rectangle = new AxisAlignedBoundingRectangle(positions);
        expect(rectangle.minimum.equals(new Cartesian2(-3, -3))).toBeTruthy();
    });

    it("computes the maximum", function() {
        var rectangle = new AxisAlignedBoundingRectangle(positions);
        expect(rectangle.maximum.equals(new Cartesian2(3, 3))).toBeTruthy();
    });

    it("computes the center", function() {
        var rectangle = new AxisAlignedBoundingRectangle(positions);
        expect(rectangle.center.equalsEpsilon(Cartesian2.getZero(), Math.EPSILON14)).toBeTruthy();
    });

    it("computes the bounding rectangle for a single position", function() {
        var rectangle = new AxisAlignedBoundingRectangle([{
            x : 1,
            y : 2
        }]);

        expect(rectangle.minimum.equals(new Cartesian2(1, 2))).toBeTruthy();
        expect(rectangle.maximum.equals(new Cartesian2(1, 2))).toBeTruthy();
        expect(rectangle.center.equals(new Cartesian2(1, 2))).toBeTruthy();
    });

    it("has undefined properties with positions of length zero", function() {
        var rectangle = new AxisAlignedBoundingRectangle([]);
        expect(rectangle.minimum).not.toBeDefined();
        expect(rectangle.maximum).not.toBeDefined();
        expect(rectangle.center).not.toBeDefined();
    });

    it("throws an exception when constructed without any positions", function() {
        expect(function() {
            return new AxisAlignedBoundingRectangle(undefined);
        }).toThrow();
    });
});