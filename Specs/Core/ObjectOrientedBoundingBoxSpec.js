/*global defineSuite*/
defineSuite([
         'Core/ObjectOrientedBoundingBox',
         'Core/Cartesian3',
         'Core/Cartesian4',
         'Core/Math',
         'Core/Matrix3',
         'Core/Intersect',
         'Core/BoundingRectangle'
     ], function(
         ObjectOrientedBoundingBox,
         Cartesian3,
         Cartesian4,
         CesiumMath,
         Matrix3,
         Intersect,
         BoundingRectangle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var positions = [
        new Cartesian3(2.0, 0.0, 0.0),
        new Cartesian3(0.0, 3.0, 0.0),
        new Cartesian3(0.0, 0.0, 4.0),
        new Cartesian3(-2.0, 0.0, 0.0),
        new Cartesian3(0.0, -3.0, 0.0),
        new Cartesian3(0.0, 0.0, -4.0)
    ];

    it('constructor sets expected default values', function() {
        var box = new ObjectOrientedBoundingBox();
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.translation).toEqual(Cartesian3.ZERO);
        expect(box.scale).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints constructs empty box with undefined positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(undefined);
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.translation).toEqual(Cartesian3.ZERO);
        expect(box.scale).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints constructs empty box with empty positions', function() {
        var box = ObjectOrientedBoundingBox.fromPoints([]);
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.translation).toEqual(Cartesian3.ZERO);
        expect(box.scale).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints correct scale', function() {
        var box = ObjectOrientedBoundingBox.fromPoints(positions);
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.scale).toEqual(new Cartesian3(2.0, 3.0, 4.0));
        expect(box.translation).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints correct translation', function() {
        var points = [];
        var translation = new Cartesian3(10.0, -20.0, 30.0);
        for (var i = 0; i < positions.length; ++i) {
            points.push(Cartesian3.add(positions[i], translation));
        }

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.scale).toEqual(new Cartesian3(2.0, 3.0, 4.0));
        expect(box.translation).toEqual(translation);
    });

    it('fromPoints rotation about z', function() {
        var points = [];
        var rotation = Matrix3.fromRotationZ(CesiumMath.PI_OVER_FOUR);
        for (var i = 0; i < positions.length; ++i) {
            points.push(Matrix3.multiplyByVector(rotation, positions[i]));
        }

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqual(new Cartesian3(3.0, 2.0, 4.0));
        expect(box.translation).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints rotation about y', function() {
        var points = [];
        var rotation = Matrix3.fromRotationY(CesiumMath.PI_OVER_FOUR);
        for (var i = 0; i < positions.length; ++i) {
            points.push(Matrix3.multiplyByVector(rotation, positions[i]));
        }

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqual(new Cartesian3(2.0, 3.0, 4.0));
        expect(box.translation).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints rotation about x', function() {
        var points = [];
        var rotation = Matrix3.fromRotationX(CesiumMath.PI_OVER_FOUR);
        for (var i = 0; i < positions.length; ++i) {
            points.push(Matrix3.multiplyByVector(rotation, positions[i]));
        }

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqual(new Cartesian3(2.0, 4.0, 3.0));
        expect(box.translation).toEqual(Cartesian3.ZERO);
    });

    it('fromPoints rotation, translation, and scale', function() {
        var points = [];
        var rotation = Matrix3.fromRotationX(CesiumMath.PI_OVER_FOUR);
        var translation = new Cartesian3(-40.0, 20.0, -30.0);
        var scale = 100.0;
        for (var i = 0; i < positions.length; ++i) {
            var point = Matrix3.multiplyByVector(rotation, positions[i]);
            Cartesian3.multiplyByScalar(point, scale, point);
            Cartesian3.add(point, translation, point);
            points.push(point);
        }

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.translation).toEqual(translation);
        expect(box.scale).toEqualEpsilon(Cartesian3.multiplyByScalar(new Cartesian3(2.0, 4.0, 3.0), scale), CesiumMath.EPSILON13);
    });

    it('fromBoundingRectangle throws without values', function() {
        var boundingRectangle = new BoundingRectangle();
        expect(function() {
            ObjectOrientedBoundingBox.fromBoundingRectangle();
        }).toThrow();
    });

    it('fromBoundingRectangle sets the transformation matrix to identity without rotation', function() {
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(new BoundingRectangle());
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
    });

    it('fromBoundingRectangle creates an ObjectOrientedBoundingBox without a result parameter', function() {
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(new BoundingRectangle(), 0.0);
        var result = new ObjectOrientedBoundingBox();
        expect(result).toEqual(box);
    });


    it('intersect throws without left box', function() {
        expect(function() {
            ObjectOrientedBoundingBox.intersect();
        }).toThrow();
    });

    it('intersect throws without right box', function() {
        expect(function() {
            ObjectOrientedBoundingBox.intersect(new ObjectOrientedBoundingBox());
        }).toThrow();
    });

    it('clone without a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = ObjectOrientedBoundingBox.clone(box);
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = new ObjectOrientedBoundingBox();
        var returnedResult = ObjectOrientedBoundingBox.clone(box, result);
        expect(result).toBe(returnedResult);
        expect(box).toNotBe(result);
        expect(box).toEqual(result);
    });

    it('equals works in all cases', function() {
        var box = new ObjectOrientedBoundingBox();
        expect(box.equals(new ObjectOrientedBoundingBox())).toEqual(true);
        expect(box.equals(undefined)).toEqual(false);
    });
});
