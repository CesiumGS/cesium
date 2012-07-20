/*global defineSuite*/
defineSuite([
             'Core/Cartesian4',
             'Core/Math'
            ], function(
              Cartesian4,
              CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct with default values', function() {
        var cartesian = new Cartesian4();
        expect(cartesian.x).toEqual(0.0);
        expect(cartesian.y).toEqual(0.0);
        expect(cartesian.z).toEqual(0.0);
        expect(cartesian.w).toEqual(0.0);
    });

    it('construct with all values', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        expect(cartesian.x).toEqual(1.0);
        expect(cartesian.y).toEqual(2.0);
        expect(cartesian.z).toEqual(3.0);
        expect(cartesian.w).toEqual(4.0);
    });

    it('clone without a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var result = cartesian.clone();
        expect(cartesian).toNotBe(result);
        expect(cartesian).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var result = new Cartesian4();
        var returnedResult = cartesian.clone(result);
        expect(cartesian).toNotBe(result);
        expect(result).toBe(returnedResult);
        expect(cartesian).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var returnedResult = cartesian.clone(cartesian);
        expect(cartesian).toBe(returnedResult);
    });

    it('getMaximumComponent works when X is greater', function() {
        var cartesian = new Cartesian4(2.0, 1.0, 0.0, -1.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.x);
    });

    it('getMaximumComponent works when Y is greater', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 0.0, -1.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.y);
    });

    it('getMaximumComponent works when Z is greater', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, -1.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.z);
    });

    it('getMaximumComponent works when W is greater', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        expect(cartesian.getMaximumComponent()).toEqual(cartesian.w);
    });

    it('getMinimumComponent works when X is lesser', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.x);
    });

    it('getMaximumComponent works when Y is lesser', function() {
        var cartesian = new Cartesian4(2.0, 1.0, 3.0, 4.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.y);
    });

    it('getMaximumComponent works when Z is lesser', function() {
        var cartesian = new Cartesian4(2.0, 1.0, 0.0, 4.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.z);
    });

    it('getMaximumComponent works when W is lesser', function() {
        var cartesian = new Cartesian4(2.0, 1.0, 0.0, -1.0);
        expect(cartesian.getMinimumComponent()).toEqual(cartesian.w);
    });

    it('magnitudeSquared', function() {
        var cartesian = new Cartesian4(3.0, 4.0, 5.0, 6.0);
        expect(cartesian.magnitudeSquared()).toEqual(86.0);
    });

    it('magnitude', function() {
        var cartesian = new Cartesian4(3.0, 4.0, 5.0, 6.0);
        expect(cartesian.magnitude()).toEqual(Math.sqrt(86.0));
    });

    it('normalize works without a result parameter', function() {
        var cartesian = new Cartesian4(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Cartesian4(1.0, 0.0, 0.0, 0.0);
        var result = cartesian.normalize();
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter', function() {
        var cartesian = new Cartesian4(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Cartesian4(1.0, 0.0, 0.0, 0.0);
        var result = new Cartesian4();
        var returnedResult = cartesian.normalize(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with "this" result parameter', function() {
        var cartesian = new Cartesian4(2.0, 0.0, 0.0, 0.0);
        var expectedResult = new Cartesian4(1.0, 0.0, 0.0, 0.0);
        var returnedResult = cartesian.normalize(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('multiplyComponents works without a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(8.0, 15.0, 42.0, 72.0);
        var result = left.multiplyComponents(right);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(8.0, 15.0, 42.0, 72.0);
        var returnedResult = left.multiplyComponents(right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with "this" result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(8.0, 15.0, 42.0, 72.0);
        var returnedResult = left.multiplyComponents(right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('dot', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var expectedResult = 137.0;
        var result = left.dot(right);
        expect(result).toEqual(expectedResult);
    });

    it('add works without a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(6.0, 8.0, 13.0, 17.0);
        var result = left.add(right);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(6.0, 8.0, 13.0,  17.0);
        var returnedResult = left.add(right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('add works with "this" result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
        var right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(6.0, 8.0, 13.0, 17.0);
        var returnedResult = left.add(right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('subtract works without a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 4.0, 8.0);
        var right = new Cartesian4(1.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(1.0, -2.0, -3.0, -1.0);
        var result = left.subtract(right);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with a result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 4.0, 8.0);
        var right = new Cartesian4(1.0, 5.0, 7.0, 9.0);
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(1.0, -2.0, -3.0, -1.0);
        var returnedResult = left.subtract(right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Cartesian4(2.0, 3.0, 4.0, 8.0);
        var right = new Cartesian4(1.0, 5.0, 7.0, 9.0);
        var expectedResult = new Cartesian4(1.0, -2.0, -3.0, -1.0);
        var returnedResult = left.subtract(right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('multiplyByScalar without a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Cartesian4(2.0, 4.0, 6.0, 8.0);
        var result = cartesian.multiplyByScalar(scalar);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var result = new Cartesian4();
        var scalar = 2;
        var expectedResult = new Cartesian4(2.0, 4.0, 6.0, 8.0);
        var returnedResult = cartesian.multiplyByScalar(scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with "this" result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Cartesian4(2.0, 4.0, 6.0, 8.0);
        var returnedResult = cartesian.multiplyByScalar(scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('divideByScalar without a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Cartesian4(0.5, 1.0, 1.5, 2.0);
        var result = cartesian.divideByScalar(scalar);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var result = new Cartesian4();
        var scalar = 2;
        var expectedResult = new Cartesian4(0.5, 1.0, 1.5, 2.0);
        var returnedResult = cartesian.divideByScalar(scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with "this" result parameter', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        var scalar = 2;
        var expectedResult = new Cartesian4(0.5, 1.0, 1.5, 2.0);
        var returnedResult = cartesian.divideByScalar(scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('negate without a result parameter', function() {
        var cartesian = new Cartesian4(1.0, -2.0, -5.0, 4.0);
        var expectedResult = new Cartesian4(-1.0, 2.0, 5.0, -4.0);
        var result = cartesian.negate();
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter', function() {
        var cartesian = new Cartesian4(1.0, -2.0, -5.0, 4.0);
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(-1.0, 2.0, 5.0, -4.0);
        var returnedResult = cartesian.negate(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('negate with "this" result parameter', function() {
        var cartesian = new Cartesian4(1.0, -2.0, -5.0);
        var expectedResult = new Cartesian4(-1.0, 2.0, 5.0);
        var returnedResult = cartesian.negate(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('abs without a result parameter', function() {
        var cartesian = new Cartesian4(-1.0, -2.0, -4.0, -3.0);
        var expectedResult = new Cartesian4(1.0, 2.0, 4.0, 3.0);
        var result = cartesian.abs();
        expect(result).toEqual(expectedResult);
    });

    it('abs with a result parameter', function() {
        var cartesian = new Cartesian4(1.0, -2.0, -4.0, -3.0);
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(1.0, 2.0, 4.0, 3.0);
        var returnedResult = cartesian.abs(result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('abs with "this" result parameter', function() {
        var cartesian = new Cartesian4(1.0, -2.0, -4.0, -3.0);
        var expectedResult = new Cartesian4(1.0, 2.0, 4.0, 3.0);
        var returnedResult = cartesian.abs(cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('lerp works without a result parameter', function() {
        var start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
        var end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var expectedResult = new Cartesian4(5.0, 11.0, 12.5, 22.5);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter', function() {
        var start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
        var end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var result = new Cartesian4();
        var expectedResult = new Cartesian4(5.0, 11.0, 12.5, 22.5);
        var returnedResult = start.lerp(end, t, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with "this" result parameter', function() {
        var start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
        var end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
        var t = 0.25;
        var expectedResult = new Cartesian4(5.0, 11.0, 12.5, 22.5);
        var returnedResult = start.lerp(end, t, start);
        expect(start).toBe(returnedResult);
        expect(start).toEqual(expectedResult);
    });

    it('lerp extrapolate forward', function() {
        var start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
        var end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
        var t = 2.0;
        var expectedResult = new Cartesian4(12.0, 32.0, 30.0, 40.0);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('lerp extrapolate backward', function() {
        var start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
        var end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
        var t = -1.0;
        var expectedResult = new Cartesian4(0.0, -4.0, 0.0, 10.0);
        var result = start.lerp(end, t);
        expect(result).toEqual(expectedResult);
    });

    it('equals', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        expect(cartesian.equals(new Cartesian4(1.0, 2.0, 3.0, 4.0))).toEqual(true);
        expect(cartesian.equals(new Cartesian4(2.0, 2.0, 3.0, 4.0))).toEqual(false);
        expect(cartesian.equals(new Cartesian4(2.0, 1.0, 3.0, 4.0))).toEqual(false);
        expect(cartesian.equals(new Cartesian4(1.0, 2.0, 4.0, 4.0))).toEqual(false);
        expect(cartesian.equals(new Cartesian4(1.0, 2.0, 3.0, 5.0))).toEqual(false);
        expect(cartesian.equals(undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 4.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(2.0, 2.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 3.0, 3.0, 4.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 4.0, 4.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 5.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian4(2.0, 2.0, 3.0, 4.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 3.0, 3.0, 4.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 4.0, 4.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 5.0), 0.99999)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartesian = new Cartesian4(1.123, 2.345, 6.789, 6.123);
        expect(cartesian.toString()).toEqual('(1.123, 2.345, 6.789, 6.123)');
    });

    it('static clone throws with no parameter', function() {
        expect(function() {
            Cartesian4.clone();
        }).toThrow();
    });

    it('static getMaximumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian4.getMaximumComponent();
        }).toThrow();
    });

    it('static getMinimumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian4.getMinimumComponent();
        }).toThrow();
    });

    it('static magnitudeSquared throws with no parameter', function() {
        expect(function() {
            Cartesian4.magnitudeSquared();
        }).toThrow();
    });

    it('static magnitude throws with no parameter', function() {
        expect(function() {
            Cartesian4.magnitude();
        }).toThrow();
    });

    it('static normalize throws with no parameter', function() {
        expect(function() {
            Cartesian4.normalize();
        }).toThrow();
    });

    it('static dot throws with no left parameter', function() {
        expect(function() {
            Cartesian4.dot(undefined, new Cartesian4());
        }).toThrow();
    });

    it('static multiplyComponents throw with no left parameter', function() {
        var right = new Cartesian4(4.0, 5.0, 6.0, 7.0);
        expect(function() {
            Cartesian4.multiplyComponents(undefined, right);
        }).toThrow();
    });

    it('static multiplyComponents throw with no right parameter', function() {
        var left = new Cartesian4(4.0, 5.0, 6.0, 7.0);
        expect(function() {
            Cartesian4.multiplyComponents(left, undefined);
        }).toThrow();
    });

    it('static dot throws with no right parameter', function() {
        expect(function() {
            Cartesian4.dot(new Cartesian4(), undefined);
        }).toThrow();
    });

    it('static add throws with no left parameter', function() {
        expect(function() {
            Cartesian4.add(undefined, new Cartesian4());
        }).toThrow();
    });

    it('static add throws with no right parameter', function() {
        expect(function() {
            Cartesian4.add(new Cartesian4(), undefined);
        }).toThrow();
    });

    it('static subtract throws with no left parameter', function() {
        expect(function() {
            Cartesian4.subtract(undefined, new Cartesian4());
        }).toThrow();
    });

    it('static subtract throws with no right parameter', function() {
        expect(function() {
            Cartesian4.subtract(new Cartesian4(), undefined);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian4.multiplyByScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static multiplyByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian4.multiplyByScalar(new Cartesian4(), undefined);
        }).toThrow();
    });

    it('static divideByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian4.divideByScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static divideByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian4.divideByScalar(new Cartesian4(), undefined);
        }).toThrow();
    });

    it('static negate throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian4.negate(undefined);
        }).toThrow();
    });

    it('static abs throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian4.abs(undefined);
        }).toThrow();
    });

    it('static lerp throws with no start parameter', function() {
        var end = new Cartesian4(8.0, 20.0, 6.0);
        var t = 0.25;
        expect(function() {
            Cartesian4.lerp(undefined, end, t);
        }).toThrow();
    });

    it('static lerp throws with no end parameter', function() {
        var start = new Cartesian4(4.0, 8.0, 6.0);
        var t = 0.25;
        expect(function() {
            Cartesian4.lerp(start, undefined, t);
        }).toThrow();
    });

    it('static lerp throws with no t parameter', function() {
        var start = new Cartesian4(4.0, 8.0, 6.0, 7.0);
        var end = new Cartesian4(8.0, 20.0, 6.0, 7.0);
        expect(function() {
            Cartesian4.lerp(start, end, undefined);
        }).toThrow();
    });

    it('static equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Cartesian4.equalsEpsilon(new Cartesian4(), new Cartesian4(), undefined);
        }).toThrow();
    });
});
