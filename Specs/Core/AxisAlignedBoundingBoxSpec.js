/*global defineSuite*/
defineSuite([
         'Core/AxisAlignedBoundingBox',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Intersect',
         'Core/Math'
     ], function(
         AxisAlignedBoundingBox,
         Cartesian3,
         Cartesian4,
         Intersect,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var positions = [
                     new Cartesian3(3, -1, -3),
                     new Cartesian3(2, -2, -2),
                     new Cartesian3(1, -3, -1),
                     new Cartesian3(0, 0, 0),
                     new Cartesian3(-1, 1, 1),
                     new Cartesian3(-2, 2, 2),
                     new Cartesian3(-3, 3, 3)
                 ];

    it('throws an exception when constructed without a minimum', function() {
        expect(function() {
            return new AxisAlignedBoundingBox();
        }).toThrow();
    });

    it('throws an exception when constructed without a maximum', function() {
        expect(function() {
            return new AxisAlignedBoundingBox(Cartesian3.ZERO);
        }).toThrow();
    });

    it('constructor', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X);
        expect(box.minimum).toEqual(Cartesian3.ZERO);
        expect(box.maximum).toEqual(Cartesian3.UNIT_X);
        expect(box.center).toEqual(new Cartesian3(0.5, 0.0, 0.0));
    });

    it('clone without a result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X);
        var result = box.clone();
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X);
        var result = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_Y);
        var returnedResult = box.clone(result);
        expect(box).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(box).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X);
        var returnedResult = box.clone(box);
        expect(box).toBe(returnedResult);
    });

    it('equals', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X);
        expect(box.equals(box.clone())).toEqual(true);
        expect(box.equals(new AxisAlignedBoundingBox(Cartesian3.UNIT_X, Cartesian3.UNIT_Y))).toEqual(false);
        expect(box.equals(undefined)).toEqual(false);
    });

    it('throws an exception when constructed without any positions', function() {
        expect(function() {
            return AxisAlignedBoundingBox.fromPoints();
        }).toThrow();
    });

    it('throws an exception when constructed without less than one position', function() {
        expect(function() {
            return AxisAlignedBoundingBox.fromPoints([]);
        }).toThrow();
    });

    it('computes the minimum', function() {
        var box = AxisAlignedBoundingBox.fromPoints(positions);
        expect(box.minimum.equals(new Cartesian3(-3, -3, -3))).toEqual(true);
    });

    it('computes the maximum', function() {
        var box = AxisAlignedBoundingBox.fromPoints(positions);
        expect(box.maximum.equals(new Cartesian3(3, 3, 3))).toEqual(true);
    });

    it('computes a center', function() {
        var box = AxisAlignedBoundingBox.fromPoints(positions);
        expect(box.center.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)).toEqual(true);
    });

    it('computes the bounding box for a single position', function() {
        var box = AxisAlignedBoundingBox.fromPoints([{
            x : 1,
            y : 2,
            z : 3
        }]);

        expect(box.minimum.equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(box.maximum.equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(box.center.equals(new Cartesian3(1, 2, 3))).toEqual(true);
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            AxisAlignedBoundingBox.clone();
        }).toThrow();
    });

    it('intersect throws without a box', function() {
        expect(function() {
            AxisAlignedBoundingBox.intersect();
        }).toThrow();
    });

    it('intersect throws without a plane', function() {
        expect(function() {
            AxisAlignedBoundingBox.intersect(new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X));
        }).toThrow();
    });

    it('box on the positive side of a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_X.negate(), Cartesian3.ZERO);
        var normal = Cartesian3.UNIT_X.negate();
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(box.intersect(plane)).toEqual(Intersect.INSIDE);    });

    it('box on the negative side of a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_X.negate(), Cartesian3.ZERO);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(box.intersect(plane)).toEqual(Intersect.OUTSIDE);
    });

    it('box intersecting a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_X.multiplyByScalar(2.0));
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -normal.dot(position));
        expect(box.intersect(plane)).toEqual(Intersect.INTERSECTING);
    });
});