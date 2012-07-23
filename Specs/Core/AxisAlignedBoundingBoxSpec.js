/*global defineSuite*/
defineSuite([
         'Core/AxisAlignedBoundingBox',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         AxisAlignedBoundingBox,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect,describe*/

    var positions = [
                     new Cartesian3(3, -1, -3),
                     new Cartesian3(2, -2, -2),
                     new Cartesian3(1, -3, -1),
                     new Cartesian3(0, 0, 0),
                     new Cartesian3(-1, 1, 1),
                     new Cartesian3(-2, 2, 2),
                     new Cartesian3(-3, 3, 3)
                 ];

    it('computes the minimum', function() {
        var box = new AxisAlignedBoundingBox(positions);
        expect(box.minimum.equals(new Cartesian3(-3, -3, -3))).toEqual(true);
    });

    it('computes the maximum', function() {
        var box = new AxisAlignedBoundingBox(positions);
        expect(box.maximum.equals(new Cartesian3(3, 3, 3))).toEqual(true);
    });

    it('computes a center', function() {
        var box = new AxisAlignedBoundingBox(positions);
        expect(box.center.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)).toEqual(true);
    });

    it('computes the bounding box for a single position', function() {
        var box = new AxisAlignedBoundingBox([{
            x : 1,
            y : 2,
            z : 3
        }]);

        expect(box.minimum.equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(box.maximum.equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(box.center.equals(new Cartesian3(1, 2, 3))).toEqual(true);
    });

    it('has undefined properties with positions of length zero', function() {
        var box = new AxisAlignedBoundingBox([]);
        expect(box.minimum).not.toBeDefined();
        expect(box.maximum).not.toBeDefined();
        expect(box.center).not.toBeDefined();
    });

    it('throws an exception when constructed without any positions', function() {
        expect(function() {
            return new AxisAlignedBoundingBox(undefined);
        }).toThrow();
    });
});