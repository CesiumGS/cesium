/*global defineSuite*/
defineSuite([
        'Core/Cartesian2',
        'Core/Math',
        'Specs/createPackableArraySpecs',
        'Specs/createPackableSpecs'
    ], function(
        Cartesian2,
        CesiumMath,
        createPackableArraySpecs,
        createPackableSpecs) {
    'use strict';

    it('construct with default values', function() {
        var cartesian = new Cartesian2();
        expect(cartesian.x).toEqual(0.0);
        expect(cartesian.y).toEqual(0.0);
    });

    it('construct with only an x value', function() {
        var cartesian = new Cartesian2(1.0);
        expect(cartesian.x).toEqual(1.0);
        expect(cartesian.y).toEqual(0.0);
    });

    it('construct with all values', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.x).toEqual(1.0);
        expect(cartesian.y).toEqual(2.0);
    });

    it('fromArray creates a Cartesian2', function() {
        var cartesian = new Cartesian2();
        cartesian = Cartesian2.fromArray([1.0, 2.0]);
        expect(cartesian).toEqual(new Cartesian2(1.0, 2.0));
    });

    it('fromArray with an offset creates a Cartesian2', function() {
        var cartesian = new Cartesian2();
        cartesian = Cartesian2.fromArray([0.0, 1.0, 2.0, 0.0], 1);
        expect(cartesian).toEqual(new Cartesian2(1.0, 2.0));
    });

    it('fromArray throws without values', function() {
        expect(function() {
            Cartesian2.fromArray();
        }).toThrowDeveloperError();
    });

    it('clone with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var returnedResult = Cartesian2.clone(cartesian, result);
        expect(cartesian).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(cartesian).toEqual(result);
    });

    it('clone works with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var returnedResult = Cartesian2.clone(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
    });

    it('maximumComponent works when X is greater', function() {
        var cartesian = new Cartesian2(2.0, 1.0);
        expect(Cartesian2.maximumComponent(cartesian)).toEqual(cartesian.x);
    });

    it('maximumComponent works when Y is greater', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(Cartesian2.maximumComponent(cartesian)).toEqual(cartesian.y);
    });

    it('minimumComponent works when X is lesser', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(Cartesian2.minimumComponent(cartesian)).toEqual(cartesian.x);
    });

    it('minimumComponent works when Y is lesser', function() {
        var cartesian = new Cartesian2(2.0, 1.0);
        expect(Cartesian2.minimumComponent(cartesian)).toEqual(cartesian.y);
    });

    it('minimumByComponent', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2();
        var expected = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(1.0, 0.0);
        second = new Cartesian2(2.0, 0.0);
        expected = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(1.0, -20.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -20.0);
        second = new Cartesian2(1.0, -15.0);
        expected = new Cartesian2(1.0, -20.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(1.0, -20.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(1.0, -20.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(expected);
    });

    it('minimumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.minimumByComponent(first, second, first)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian2.minimumByComponent(first, second, first)).toEqual(result);
    });

    it('minimumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.minimumByComponent(first, second, second)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian2.minimumByComponent(first, second, second)).toEqual(result);
    });

    it('minimumByComponent throws without first', function() {
        expect(function() {
            Cartesian2.minimumByComponent();
        }).toThrowDeveloperError();
    });

    it('minimumByComponent throws without second', function() {
        expect(function() {
            Cartesian2.minimumByComponent(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('minimumByComponent works when first\'s or second\'s X is lesser', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(result);
        second.x = 3.0;
        result.x = 2.0;
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(result);
    });

    it('minimumByComponent works when first\'s or second\'s Y is lesser', function() {
        var first = new Cartesian2(0.0, 2.0);
        var second = new Cartesian2(0.0, 1.0);
        var result = new Cartesian2(0.0, 1.0);
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(result);
        second.y = 3.0;
        result.y = 2.0;
        expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(result);
    });

    it('maximumByComponent', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2();
        var expected = new Cartesian2(2.0, 0.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(1.0, 0.0);
        second = new Cartesian2(2.0, 0.0);
        expected = new Cartesian2(2.0, 0.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(2.0, -15.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -20.0);
        second = new Cartesian2(1.0, -15.0);
        expected = new Cartesian2(2.0, -15.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(2.0, -15.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
        first = new Cartesian2(2.0, -15.0);
        second = new Cartesian2(1.0, -20.0);
        expected = new Cartesian2(2.0, -15.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(expected);
    });

    it('maximumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(2.0, 0.0);
        expect(Cartesian2.maximumByComponent(first, second, first)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian2.maximumByComponent(first, second, first)).toEqual(result);
    });

    it('maximumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(2.0, 0.0);
        expect(Cartesian2.maximumByComponent(first, second, second)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian2.maximumByComponent(first, second, second)).toEqual(result);
    });

    it('maximumByComponent throws without first', function() {
        expect(function() {
            Cartesian2.maximumByComponent();
        }).toThrowDeveloperError();
    });

    it('maximumByComponent throws without second', function() {
        expect(function() {
            Cartesian2.maximumByComponent(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('maximumByComponent works when first\'s or second\'s X is greater', function() {
        var first = new Cartesian2(2.0, 0.0);
        var second = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2(2.0, 0.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(result);
        second.x = 3.0;
        result.x = 3.0;
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('maximumByComponent works when first\'s or second\'s Y is greater', function() {
        var first = new Cartesian2(0.0, 2.0);
        var second = new Cartesian2(0.0, 1.0);
        var result = new Cartesian2(0.0, 2.0);
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(result);
        second.y = 3.0;
        result.y = 3.0;
        expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('magnitudeSquared', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(Cartesian2.magnitudeSquared(cartesian)).toEqual(13);
    });

    it('magnitude', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(Cartesian2.magnitude(cartesian)).toEqual(Math.sqrt(13.0));
    });

    it('distance', function() {
        var distance = Cartesian2.distance(new Cartesian2(1.0, 0.0), new Cartesian2(2.0, 0.0));
        expect(distance).toEqual(1.0);
    });

    it('distance throws without left', function() {
        expect(function() {
            Cartesian2.distance();
        }).toThrowDeveloperError();
    });

    it('distance throws without right', function() {
        expect(function() {
            Cartesian2.distance(Cartesian2.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('distanceSquared', function() {
        var distanceSquared = Cartesian2.distanceSquared(new Cartesian2(1.0, 0.0), new Cartesian2(3.0, 0.0));
        expect(distanceSquared).toEqual(4.0);
    });

    it('distanceSquared throws without left', function() {
        expect(function() {
            Cartesian2.distanceSquared();
        }).toThrowDeveloperError();
    });

    it('distanceSquared throws without right', function() {
        expect(function() {
            Cartesian2.distanceSquared(Cartesian2.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('normalize works with a result parameter', function() {
        var cartesian = new Cartesian2(2.0, 0.0);
        var expectedResult = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2();
        var returnedResult = Cartesian2.normalize(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(2.0, 0.0);
        var expectedResult = new Cartesian2(1.0, 0.0);
        var returnedResult = Cartesian2.normalize(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('normalize throws with zero vector', function() {
        expect(function() {
            Cartesian2.normalize(Cartesian2.ZERO, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('multiplyComponents works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(8.0, 15.0);
        var returnedResult = Cartesian2.multiplyComponents(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with a result parameter that is an input parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(8.0, 15.0);
        var returnedResult = Cartesian2.multiplyComponents(left, right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('divideComponents works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(0.5, 0.6);
        var returnedResult = Cartesian2.divideComponents(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideComponents works with a result parameter that is an input parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(0.5, 0.6);
        var returnedResult = Cartesian2.divideComponents(left, right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('dot', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = 23.0;
        var result = Cartesian2.dot(left, right);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(6.0, 8.0);
        var returnedResult = Cartesian2.add(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter that is an input parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(6.0, 8.0);
        var returnedResult = Cartesian2.add(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('subtract works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(1.0, -2.0);
        var returnedResult = Cartesian2.subtract(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var expectedResult = new Cartesian2(1.0, -2.0);
        var returnedResult = Cartesian2.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var result = new Cartesian2();
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = Cartesian2.multiplyByScalar(cartesian, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = Cartesian2.multiplyByScalar(cartesian, scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var returnedResult = Cartesian2.divideByScalar(cartesian, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var returnedResult = Cartesian2.divideByScalar(cartesian, scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('negate with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var returnedResult = Cartesian2.negate(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var returnedResult = Cartesian2.negate(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('abs with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(1.0, 2.0);
        var returnedResult = Cartesian2.abs(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('abs with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(1.0, 2.0);
        var returnedResult = Cartesian2.abs(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('lerp works with a result parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(5.0, 11.0);
        var returnedResult = Cartesian2.lerp(start, end, t, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter that is an input parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        var expectedResult = new Cartesian2(5.0, 11.0);
        var returnedResult = Cartesian2.lerp(start, end, t, start);
        expect(start).toBe(returnedResult);
        expect(start).toEqual(expectedResult);
    });

    it('lerp extrapolate forward', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 2.0;
        var expectedResult = new Cartesian2(12.0, 32.0);
        var result = Cartesian2.lerp(start, end, t, new Cartesian2());
        expect(result).toEqual(expectedResult);
    });

    it('lerp extrapolate backward', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = -1.0;
        var expectedResult = new Cartesian2(0.0, -4.0);
        var result = Cartesian2.lerp(start, end, t, new Cartesian2());
        expect(result).toEqual(expectedResult);
    });

    it('angleBetween works for right angles', function() {
        var x = Cartesian2.UNIT_X;
        var y = Cartesian2.UNIT_Y;
        expect(Cartesian2.angleBetween(x, y)).toEqual(CesiumMath.PI_OVER_TWO);
        expect(Cartesian2.angleBetween(y, x)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('angleBetween works for acute angles', function() {
        var x = new Cartesian2(0.0, 1.0);
        var y = new Cartesian2(1.0, 1.0);
        expect(Cartesian2.angleBetween(x, y)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
        expect(Cartesian2.angleBetween(y, x)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
    });

    it('angleBetween works for obtuse angles', function() {
        var x = new Cartesian2(0.0, 1.0);
        var y = new Cartesian2(-1.0, -1.0);
        expect(Cartesian2.angleBetween(x, y)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
        expect(Cartesian2.angleBetween(y, x)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
    });

    it('angleBetween works for zero angles', function() {
        var x = Cartesian2.UNIT_X;
        expect(Cartesian2.angleBetween(x, x)).toEqual(0.0);
    });

    it('most orthogonal angle is x', function() {
        var v = new Cartesian2(0.0, 1.0);
        expect(Cartesian2.mostOrthogonalAxis(v, new Cartesian2())).toEqual(Cartesian2.UNIT_X);
    });

    it('most orthogonal angle is y', function() {
        var v = new Cartesian2(1.0, 0.0);
        expect(Cartesian2.mostOrthogonalAxis(v, new Cartesian2())).toEqual(Cartesian2.UNIT_Y);
    });

    it('equals', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(Cartesian2.equals(cartesian, new Cartesian2(1.0, 2.0))).toEqual(true);
        expect(Cartesian2.equals(cartesian, new Cartesian2(2.0, 2.0))).toEqual(false);
        expect(Cartesian2.equals(cartesian, new Cartesian2(2.0, 1.0))).toEqual(false);
        expect(Cartesian2.equals(cartesian, undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(2.0, 2.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

        cartesian = new Cartesian2(3000000.0, 4000000.0);
        expect(cartesian.equalsEpsilon(new Cartesian2(3000000.0, 4000000.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(3000000.0, 4000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(3000000.2, 4000000.0), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(3000000.2, 4000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(3000000.2, 4000000.2), CesiumMath.EPSILON9)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

        expect(Cartesian2.equalsEpsilon(undefined, cartesian, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartesian = new Cartesian2(1.123, 2.345);
        expect(cartesian.toString()).toEqual('(1.123, 2.345)');
    });

    it('clone returns undefined with no parameter', function() {
        expect(Cartesian2.clone()).toBeUndefined();
    });

    it('maximumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian2.maximumComponent();
        }).toThrowDeveloperError();
    });

    it('minimumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian2.minimumComponent();
        }).toThrowDeveloperError();
    });

    it('magnitudeSquared throws with no parameter', function() {
        expect(function() {
            Cartesian2.magnitudeSquared();
        }).toThrowDeveloperError();
    });

    it('magnitude throws with no parameter', function() {
        expect(function() {
            Cartesian2.magnitude();
        }).toThrowDeveloperError();
    });

    it('normalize throws with no parameter', function() {
        expect(function() {
            Cartesian2.normalize();
        }).toThrowDeveloperError();
    });

    it('dot throws with no left parameter', function() {
        expect(function() {
            Cartesian2.dot(undefined, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('dot throws with no right parameter', function() {
        expect(function() {
            Cartesian2.dot(new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throw with no left parameter', function() {
        var right = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.multiplyComponents(undefined, right);
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throw with no right parameter', function() {
        var left = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.multiplyComponents(left, undefined);
        }).toThrowDeveloperError();
    });

    it('divideComponents throw with no left parameter', function() {
        var right = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.divideComponents(undefined, right);
        }).toThrowDeveloperError();
    });

    it('divideComponents throw with no right parameter', function() {
        var left = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.divideComponents(left, undefined);
        }).toThrowDeveloperError();
    });

    it('add throws with no left parameter', function() {
        expect(function() {
            Cartesian2.add(undefined, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('add throws with no right parameter', function() {
        expect(function() {
            Cartesian2.add(new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('subtract throws with no left parameter', function() {
        expect(function() {
            Cartesian2.subtract(undefined, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('subtract throws with no right parameter', function() {
        expect(function() {
            Cartesian2.subtract(new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.multiplyByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian2.multiplyByScalar(new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.divideByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian2.divideByScalar(new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('negate throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('abs throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.abs(undefined);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no start parameter', function() {
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        expect(function() {
            Cartesian2.lerp(undefined, end, t);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no end parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var t = 0.25;
        expect(function() {
            Cartesian2.lerp(start, undefined, t);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no t parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        expect(function() {
            Cartesian2.lerp(start, end, undefined);
        }).toThrowDeveloperError();
    });

    it('angleBetween throws with no left parameter', function() {
        var right = new Cartesian2(8.0, 20.0);
        expect(function() {
            Cartesian2.angleBetween(undefined, right);
        }).toThrowDeveloperError();
    });

    it('angleBetween throws with no right parameter', function() {
        var left = new Cartesian2(4.0, 8.0);
        expect(function() {
            Cartesian2.angleBetween(left, undefined);
        }).toThrowDeveloperError();
    });

    it('mostOrthogonalAxis throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.mostOrthogonalAxis(undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Cartesian2.equalsEpsilon(new Cartesian2(), new Cartesian2(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromElements returns a cartesian2 with corrrect coordinates', function(){
        var cartesian2 = Cartesian2.fromElements(2, 2);
        var expectedResult = new Cartesian2(2, 2);
        expect(cartesian2).toEqual(expectedResult);
    });

    it('fromElements result param returns cartesian2 with correct coordinates', function(){
        var cartesian2 = new Cartesian2();
        Cartesian2.fromElements(2, 2, cartesian2);
        var expectedResult = new Cartesian2(2, 2);
        expect(cartesian2).toEqual(expectedResult);
    });

    it('minimumByComponent throws with no result', function() {
        expect(function() {
            Cartesian2.minimumByComponent(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('maximumByComponent throws with no result', function() {
        expect(function() {
            Cartesian2.maximumByComponent(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('normalize throws with no result', function() {
        expect(function() {
            Cartesian2.normalize(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throws with no result', function() {
        expect(function() {
            Cartesian2.multiplyComponents(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('divideComponents throws with no result', function() {
        expect(function() {
            Cartesian2.divideComponents(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('add throws with no result', function() {
        expect(function() {
            Cartesian2.add(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('subtact throws with no result', function() {
        expect(function() {
            Cartesian2.subtract(new Cartesian2(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no result', function() {
        expect(function() {
            Cartesian2.multiplyByScalar(new Cartesian2(), 2);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no result', function() {
        expect(function() {
            Cartesian2.divideByScalar(new Cartesian2(), 2);
        }).toThrowDeveloperError();
    });

    it('negate throws with no result', function() {
        expect(function() {
            Cartesian2.negate(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('abs throws with no result', function() {
        expect(function() {
            Cartesian2.abs(new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('lerp throws with no result', function() {
        expect(function() {
            Cartesian2.lerp(new Cartesian2(), new Cartesian2(), 10);
        }).toThrowDeveloperError();
    });

    it('mostOrthogonalAxis throws with no result', function() {
        expect(function() {
            Cartesian2.mostOrthogonalAxis(new Cartesian2());
        }).toThrowDeveloperError();
    });

    createPackableSpecs(Cartesian2, new Cartesian2(1, 2), [1, 2]);
    createPackableArraySpecs(Cartesian2, [new Cartesian2(1, 2), new Cartesian2(3, 4)], [1, 2, 3, 4]);
});
