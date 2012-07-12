/*global defineSuite*/
defineSuite(['Core/Cartesian2'], function(Cartesian2) {
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
        expect(cartesian === result).toEqual(false);
        expect(cartesian).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var result = new Cartesian2();
        var returnedResult = cartesian.clone(result);
        expect(cartesian === result).toEqual(false);
        expect(result === returnedResult).toEqual(true);
        expect(cartesian).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var returnedResult = cartesian.clone(cartesian);
        expect(cartesian === returnedResult).toEqual(true);
    });

    it('magnitudeSquared', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(cartesian.magnitudeSquared()).toEqual(13);
    });

    it('magnitude', function() {
        var cartesian = new Cartesian2(2.0, 3.0);
        expect(cartesian.magnitude()).toEqual(Math.sqrt(13.0));
    });

    it('normalize', function() {
        var cartesian = new Cartesian2(2.0, 0.0).normalize();
        expect(cartesian.x).toEqual(1.0);
        expect(cartesian.y).toEqual(0.0);
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
        expect(returnedResult === result);
        expect(result).toEqual(expectedResult);
    });

    it('add works with "this" result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(4.0, 5.0);
        var expectedResult = new Cartesian2(6.0, 8.0);
        var returnedResult = left.add(right, left);
        expect(returnedResult === left);
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
        expect(returnedResult === result);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Cartesian2(2.0, 3.0);
        var right = new Cartesian2(1.0, 5.0);
        var expectedResult = new Cartesian2(1.0, -2.0);
        var returnedResult = left.subtract(right, left);
        expect(returnedResult === left);
        expect(left).toEqual(expectedResult);
    });

    it('multiplyWithScalar without a result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var scalar = 2;
        var expectedResult = new Cartesian2(2.0, 4.0);
        var result = cartesian.multiplyWithScalar(scalar);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyWithScalar with a result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var result = new Cartesian2();
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = cartesian.multiplyWithScalar(scalar, result);
        expect(result === returnedResult).toEqual(true);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyWithScalar with "this" result parameter', function() {
        var cartesian = new Cartesian2(1, 2);
        var scalar = 2;
        var expectedResult = new Cartesian2(2, 4);
        var returnedResult = cartesian.multiplyWithScalar(scalar, cartesian);
        expect(cartesian === returnedResult).toEqual(true);
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
        expect(result === returnedResult).toEqual(true);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, 2.0);
        var scalar = 2;
        var expectedResult = new Cartesian2(0.5, 1.0);
        var returnedResult = cartesian.divideByScalar(scalar, cartesian);
        expect(cartesian === returnedResult).toEqual(true);
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
        expect(result === returnedResult).toEqual(true);
        expect(result).toEqual(expectedResult);
    });

    it('negate with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(-1.0, 2.0);
        var returnedResult = cartesian.negate(cartesian);
        expect(cartesian === returnedResult).toEqual(true);
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
        expect(result === returnedResult).toEqual(true);
        expect(result).toEqual(expectedResult);
    });

    it('abs with "this" result parameter', function() {
        var cartesian = new Cartesian2(1.0, -2.0);
        var expectedResult = new Cartesian2(1.0, 2.0);
        var returnedResult = cartesian.abs(cartesian);
        expect(cartesian === returnedResult).toEqual(true);
        expect(cartesian).toEqual(expectedResult);
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

    it('static multiplyWithScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.multiplyWithScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static multiplyWithScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.multiplyWithScalar(new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static divideByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.divideByScalar(undefined, 2.0);
        }).toThrow();
    });

    it('static divideByScalar throws with no cartesian parameter', function() {
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

    it('static equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Cartesian2.equalsEpsilon(new Cartesian2(), new Cartesian2(), undefined);
        }).toThrow();
    });

    it('static toString throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian2.toString(undefined);
        }).toThrow();
    });
});
