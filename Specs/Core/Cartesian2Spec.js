/*global defineSuite*/
defineSuite([
             'Core/Cartesian2',
             'Core/Math'
            ], function(
              Cartesian2,
              CesiumMath) {
    "use strict";
    /*global it,expect*/

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

    it('clone without a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = cartesian.clone();
        expect(cartesian).toNotBe(result);
        expect(cartesian).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var returnedResult = cartesian.clone(result);
        expect(cartesian).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(cartesian).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var returnedResult = cartesian.clone(cartesian);
        expect(cartesian).toBe(returnedResult);
    });

    it('getMaximumComponent works when X is greater', function() {
        var cartesian = new Cartesian2(2.0, 1.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.x);
    });

    it('getMaximumComponent works when Y is greater', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.y);
    });

    it('getMinimumComponent works when X is lesser', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.x);
    });

    it('getMaximumComponent works when Y is lesser', function() {
        var cartesian = new Cartesian2(2.0, 1.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.y);
    });

    it('magnitudeSquared', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(cartesian.magnitudeSquared()).toEqual(13);
    });

    it('magnitude', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(cartesian.magnitude()).toEqual(Math.sqrt(13.0));
    });

    it('normalize works without a result parameter', function() {
        var cartesian = new Cartesian2(2.0, 0.0);
        var expectedResult = new Cartesian2(1.0, 0.0);
        var result = cartesian.normalize();
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter', function() {
        var cartesian = new Cartesian2(2.0, 0.0);
        var expectedResult = new Cartesian2(1.0, 0.0);
        var result = new Cartesian2();
        var returnedResult = cartesian.normalize(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with "this" result parameter', function() {
        var cartesian = new Cartesian2(2.0, 0.0);
        var expectedResult = new Cartesian2(1.0, 0.0);
        var returnedResult = cartesian.normalize(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('multiplyComponents works without a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(8.0, 15.0);
        var result = left.multiplyComponents(right);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(8.0, 15.0);
        var returnedResult = left.multiplyComponents(right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with "this" result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(8.0, 15.0);
        var returnedResult = left.multiplyComponents(right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('dot', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = 23.0;
        var result = left.dot(right);
        expect(result).toEqual(expectedResult);
    });

    it('add works without a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(6.0, 8.0);
        var result = left.add(right);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(6.0, 8.0);
        var returnedResult = left.add(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('add works with "this" result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(6.0, 8.0);
        var returnedResult = left.add(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('subtract works without a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var expectedResult = new Cartesian2(1.0, -2.0);
        var result = left.subtract(right);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with a result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(1.0, -2.0);
        var returnedResult = left.subtract(right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var expectedResult = new Cartesian2(1.0, -2.0);
        var returnedResult = left.subtract(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('multiplyByScalar without a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var scalar = 2;
        var expectedResult = new Cartesian2(2.0, 4.0);
        var result = cartesian.multiplyByScalar(scalar);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var result = new Cartesian2();
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = cartesian.multiplyByScalar(scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with "this" result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = cartesian.multiplyByScalar(scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('divideByScalar without a result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var result = cartesian.divideByScalar(scalar);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var returnedResult = cartesian.divideByScalar(scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var returnedResult = cartesian.divideByScalar(scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('negate without a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var result = cartesian.negate();
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var returnedResult = cartesian.negate(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('negate with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var returnedResult = cartesian.negate(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('abs without a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(1.0, 2.0);
        var result = cartesian.abs();
        expect(result).toEqual(expectedResult);
    });

    it('abs with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(1.0, 2.0);
        var returnedResult = cartesian.abs(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('abs with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(1.0, 2.0);
        var returnedResult = cartesian.abs(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('lerp works without a result parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        var expectedResult = new Cartesian2(5.0, 11.0);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        var result = new Cartesian2();
        var expectedResult = new Cartesian2(5.0, 11.0);
        var returnedResult = start.lerp(end, t, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with "this" result parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        var expectedResult = new Cartesian2(5.0, 11.0);
        var returnedResult = start.lerp(end, t, start);
        expect(start).toBe(returnedResult);
        expect(start).toEqual(expectedResult);
    });

    it('lerp extrapolate forward', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = 2.0;
        var expectedResult = new Cartesian2(12.0, 32.0);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp extrapolate backward', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        var t = -1.0;
        var expectedResult = new Cartesian2(0.0, -4.0);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('angleBetween works for right angles', function() {
        var x = Cartesian2.UNIT_X;
        var y = Cartesian2.UNIT_Y;
        expect(x.angleBetween(y)).toEqual(CesiumMath.PI_OVER_TWO);
        expect(y.angleBetween(x)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('angleBetween works for acute angles', function() {
        var x = new Cartesian2(0.0, 1.0);
        var y = new Cartesian2(1.0, 1.0);
        expect(x.angleBetween(y)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
        expect(y.angleBetween(x)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
    });

    it('angleBetween works for obtuse angles', function() {
        var x = new Cartesian2(0.0, 1.0);
        var y = new Cartesian2(-1.0, -1.0);
        expect(x.angleBetween(y)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
        expect(y.angleBetween(x)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
    });

    it('angleBetween works for zero angles', function() {
        var x = Cartesian2.UNIT_X;
        expect(x.angleBetween(x)).toEqual(0.0);
    });

    it('equals', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.equals(new Cartesian2(1.0, 2.0))).toEqual(true);
        expect(cartesian.equals(new Cartesian2(2.0, 2.0))).toEqual(false);
        expect(cartesian.equals(new Cartesian2(2.0, 1.0))).toEqual(false);
        expect(cartesian.equals(undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(2.0, 2.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian2(2.0, 2.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartesian = new Cartesian2(1.123, 2.345);
        expect(cartesian.toString()).toEqual('(1.123, 2.345)');
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            Cartesian2.clone();
        }).toThrow();
    });

    it('static getMaximumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian2.getMaximumComponent();
        }).toThrow();
    });

    it('static getMinimumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian2.getMinimumComponent();
        }).toThrow();
    });

    it('static magnitudeSquared throws with no parameter', function() {
        expect(function() {
            Cartesian2.magnitudeSquared();
        }).toThrow();
    });

    it('static magnitude throws with no parameter', function() {
        expect(function() {
            Cartesian2.magnitude();
        }).toThrow();
    });

    it('static normalize throws with no parameter', function() {
        expect(function() {
            Cartesian2.normalize();
        }).toThrow();
    });

    it('static dot throws with no left parameter', function() {
        expect(function() {
            Cartesian2.dot(undefined, new Cartesian2());
        }).toThrow();
    });

    it('static multiplyComponents throw with no left parameter', function() {
        var right = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.multiplyComponents(undefined, right);
        }).toThrow();
    });

    it('static multiplyComponents throw with no right parameter', function() {
        var left = new Cartesian2(4.0, 5.0);
        expect(function() {
            Cartesian2.multiplyComponents(left, undefined);
        }).toThrow();
    });

    it('static dot throws with no right parameter', function() {
        expect(function() {
            Cartesian2.dot(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static add throws with no left parameter', function() {
        expect(function() {
            Cartesian2.add(undefined, new Cartesian2());
        }).toThrow();
    });

    it('static add throws with no right parameter', function() {
        expect(function() {
            Cartesian2.add(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static subtract throws with no left parameter', function() {
        expect(function() {
            Cartesian2.subtract(undefined, new Cartesian2());
        }).toThrow();
    });

    it('static subtract throws with no right parameter', function() {
        expect(function() {
            Cartesian2.subtract(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.multiplyByScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian2.multiplyByScalar(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static divideByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.divideByScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static divideByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian2.divideByScalar(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static negate throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.negate(undefined);
        }).toThrow();
    });

    it('static abs throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.abs(undefined);
        }).toThrow();
    });

    it('static lerp throws with no start parameter', function() {
        var end = new Cartesian2(8.0, 20.0);
        var t = 0.25;
        expect(function() {
            Cartesian2.lerp(undefined, end, t);
        }).toThrow();
    });

    it('static lerp throws with no end parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var t = 0.25;
        expect(function() {
            Cartesian2.lerp(start, undefined, t);
        }).toThrow();
    });

    it('static lerp throws with no t parameter', function() {
        var start = new Cartesian2(4.0, 8.0);
        var end = new Cartesian2(8.0, 20.0);
        expect(function() {
            Cartesian2.lerp(start, end, undefined);
        }).toThrow();
    });

    it('static angleBetween throws with no left parameter', function() {
        var right = new Cartesian2(8.0, 20.0);
        expect(function() {
            Cartesian2.angleBetween(undefined, right);
        }).toThrow();
    });

    it('static angleBetween throws with no right parameter', function() {
        var left = new Cartesian2(4.0, 8.0);
        expect(function() {
            Cartesian2.angleBetween(left, undefined);
        }).toThrow();
    });

    it('static equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Cartesian2.equalsEpsilon(new Cartesian2(), new Cartesian2(), undefined);
        }).toThrow();
    });
});
