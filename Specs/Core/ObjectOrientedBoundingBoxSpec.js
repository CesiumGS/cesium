/*global defineSuite*/
defineSuite([
         'Core/ObjectOrientedBoundingBox',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Matrix3',
         'Core/Intersect'
     ], function(
         ObjectOrientedBoundingBox,
         Cartesian3,
         Cartesian4,
         Matrix3,
         Intersect) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var positions1 = [
                     new Cartesian3(-2, -1, 0),
                     new Cartesian3(-1, 0, 0),
                     new Cartesian3(0, 1, 0),
                 ];

    it('fromPoints constructs empty box with undefined positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(undefined);
        expect(box.transformMatrix).toEqual(new Matrix3());
        expect(box.transformedPositions).toEqual(Cartesian3.ZERO);
        expect(box.extent).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints constructs empty box with empty positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints([]);
        expect(box.transformMatrix).toEqual(new Matrix3());
        expect(box.transformedPositions).toEqual(Cartesian3.ZERO);
        expect(box.extent).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints computes the correct values', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(positions1);
        var expTransformMatrix = new Matrix3(0,0,0,0,0,0,0,0,0);
        expect(box.transformMatrix).toEqual(expTransformMatrix);
    });
/*
    it('clone without a result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
        var result = box.clone();
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
        var result = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.UNIT_Z);
        var returnedResult = box.clone(result);
        expect(result).toBe(returnedResult);
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_Y, Cartesian3.UNIT_X);
        var returnedResult = box.clone(box);
        expect(box).toBe(returnedResult);
        expect(box.minimum).toEqual(Cartesian3.UNIT_Y);
        expect(box.maximum).toEqual(Cartesian3.UNIT_X);
    });

    it('equals works in all cases', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.UNIT_X, Cartesian3.UNIT_Y, Cartesian3.UNIT_Z);
        var bogie = new Cartesian3(2, 3, 4);
        expect(box.equals(new AxisAlignedBoundingBox(Cartesian3.UNIT_X, Cartesian3.UNIT_Y, Cartesian3.UNIT_Z))).toEqual(true);
        expect(box.equals(new AxisAlignedBoundingBox(bogie, Cartesian3.UNIT_Y, Cartesian3.UNIT_Y))).toEqual(false);
        expect(box.equals(new AxisAlignedBoundingBox(Cartesian3.UNIT_X, bogie, Cartesian3.UNIT_Z))).toEqual(false);
        expect(box.equals(new AxisAlignedBoundingBox(Cartesian3.UNIT_X, Cartesian3.UNIT_Y, bogie))).toEqual(false);
        expect(box.equals(undefined)).toEqual(false);
    });

    it('computes the bounding box for a single position', function() {
        var box = AxisAlignedBoundingBox.fromPoints([positions[0]]);
        expect(box.minimum).toEqual(positions[0]);
        expect(box.maximum).toEqual(positions[0]);
        expect(box.center).toEqual(positions[0]);
    });

    it('intersect works with box on the positive side of a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.negate(Cartesian3.UNIT_X), Cartesian3.ZERO);
        var normal = Cartesian3.negate(Cartesian3.UNIT_X);
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(box.intersect(plane)).toEqual(Intersect.INSIDE);
    });

    it('intersect works with box on the negative side of a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.negate(Cartesian3.UNIT_X), Cartesian3.ZERO);
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(box.intersect(plane)).toEqual(Intersect.OUTSIDE);
    });

    it('intersect works with box intersecting a plane', function() {
        var box = new AxisAlignedBoundingBox(Cartesian3.ZERO, Cartesian3.multiplyByScalar(Cartesian3.UNIT_X, 2.0));
        var normal = Cartesian3.UNIT_X;
        var position = Cartesian3.UNIT_X;
        var plane = new Cartesian4(normal.x, normal.y, normal.z, -Cartesian3.dot(normal, position));
        expect(box.intersect(plane)).toEqual(Intersect.INTERSECTING);
    });

    it('static clone returns undefined with no parameter', function() {
        expect(AxisAlignedBoundingBox.clone()).toBeUndefined();
    });

    it('static intersect throws without a box', function() {
        var plane = new Cartesian4();
        expect(function() {
            AxisAlignedBoundingBox.intersect(undefined, plane);
        }).toThrow();
    });

    it('static intersect throws without a plane', function() {
        var box = new AxisAlignedBoundingBox();
        expect(function() {
            AxisAlignedBoundingBox.intersect(box, undefined);
        }).toThrow();
    });
    */
});
