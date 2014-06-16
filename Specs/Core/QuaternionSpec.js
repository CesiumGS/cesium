/*global defineSuite*/
defineSuite([
        'Core/Quaternion',
        'Core/Cartesian3',
        'Core/Math',
        'Core/Matrix3',
        'Specs/createPackableSpecs'
    ], function(
        Quaternion,
        Cartesian3,
        CesiumMath,
        Matrix3,
        createPackableSpecs) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('construct with default values', function() {
        var quaternion = new Quaternion();
        expect(quaternion.x).toEqual(0.0);
        expect(quaternion.y).toEqual(0.0);
        expect(quaternion.z).toEqual(0.0);
        expect(quaternion.w).toEqual(0.0);
    });

    it('construct with all values', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        expect(quaternion.x).toEqual(1.0);
        expect(quaternion.y).toEqual(2.0);
        expect(quaternion.z).toEqual(3.0);
        expect(quaternion.w).toEqual(4.0);
    });

    it('fromAxisAngle works without a result parameter', function() {
        var axis = new Cartesian3(0.0, 0.0, 1.0);
        var angle = CesiumMath.PI_OVER_TWO;
        var s = Math.sin(angle / 2.0);
        var c = Math.cos(angle / 2.0);
        var a = Cartesian3.multiplyByScalar(axis, s, new Cartesian3());
        var expected = new Quaternion(a.x, a.y, a.z, c);
        var returnedResult = Quaternion.fromAxisAngle(axis, angle);
        expect(returnedResult).toEqual(expected);
    });

    it('fromAxisAngle works with a result parameter', function() {
        var axis = new Cartesian3(0.0, 0.0, 1.0);
        var angle = CesiumMath.PI_OVER_TWO;
        var s = Math.sin(angle / 2.0);
        var c = Math.cos(angle / 2.0);
        var a = Cartesian3.multiplyByScalar(axis, s, new Cartesian3());
        var result = new Quaternion();
        var expected = new Quaternion(a.x, a.y, a.z, c);
        var returnedResult = Quaternion.fromAxisAngle(axis, angle, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expected);
    });

    it('fromRotationMatrix works when m22 is max', function() {
        var q = Quaternion.fromAxisAngle(Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), Math.PI);
        var rotation = new Matrix3(-1.0,  0.0, 0.0,
                                    0.0, -1.0, 0.0,
                                    0.0,  0.0, 1.0);
        expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(q, CesiumMath.EPSILON15);
    });

    it('fromRotationMatrix works when m11 is max', function() {
        var q = Quaternion.fromAxisAngle(Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()), Math.PI);
        var rotation = new Matrix3(-1.0, 0.0,  0.0,
                                    0.0, 1.0,  0.0,
                                    0.0, 0.0, -1.0);
        expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(q, CesiumMath.EPSILON15);
    });

    it('fromRotationMatrix works when m00 is max', function() {
        var q = Quaternion.fromAxisAngle(Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()), Math.PI);
        var rotation = new Matrix3(1.0,  0.0,  0.0,
                                   0.0, -1.0,  0.0,
                                   0.0,  0.0, -1.0);
        expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(q, CesiumMath.EPSILON15);
    });

    it('fromRotationMatrix works when trace is greater than zero', function() {
        var rotation = new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
        var q = new Quaternion(0.0, 0.0, 0.0, 1.0);
        expect(Quaternion.fromRotationMatrix(rotation)).toEqualEpsilon(q, CesiumMath.EPSILON15);
    });

    it('fromRotationMatrix works with result parameter', function() {
        var rotation = new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
        var q = new Quaternion(0.0, 0.0, 0.0, 1.0);
        var result = new Quaternion();
        var returnedResult = Quaternion.fromRotationMatrix(rotation, result);
        expect(returnedResult).toEqualEpsilon(q, CesiumMath.EPSILON15);
        expect(returnedResult).toBe(result);
    });

    it('fromRotationMatrix using a view matrix', function() {
        var direction = new Cartesian3(-0.2349326833984488, 0.8513513009480378, 0.46904967396353314);
        var up = new Cartesian3(0.12477198625717335, -0.4521499177166376, 0.8831717858696695);
        var right = new Cartesian3(0.9639702203483635, 0.26601017702986895, 6.456422901079747e-10);
        var matrix = new Matrix3( right.x,      right.y,      right.z,
                                  up.x,         up.y,         up.z,
                                 -direction.x, -direction.y, -direction.z);
        var quaternion = Quaternion.fromRotationMatrix(matrix);
        expect(Matrix3.fromQuaternion(quaternion)).toEqualEpsilon(matrix, CesiumMath.EPSILON12);
    });

    it('clone without a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var result = quaternion.clone();
        expect(quaternion).toNotBe(result);
        expect(quaternion).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var result = new Quaternion();
        var returnedResult = quaternion.clone(result);
        expect(quaternion).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(quaternion).toEqual(result);
    });

    it('clone works with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var returnedResult = quaternion.clone(quaternion);
        expect(quaternion).toBe(returnedResult);
    });

    it('conjugate works without a result parameter', function() {
        var expected = new Quaternion(-1.0, -2.0, -3.0, 4.0);
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var returnedResult = Quaternion.conjugate(quaternion);
        expect(returnedResult).toEqual(expected);
    });

    it('conjugate works with a result parameter', function() {
        var expected = new Quaternion(-1.0, -2.0, -3.0, 4.0);
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var result = new Quaternion();
        var returnedResult = Quaternion.conjugate(quaternion, result);
        expect(result).toBe(returnedResult);
        expect(returnedResult).toEqual(expected);
    });

    it('conjugate works with a result parameter that is an input parameter', function() {
        var expected = new Quaternion(-1.0, -2.0, -3.0, 4.0);
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var returnedResult = Quaternion.conjugate(quaternion, quaternion);
        expect(quaternion).toBe(returnedResult);
        expect(quaternion).toEqual(expected);
    });

    it('magnitudeSquared computes correct result', function() {
        var expected = 2 * 2 + 3 * 3 + 4 * 4 + 5 * 5;
        var quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var result = Quaternion.magnitudeSquared(quaternion);
        expect(result).toEqual(expected);
    });

    it('norm computes correct result', function() {
        var expected = Math.sqrt(2 * 2 + 3 * 3 + 4 * 4 + 5 * 5);
        var quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var result = Quaternion.magnitude(quaternion);
        expect(result).toEqual(expected);
    });

    it('normalize works without a result parameter', function() {
        var quaternion = new Quaternion(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Quaternion(1.0, 0.0, 0.0, 0.0);
        var result = Quaternion.normalize(quaternion);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter', function() {
        var quaternion = new Quaternion(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Quaternion(1.0, 0.0, 0.0, 0.0);
        var result = new Quaternion();
        var returnedResult = Quaternion.normalize(quaternion, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Quaternion(1.0, 0.0, 0.0, 0.0);
        var returnedResult = Quaternion.normalize(quaternion, quaternion);
        expect(quaternion).toBe(returnedResult);
        expect(quaternion).toEqual(expectedResult);
    });

    it('inverse works without a result parameter', function() {
        var quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
        var expected = new Quaternion(-2.0 / magnitudeSquared, -3.0 / magnitudeSquared, -4.0 / magnitudeSquared, 5.0 / magnitudeSquared);
        var returnedResult = Quaternion.inverse(quaternion);
        expect(returnedResult).toEqual(expected);
    });

    it('inverse works with a result parameter', function() {
        var quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
        var expected = new Quaternion(-2.0 / magnitudeSquared, -3.0 / magnitudeSquared, -4.0 / magnitudeSquared, 5.0 / magnitudeSquared);
        var result = new Quaternion();
        var returnedResult = Quaternion.inverse(quaternion, result);
        expect(returnedResult).toEqual(expected);
        expect(returnedResult).toBe(result);
    });

    it('inverse works with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(2.0, 3.0, 4.0, 5.0);
        var magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
        var expected = new Quaternion(-2.0 / magnitudeSquared, -3.0 / magnitudeSquared, -4.0 / magnitudeSquared, 5.0 / magnitudeSquared);
        var returnedResult = Quaternion.inverse(quaternion, quaternion);
        expect(returnedResult).toEqual(expected);
        expect(returnedResult).toBe(quaternion);
    });

    it('dot', function() {
        var left = new Quaternion(2.0, 3.0, 6.0, 8.0);
        var right = new Quaternion(4.0, 5.0, 7.0, 9.0);
        var expectedResult = 137.0;
        var result = Quaternion.dot(left, right);
        expect(result).toEqual(expectedResult);
    });

    it('multiply works without a result parameter', function() {
        var left = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var right = new Quaternion(8.0, 7.0, 6.0, 5.0);

        var expected = new Quaternion(28.0, 56.0, 30.0, -20.0);
        var returnedResult = Quaternion.multiply(left, right);
        expect(returnedResult).toEqual(expected);

        expected = new Quaternion(46.0, 20.0, 48.0, -20.0);
        returnedResult = Quaternion.multiply(right, left);
        expect(returnedResult).toEqual(expected);
    });

    it('multiply works with a result parameter', function() {
        var left = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var right = new Quaternion(8.0, 7.0, 6.0, 5.0);

        var expected = new Quaternion(28.0, 56.0, 30.0, -20.0);
        var result = new Quaternion();
        var returnedResult = Quaternion.multiply(left, right, result);
        expect(returnedResult).toEqual(expected);
        expect(result).toBe(returnedResult);
    });

    it('multiply works with a result parameter that is an input parameter', function() {
        var left = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var right = new Quaternion(8.0, 7.0, 6.0, 5.0);

        var expected = new Quaternion(28.0, 56.0, 30.0, -20.0);
        var returnedResult = Quaternion.multiply(left, right, left);
        expect(returnedResult).toEqual(expected);
        expect(left).toBe(returnedResult);
    });

    it('add works without a result parameter', function() {
        var left = new Quaternion(2.0, 3.0, 6.0, 8.0);
        var right = new Quaternion(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Quaternion(6.0, 8.0, 13.0, 17.0);
        var result = Quaternion.add(left, right);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter', function() {
        var left = new Quaternion(2.0, 3.0, 6.0, 8.0);
        var right = new Quaternion(4.0, 5.0, 7.0, 9.0);
        var result = new Quaternion();
        var expectedResult = new Quaternion(6.0, 8.0, 13.0,  17.0);
        var returnedResult = Quaternion.add(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter that is an input parameter', function() {
        var left = new Quaternion(2.0, 3.0, 6.0, 8.0);
        var right = new Quaternion(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Quaternion(6.0, 8.0, 13.0, 17.0);
        var returnedResult = Quaternion.add(left, right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('subtract works without a result parameter', function() {
        var left = new Quaternion(2.0, 3.0, 4.0, 8.0);
        var right = new Quaternion(1.0, 5.0, 7.0, 9.0);
        var expectedResult = new Quaternion(1.0, -2.0, -3.0, -1.0);
        var result = Quaternion.subtract(left, right);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with a result parameter', function() {
        var left = new Quaternion(2.0, 3.0, 4.0, 8.0);
        var right = new Quaternion(1.0, 5.0, 7.0, 9.0);
        var result = new Quaternion();
        var expectedResult = new Quaternion(1.0, -2.0, -3.0, -1.0);
        var returnedResult = Quaternion.subtract(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Quaternion(2.0, 3.0, 4.0, 8.0);
        var right = new Quaternion(1.0, 5.0, 7.0, 9.0);
        var expectedResult = new Quaternion(1.0, -2.0, -3.0, -1.0);
        var returnedResult = Quaternion.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });
    it('multiplyByScalar without a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Quaternion(2.0, 4.0, 6.0, 8.0);
        var result = Quaternion.multiplyByScalar(quaternion, scalar);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var result = new Quaternion();
        var scalar = 2;
        var expectedResult = new Quaternion(2.0, 4.0, 6.0, 8.0);
        var returnedResult = Quaternion.multiplyByScalar(quaternion, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Quaternion(2.0, 4.0, 6.0, 8.0);
        var returnedResult = Quaternion.multiplyByScalar(quaternion, scalar, quaternion);
        expect(quaternion).toBe(returnedResult);
        expect(quaternion).toEqual(expectedResult);
    });

    it('divideByScalar without a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Quaternion(0.5, 1.0, 1.5, 2.0);
        var result = Quaternion.divideByScalar(quaternion, scalar);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var result = new Quaternion();
        var scalar = 2;
        var expectedResult = new Quaternion(0.5, 1.0, 1.5, 2.0);
        var returnedResult = Quaternion.divideByScalar(quaternion, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Quaternion(0.5, 1.0, 1.5, 2.0);
        var returnedResult = Quaternion.divideByScalar(quaternion, scalar, quaternion);
        expect(quaternion).toBe(returnedResult);
        expect(quaternion).toEqual(expectedResult);
    });

    it('getAxis works without a result parameter', function() {
        // 60 degrees is used here to ensure that the sine and cosine of the half angle are not equal.
        var angle = Math.PI / 3.0;
        var cos = Math.cos(angle / 2.0);
        var sin = Math.sin(angle / 2.0);
        var expected = Cartesian3.normalize(new Cartesian3(2.0, 3.0, 6.0), new Cartesian3());
        var quaternion = new Quaternion(sin * expected.x, sin * expected.y, sin * expected.z, cos);
        var returnedResult = Quaternion.getAxis(quaternion);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('getAxis works with a result parameter', function() {
        // 60 degrees is used here to ensure that the sine and cosine of the half angle are not equal.
        var angle = Math.PI / 3.0;
        var cos = Math.cos(angle / 2.0);
        var sin = Math.sin(angle / 2.0);
        var expected = Cartesian3.normalize(new Cartesian3(2.0, 3.0, 6.0), new Cartesian3());
        var quaternion = new Quaternion(sin * expected.x, sin * expected.y, sin * expected.z, cos);
        var result = new Cartesian3();
        var returnedResult = Quaternion.getAxis(quaternion, result);
        expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON15);
        expect(result).toBe(returnedResult);
    });

    it('getAxis returns Cartesian3 0 when w equals 1.0 without a result parameter', function() {
        var expected = new Cartesian3(0.0, 0.0, 0.0);
        var quaternion = new Quaternion(4.0, 2.0, 3.0, 1.0);
        var returnedResult = Quaternion.getAxis(quaternion);
        expect(returnedResult).toEqual(expected);
    });

    it('getAxis returns Cartesian3 0 when w equals 1.0 with a result parameter', function() {
        var expected = new Cartesian3(0.0, 0.0, 0.0);
        var quaternion = new Quaternion(4.0, 2.0, 3.0, 1.0);
        var result = new Cartesian3(1, 2, 3);
        var returnedResult = Quaternion.getAxis(quaternion, result);
        expect(returnedResult).toEqual(expected);
        expect(result).toBe(returnedResult);
    });

    it('getAngle works', function() {
        // 60 degrees is used here to ensure that the sine and cosine of the half angle are not equal.
        var angle = Math.PI / 3.0;
        var cos = Math.cos(angle / 2.0);
        var sin = Math.sin(angle / 2.0);
        var axis = Cartesian3.normalize(new Cartesian3(2.0, 3.0, 6.0), new Cartesian3());
        var quaternion = new Quaternion(sin * axis.x, sin * axis.y, sin * axis.z, cos);
        var result = Quaternion.getAngle(quaternion);
        expect(result).toEqualEpsilon(angle, CesiumMath.EPSILON15);
    });

    it('negate without a result parameter', function() {
        var quaternion = new Quaternion(1.0, -2.0, -5.0, 4.0);
        var expectedResult = new Quaternion(-1.0, 2.0, 5.0, -4.0);
        var result = Quaternion.negate(quaternion);
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter', function() {
        var quaternion = new Quaternion(1.0, -2.0, -5.0, 4.0);
        var result = new Quaternion();
        var expectedResult = new Quaternion(-1.0, 2.0, 5.0, -4.0);
        var returnedResult = Quaternion.negate(quaternion, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter that is an input parameter', function() {
        var quaternion = new Quaternion(1.0, -2.0, -5.0);
        var expectedResult = new Quaternion(-1.0, 2.0, 5.0);
        var returnedResult = Quaternion.negate(quaternion, quaternion);
        expect(quaternion).toBe(returnedResult);
        expect(quaternion).toEqual(expectedResult);
    });

    it('lerp works without a result parameter', function() {
        var start = new Quaternion(4.0, 8.0, 10.0, 20.0);
        var end = new Quaternion(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var expectedResult = new Quaternion(5.0, 11.0, 12.5, 22.5);
        var result = Quaternion.lerp(start, end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter', function() {
        var start = new Quaternion(4.0, 8.0, 10.0, 20.0);
        var end = new Quaternion(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var result = new Quaternion();
        var expectedResult = new Quaternion(5.0, 11.0, 12.5, 22.5);
        var returnedResult = Quaternion.lerp(start, end, t, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter that is an input parameter', function() {
        var start = new Quaternion(4.0, 8.0, 10.0, 20.0);
        var end = new Quaternion(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var expectedResult = new Quaternion(5.0, 11.0, 12.5, 22.5);
        var returnedResult = Quaternion.lerp(start, end, t, start);
        expect(start).toBe(returnedResult);
        expect(start).toEqual(expectedResult);
    });

    it('lerp extrapolate forward', function() {
        var start = new Quaternion(4.0, 8.0, 10.0, 20.0);
        var end = new Quaternion(8.0, 20.0, 20.0, 30.0);
        var t = 2.0;
        var expectedResult = new Quaternion(12.0, 32.0, 30.0, 40.0);
        var result = Quaternion.lerp(start, end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp extrapolate backward', function() {
        var start = new Quaternion(4.0, 8.0, 10.0, 20.0);
        var end = new Quaternion(8.0, 20.0, 20.0, 30.0);
        var t = -1.0;
        var expectedResult = new Quaternion(0.0, -4.0, 0.0, 10.0);
        var result = Quaternion.lerp(start, end, t);
        expect(result).toEqual(expectedResult);
    });

    it('slerp works without a result parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        expect(Quaternion.slerp(start, end, 0.0)).toEqual(start);
        expect(Quaternion.slerp(start, end, 1.0)).toEqual(end);
        expect(Quaternion.slerp(start, end, 0.5)).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('slerp works with a result parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        var result = new Quaternion();
        var returnedResult = Quaternion.slerp(start, end, 0.5, result);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON15);
        expect(result).toBe(returnedResult);
    });

    it('slerp works with a result parameter that is an input parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        var returnedResult = Quaternion.slerp(start, end, 0.5, start);
        expect(start).toEqualEpsilon(expected, CesiumMath.EPSILON15);
        expect(start).toBe(returnedResult);
    });

    it('slerp works with obtuse angles', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, -1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, -Math.sin(Math.PI / 8.0), -Math.cos(Math.PI / 8.0));
        expect(Quaternion.slerp(start, end, 0.5)).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('slerp uses lerp when dot product is close to 1', function() {
        var start = new Quaternion(0.0, 0.0, 0.0, 1.0);
        var end = new Quaternion(1.0, 2.0, 3.0, 1.0);
        var expected = new Quaternion(0.5, 1.0, 1.5, 1.0);
        expect(Quaternion.slerp(start, end, 0.0)).toEqual(start);
        expect(Quaternion.slerp(start, end, 1.0)).toEqual(end);
        expect(Quaternion.slerp(start, end, 0.5)).toEqual(expected);
    });

    it('slerp uses lerp when dot product is close to 1 and a result parameter', function() {
        var start = new Quaternion(0.0, 0.0, 0.0, 1.0);
        var end = new Quaternion(1.0, 2.0, 3.0, 1.0);
        var expected = new Quaternion(0.5, 1.0, 1.5, 1.0);

        var result = new Quaternion();
        var actual = Quaternion.slerp(start, end, 0.0, result);
        expect(actual).toBe(result);
        expect(result).toEqual(start);
    });

    it('log works without a result parameter', function() {
        var axis = Cartesian3.normalize(new Cartesian3(1.0, -1.0, 1.0), new Cartesian3());
        var angle = CesiumMath.PI_OVER_FOUR;
        var quat = Quaternion.fromAxisAngle(axis, angle);

        var log = Quaternion.log(quat);
        var expected = Cartesian3.multiplyByScalar(axis, angle * 0.5, new Cartesian3());
        expect(log).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('log works with a result parameter', function() {
        var axis = Cartesian3.normalize(new Cartesian3(1.0, -1.0, 1.0), new Cartesian3());
        var angle = CesiumMath.PI_OVER_FOUR;
        var quat = Quaternion.fromAxisAngle(axis, angle);

        var result = new Cartesian3();
        var log = Quaternion.log(quat, result);
        var expected = Cartesian3.multiplyByScalar(axis, angle * 0.5, new Cartesian3());
        expect(log).toBe(result);
        expect(log).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('exp works without a result parameter', function() {
        var axis = Cartesian3.normalize(new Cartesian3(1.0, -1.0, 1.0), new Cartesian3());
        var angle = CesiumMath.PI_OVER_FOUR;
        var cartesian = Cartesian3.multiplyByScalar(axis, angle * 0.5, new Cartesian3());

        var exp = Quaternion.exp(cartesian);
        var expected = Quaternion.fromAxisAngle(axis, angle);
        expect(exp).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('exp works with a result parameter', function() {
        var axis = Cartesian3.normalize(new Cartesian3(1.0, -1.0, 1.0), new Cartesian3());
        var angle = CesiumMath.PI_OVER_FOUR;
        var cartesian = Cartesian3.multiplyByScalar(axis, angle * 0.5, new Cartesian3());

        var result = new Quaternion();
        var exp = Quaternion.exp(cartesian, result);
        var expected = Quaternion.fromAxisAngle(axis, angle);
        expect(exp).toBe(result);
        expect(exp).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('squad and innerQuadrangle work without a result parameter', function() {
        var q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
        var q1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var q2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var q3 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR);
        var q4 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR);

        var s1 = Quaternion.innerQuadrangle(q0, q1, q2);
        var s2 = Quaternion.innerQuadrangle(q1, q2, q3);
        expect(Quaternion.squad(q1, q2, s1, s2, 0.0)).toEqualEpsilon(q1, CesiumMath.EPSILON15);
        expect(Quaternion.squad(q1, q2, s1, s2, 1.0)).toEqualEpsilon(q2, CesiumMath.EPSILON15);

        var s3 = Quaternion.innerQuadrangle(q2, q3, q4);
        expect(Quaternion.squad(q2, q3, s2, s3, 0.0)).toEqualEpsilon(q2, CesiumMath.EPSILON15);
        expect(Quaternion.squad(q2, q3, s2, s3, 1.0)).toEqualEpsilon(q3, CesiumMath.EPSILON15);

        expect(Quaternion.squad(q1, q2, s1, s2, 1.0)).toEqualEpsilon(Quaternion.squad(q2, q3, s2, s3, 0.0), CesiumMath.EPSILON15);
    });

    it('squad and innerQuadrangle work with a result parameter', function() {
        var q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
        var q1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var q2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var q3 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR);

        var s1Result = new Quaternion();
        var s1 = Quaternion.innerQuadrangle(q0, q1, q2, s1Result);
        expect(s1).toBe(s1Result);

        var s2 = Quaternion.innerQuadrangle(q1, q2, q3);

        var squadResult = new Quaternion();
        var squad = Quaternion.squad(q1, q2, s1, s2, 0.0, squadResult);
        expect(squad).toBe(squadResult);
        expect(squad).toEqualEpsilon(q1, CesiumMath.EPSILON15);
    });

    it('fastSlerp works without a result parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        expect(Quaternion.fastSlerp(start, end, 0.0)).toEqual(start);
        expect(Quaternion.fastSlerp(start, end, 1.0)).toEqual(end);
        expect(Quaternion.fastSlerp(start, end, 0.5)).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('fastSlerp works with a result parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        var result = new Quaternion();
        var returnedResult = Quaternion.fastSlerp(start, end, 0.5, result);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON6);
        expect(result).toBe(returnedResult);
    });

    it('fastSlerp works with a result parameter that is an input parameter', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, Math.sin(Math.PI / 8.0), Math.cos(Math.PI / 8.0));

        var returnedResult = Quaternion.fastSlerp(start, end, 0.5, start);
        expect(start).toEqualEpsilon(expected, CesiumMath.EPSILON6);
        expect(start).toBe(returnedResult);
    });

    it('fastSlerp works with obtuse angles', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, -1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));
        var expected = new Quaternion(0.0, 0.0, -Math.sin(Math.PI / 8.0), -Math.cos(Math.PI / 8.0));
        expect(Quaternion.fastSlerp(start, end, 0.5)).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('fastSlerp vs slerp', function() {
        var start = Quaternion.normalize(new Quaternion(0.0, 0.0, 0.0, 1.0));
        var end = new Quaternion(0.0, 0.0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR));

        var expected = Quaternion.slerp(start, end, 0.25);
        var actual = Quaternion.fastSlerp(start, end, 0.25);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

        expected = Quaternion.slerp(start, end, 0.5);
        actual = Quaternion.fastSlerp(start, end, 0.5);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

        expected = Quaternion.slerp(start, end, 0.75);
        actual = Quaternion.fastSlerp(start, end, 0.75);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('fastSquad works without a result parameter', function() {
        var q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
        var q1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var q2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var q3 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR);
        var q4 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Y, CesiumMath.PI_OVER_FOUR);

        var s1 = Quaternion.innerQuadrangle(q0, q1, q2);
        var s2 = Quaternion.innerQuadrangle(q1, q2, q3);
        expect(Quaternion.fastSquad(q1, q2, s1, s2, 0.0)).toEqualEpsilon(q1, CesiumMath.EPSILON6);
        expect(Quaternion.fastSquad(q1, q2, s1, s2, 1.0)).toEqualEpsilon(q2, CesiumMath.EPSILON6);

        var s3 = Quaternion.innerQuadrangle(q2, q3, q4);
        expect(Quaternion.fastSquad(q2, q3, s2, s3, 0.0)).toEqualEpsilon(q2, CesiumMath.EPSILON6);
        expect(Quaternion.fastSquad(q2, q3, s2, s3, 1.0)).toEqualEpsilon(q3, CesiumMath.EPSILON6);

        expect(Quaternion.fastSquad(q1, q2, s1, s2, 1.0)).toEqualEpsilon(Quaternion.fastSquad(q2, q3, s2, s3, 0.0), CesiumMath.EPSILON6);
    });

    it('fastSquad works with a result parameter', function() {
        var q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
        var q1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var q2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var q3 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR);

        var s1 = Quaternion.innerQuadrangle(q0, q1, q2);
        var s2 = Quaternion.innerQuadrangle(q1, q2, q3);

        var squadResult = new Quaternion();
        var squad = Quaternion.fastSquad(q1, q2, s1, s2, 0.0, squadResult);
        expect(squad).toBe(squadResult);
        expect(squad).toEqualEpsilon(q1, CesiumMath.EPSILON6);
    });

    it('fastSquad vs squad', function() {
        var q0 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, 0.0);
        var q1 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, CesiumMath.PI_OVER_FOUR);
        var q2 = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, CesiumMath.PI_OVER_FOUR);
        var q3 = Quaternion.fromAxisAngle(Cartesian3.UNIT_X, -CesiumMath.PI_OVER_FOUR);

        var s1 = Quaternion.innerQuadrangle(q0, q1, q2);
        var s2 = Quaternion.innerQuadrangle(q1, q2, q3);

        var actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.25);
        var expected = Quaternion.squad(q1, q2, s1, s2, 0.25);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

        actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.5);
        expected = Quaternion.squad(q1, q2, s1, s2, 0.5);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);

        actual = Quaternion.fastSquad(q1, q2, s1, s2, 0.75);
        expected = Quaternion.squad(q1, q2, s1, s2, 0.75);
        expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON6);
    });

    it('equals', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        expect(Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 3.0, 4.0))).toEqual(true);
        expect(Quaternion.equals(quaternion, new Quaternion(2.0, 2.0, 3.0, 4.0))).toEqual(false);
        expect(Quaternion.equals(quaternion, new Quaternion(2.0, 1.0, 3.0, 4.0))).toEqual(false);
        expect(Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 4.0, 4.0))).toEqual(false);
        expect(Quaternion.equals(quaternion, new Quaternion(1.0, 2.0, 3.0, 5.0))).toEqual(false);
        expect(Quaternion.equals(quaternion, undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var quaternion = new Quaternion(1.0, 2.0, 3.0, 4.0);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 3.0, 4.0), 0.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(2.0, 2.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 3.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 4.0, 4.0), 1.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 3.0, 5.0), 1.0)).toEqual(true);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(2.0, 2.0, 3.0, 4.0), 0.99999)).toEqual(false);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 3.0, 3.0, 4.0), 0.99999)).toEqual(false);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 4.0, 4.0), 0.99999)).toEqual(false);
        expect(Quaternion.equalsEpsilon(quaternion, new Quaternion(1.0, 2.0, 3.0, 5.0), 0.99999)).toEqual(false);
        expect(Quaternion.equalsEpsilon(quaternion, undefined, 1)).toEqual(false);
    });

    it('toString', function() {
        var quaternion = new Quaternion(1.123, 2.345, 6.789, 6.123);
        expect(quaternion.toString()).toEqual('(1.123, 2.345, 6.789, 6.123)');
    });

    it('fromAxisAngle throws with undefined axis', function() {
        expect(function() {
            Quaternion.fromAxisAngle(undefined, 1.0);
        }).toThrowDeveloperError();
    });

    it('fromAxisAngle throws with non-numeric angle', function() {
        expect(function() {
            Quaternion.fromAxisAngle(Cartesian3.UNIT_X, {});
        }).toThrowDeveloperError();
    });

    it('fromRotationMatrix throws with undefined matrix', function() {
        expect(function() {
            Quaternion.fromRotationMatrix(undefined);
        }).toThrowDeveloperError();
    });

    it('static clone returns undefined with no parameter', function() {
        expect(Quaternion.clone()).toBeUndefined();
    });

    it('static conjugate throws with no parameter', function() {
        expect(function() {
            Quaternion.conjugate();
        }).toThrowDeveloperError();
    });

    it('static magnitudeSquared throws with no parameter', function() {
        expect(function() {
            Quaternion.magnitudeSquared();
        }).toThrowDeveloperError();
    });

    it('static magnitude throws with no parameter', function() {
        expect(function() {
            Quaternion.magnitude();
        }).toThrowDeveloperError();
    });

    it('static normalize throws with no parameter', function() {
        expect(function() {
            Quaternion.normalize();
        }).toThrowDeveloperError();
    });

    it('static inverse throws with no parameter', function() {
        expect(function() {
            Quaternion.inverse();
        }).toThrowDeveloperError();
    });

    it('static dot throws with no left parameter', function() {
        expect(function() {
            Quaternion.dot(undefined, new Quaternion());
        }).toThrowDeveloperError();
    });

    it('static dot throws with no right parameter', function() {
        expect(function() {
            Quaternion.dot(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static multiply throws with no right parameter', function() {
        expect(function() {
            Quaternion.multiply(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static multiply throws with no left parameter', function() {
        expect(function() {
            Quaternion.multiply(undefined, new Quaternion());
        }).toThrowDeveloperError();
    });

    it('static add throws with no left parameter', function() {
        expect(function() {
            Quaternion.add(undefined, new Quaternion());
        }).toThrowDeveloperError();
    });

    it('static add throws with no right parameter', function() {
        expect(function() {
            Quaternion.add(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static subtract throws with no left parameter', function() {
        expect(function() {
            Quaternion.subtract(undefined, new Quaternion());
        }).toThrowDeveloperError();
    });

    it('static subtract throws with no right parameter', function() {
        expect(function() {
            Quaternion.subtract(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static multiplyByScalar throws with no quaternion parameter', function() {
        expect(function() {
            Quaternion.multiplyByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('static multiplyByScalar throws with no scalar parameter', function() {
        expect(function() {
            Quaternion.multiplyByScalar(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static divideByScalar throws with no quaternion parameter', function() {
        expect(function() {
            Quaternion.divideByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('static divideByScalar throws with no scalar parameter', function() {
        expect(function() {
            Quaternion.divideByScalar(new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    it('static getAxis throws with no parameter', function() {
        expect(function() {
            Quaternion.getAxis(undefined);
        }).toThrowDeveloperError();
    });

    it('static getAngle throws with no parameter', function() {
        expect(function() {
            Quaternion.getAngle(undefined);
        }).toThrowDeveloperError();
    });

    it('static negate throws with no quaternion parameter', function() {
        expect(function() {
            Quaternion.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('static lerp throws with no start parameter', function() {
        var end = new Quaternion(8.0, 20.0, 6.0);
        var t = 0.25;
        expect(function() {
            Quaternion.lerp(undefined, end, t);
        }).toThrowDeveloperError();
    });

    it('static lerp throws with no end parameter', function() {
        var start = new Quaternion(4.0, 8.0, 6.0);
        var t = 0.25;
        expect(function() {
            Quaternion.lerp(start, undefined, t);
        }).toThrowDeveloperError();
    });

    it('static lerp throws with no t parameter', function() {
        var start = new Quaternion(4.0, 8.0, 6.0, 7.0);
        var end = new Quaternion(8.0, 20.0, 6.0, 7.0);
        expect(function() {
            Quaternion.lerp(start, end, undefined);
        }).toThrowDeveloperError();
    });

    it('static slerp throws with no start parameter', function() {
        var end = new Quaternion(8.0, 20.0, 6.0);
        var t = 0.25;
        expect(function() {
            Quaternion.slerp(undefined, end, t);
        }).toThrowDeveloperError();
    });

    it('static slerp throws with no end parameter', function() {
        var start = new Quaternion(4.0, 8.0, 6.0);
        var t = 0.25;
        expect(function() {
            Quaternion.slerp(start, undefined, t);
        }).toThrowDeveloperError();
    });

    it('static slerp throws with no t parameter', function() {
        var start = new Quaternion(4.0, 8.0, 6.0, 7.0);
        var end = new Quaternion(8.0, 20.0, 6.0, 7.0);
        expect(function() {
            Quaternion.slerp(start, end, undefined);
        }).toThrowDeveloperError();
    });

    it('static log throws with no quaternion parameter', function() {
        expect(function() {
            Quaternion.log();
        }).toThrowDeveloperError();
    });

    it('static exp throws with no cartesian parameter', function() {
        expect(function() {
            Quaternion.exp();
        }).toThrowDeveloperError();
    });

    it('static innerQuadrangle throws without q0, q1, or q2 parameter', function() {
        expect(function() {
            Quaternion.innerQuadrangle();
        }).toThrowDeveloperError();
    });

    it('static squad throws without q0, q1, s0, or s1 parameter', function() {
        expect(function() {
            Quaternion.squad();
        }).toThrowDeveloperError();
    });

    it('static squad throws without t parameter', function() {
        expect(function() {
            Quaternion.squad(new Quaternion(), new Quaternion(), new Quaternion(), new Quaternion());
        }).toThrowDeveloperError();
    });

    it('static equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Quaternion.equalsEpsilon(new Quaternion(), new Quaternion(), undefined);
        }).toThrowDeveloperError();
    });

    createPackableSpecs(Quaternion, new Quaternion(1, 2, 3, 4), [1, 2, 3, 4]);
});
