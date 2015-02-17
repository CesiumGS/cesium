/*global defineSuite*/
defineSuite([
        'Core/ObjectOrientedBoundingBox',
        'Core/BoundingRectangle',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Matrix3',
        'Core/Quaternion'
    ], function(
        ObjectOrientedBoundingBox,
        BoundingRectangle,
        Cartesian3,
        CesiumMath,
        Matrix3,
        Quaternion) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var positions = [
        new Cartesian3(2.0, 0.0, 0.0),
        new Cartesian3(0.0, 3.0, 0.0),
        new Cartesian3(0.0, 0.0, 4.0),
        new Cartesian3(-2.0, 0.0, 0.0),
        new Cartesian3(0.0, -3.0, 0.0),
        new Cartesian3(0.0, 0.0, -4.0)
    ];

    var positions2 = [
        new Cartesian3(4.0, 0.0, 0.0),
        new Cartesian3(0.0, 3.0, 0.0),
        new Cartesian3(0.0, 0.0, 2.0),
        new Cartesian3(-4.0, 0.0, 0.0),
        new Cartesian3(0.0, -3.0, 0.0),
        new Cartesian3(0.0, 0.0, -2.0)
    ];

    function rotatePositions(positions, axis, angle) {
        var points = [];

        var quaternion = Quaternion.fromAxisAngle(axis, angle);
        var rotation = Matrix3.fromQuaternion(quaternion);

        for (var i = 0; i < positions.length; ++i) {
            points.push(Matrix3.multiplyByVector(rotation, positions[i], new Cartesian3()));
        }

        return {
            points : points,
            rotation : rotation
        };
    }

    function translatePositions(positions, translation) {
        var points = [];
        for (var i = 0; i < positions.length; ++i) {
            points.push(Cartesian3.add(translation, positions[i], new Cartesian3()));
        }

        return points;
    }

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
        var translation = new Cartesian3(10.0, -20.0, 30.0);
        var points = translatePositions(positions, translation);
        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.scale).toEqual(new Cartesian3(2.0, 3.0, 4.0));
        expect(box.translation).toEqual(translation);
    });

    it('fromPoints rotation about z', function() {
        var result = rotatePositions(positions, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var points = result.points;
        var rotation = result.rotation;

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqualEpsilon(new Cartesian3(3.0, 2.0, 4.0), CesiumMath.EPSILON15);
        expect(box.translation).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
    });

    it('fromPoints rotation about y', function() {
        var result = rotatePositions(positions, Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR);
        var points = result.points;
        var rotation = result.rotation;

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqualEpsilon(new Cartesian3(4.0, 3.0, 2.0), CesiumMath.EPSILON15);
        expect(box.translation).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
    });

    it('fromPoints rotation about x', function() {
        var result = rotatePositions(positions, Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var points = result.points;
        var rotation = result.rotation;

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqualEpsilon(new Cartesian3(2.0, 4.0, 3.0), CesiumMath.EPSILON15);
        expect(box.translation).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON15);
    });

    it('fromPoints rotation and translation', function() {
        var result = rotatePositions(positions, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var points = result.points;
        var rotation = result.rotation;

        var translation = new Cartesian3(-40.0, 20.0, -30.0);
        points = translatePositions(points, translation);

        var box = ObjectOrientedBoundingBox.fromPoints(points);
        expect(box.rotation).toEqualEpsilon(rotation, CesiumMath.EPSILON15);
        expect(box.scale).toEqualEpsilon(new Cartesian3(3.0, 2.0, 4.0), CesiumMath.EPSILON14);
        expect(box.translation).toEqualEpsilon(translation, CesiumMath.EPSILON15);
    });

    it('fromBoundingRectangle throws without rectangle', function() {
        expect(function() {
            ObjectOrientedBoundingBox.fromBoundingRectangle();
        }).toThrowDeveloperError();
    });

    it('fromBoundingRectangle sets the transformation matrix to identity without rotation', function() {
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(new BoundingRectangle());
        expect(box.rotation).toEqual(Matrix3.IDENTITY);
        expect(box.translation).toEqual(Cartesian3.ZERO);
        expect(box.scale).toEqual(Cartesian3.ZERO);
    });

    it('fromBoundingRectangle creates an ObjectOrientedBoundingBox without a result parameter', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        var angle = CesiumMath.PI_OVER_TWO;
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(rect, angle);
        expect(box.rotation).toEqual(Matrix3.fromRotationZ(angle));
        expect(box.scale).toEqual(new Cartesian3(1.5, 2.0, 0.0));
        expect(box.translation).toEqual(new Cartesian3(-1.0, 3.5, 0.0));
    });

    it('fromBoundingRectangle creates an ObjectOrientedBoundingBox with a result parameter', function() {
        var rect = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
        var angle = CesiumMath.PI_OVER_TWO;
        var result = new ObjectOrientedBoundingBox();
        var box = ObjectOrientedBoundingBox.fromBoundingRectangle(rect, angle, result);
        expect(box).toBe(result);
        expect(box.rotation).toEqual(Matrix3.fromRotationZ(angle));
        expect(box.scale).toEqual(new Cartesian3(1.5, 2.0, 0.0));
        expect(box.translation).toEqual(new Cartesian3(-1.0, 3.5, 0.0));
    });

    it('intersect throws without left box', function() {
        expect(function() {
            ObjectOrientedBoundingBox.intersect();
        }).toThrowDeveloperError();
    });

    it('intersect throws without right box', function() {
        expect(function() {
            ObjectOrientedBoundingBox.intersect(new ObjectOrientedBoundingBox());
        }).toThrowDeveloperError();
    });

    it('does not intersect (1)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var box2 = ObjectOrientedBoundingBox.fromPoints(translatePositions(positions, new Cartesian3(100.0, 0.0, 0.0)));
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (2)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var box2 = ObjectOrientedBoundingBox.fromPoints(translatePositions(positions, new Cartesian3(0.0, 100.0, 0.0)));
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (3)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var box2 = ObjectOrientedBoundingBox.fromPoints(translatePositions(positions, new Cartesian3(0.0, 0.0, 100.0)));
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (4)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR).points;
        var translation = Cartesian3.multiplyByScalar(new Cartesian3(2.0, 3.0, 0.0), 2.1, new Cartesian3());
        points = translatePositions(points, translation);
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (5)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR).points;
        var translation = Cartesian3.multiplyByScalar(new Cartesian3(0.0, 3.0, 4.0), 2.1, new Cartesian3());
        points = translatePositions(points, translation);
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (6)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Y, -CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(4.0, -6.0, 8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (7)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, -8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (8)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Y, -CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, 8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (9)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, 8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (10)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, -8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (11)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, 8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('does not intersect (12)', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var points = rotatePositions(positions, Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR).points;
        points = rotatePositions(points, Cartesian3.UNIT_Z, -CesiumMath.PI_OVER_FOUR).points;
        points = translatePositions(points, new Cartesian3(-4.0, 6.0, -8.0));
        var box2 = ObjectOrientedBoundingBox.fromPoints(points);
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(false);
    });

    it('intersects', function() {
        var box1 = ObjectOrientedBoundingBox.fromPoints(positions);
        var box2 = ObjectOrientedBoundingBox.fromPoints(translatePositions(positions, new Cartesian3(1.0, 1.0, 1.0)));
        expect(ObjectOrientedBoundingBox.intersect(box1, box2)).toEqual(true);
    });

    it('clone without a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = ObjectOrientedBoundingBox.clone(box);
        expect(box).not.toBe(result);
        expect(box).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var box = new ObjectOrientedBoundingBox();
        var result = new ObjectOrientedBoundingBox();
        var returnedResult = ObjectOrientedBoundingBox.clone(box, result);
        expect(result).toBe(returnedResult);
        expect(box).not.toBe(result);
        expect(box).toEqual(result);
    });

    it('equals works in all cases', function() {
        var box = new ObjectOrientedBoundingBox();
        expect(box.equals(new ObjectOrientedBoundingBox())).toEqual(true);
        expect(box.equals(undefined)).toEqual(false);
    });
});
