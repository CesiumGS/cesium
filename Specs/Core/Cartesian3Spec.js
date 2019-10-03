import { Cartesian3 } from '../../Source/Cesium.js';
import { Cartographic } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import createPackableArraySpecs from '../createPackableArraySpecs.js';
import createPackableSpecs from '../createPackableSpecs.js';

describe('Core/Cartesian3', function() {

    it('construct with default values', function() {
        var cartesian = new Cartesian3();
        expect(cartesian.x).toEqual(0.0);
        expect(cartesian.y).toEqual(0.0);
        expect(cartesian.z).toEqual(0.0);
    });

    it('construct with all values', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        expect(cartesian.x).toEqual(1.0);
        expect(cartesian.y).toEqual(2.0);
        expect(cartesian.z).toEqual(3.0);
    });

    var fortyFiveDegrees = Math.PI / 4.0;
    var sixtyDegrees = Math.PI / 3.0;
    var cartesian = new Cartesian3(1.0, Math.sqrt(3.0), -2.0);
    var spherical = {
        clock : sixtyDegrees,
        cone : (fortyFiveDegrees + Math.PI / 2.0),
        magnitude : Math.sqrt(8.0)
    };

    it('convert Spherical to an existing Cartesian3 instance', function() {
        var existing = new Cartesian3();
        expect(cartesian).toEqualEpsilon(Cartesian3.fromSpherical(spherical, existing), CesiumMath.EPSILON15);
        expect(cartesian).toEqualEpsilon(existing, CesiumMath.EPSILON15);
    });

    it('fromArray with an offset creates a Cartesian3', function() {
        var cartesian = Cartesian3.fromArray([0.0, 1.0, 2.0, 3.0, 0.0], 1);
        expect(cartesian).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('fromArray creates a Cartesian3 with a result parameter', function() {
        var cartesian = new Cartesian3();
        var result = Cartesian3.fromArray([1.0, 2.0, 3.0], 0, cartesian);
        expect(result).toBe(cartesian);
        expect(result).toEqual(new Cartesian3(1.0, 2.0, 3.0));
    });

    it('fromArray throws without values', function() {
        expect(function() {
            Cartesian3.fromArray();
        }).toThrowDeveloperError();
    });

    it('unpackArray works', function() {
        var array = Cartesian3.unpackArray([0.0, 1.0, 2.0, 3.0, 0.0, 4.0]);
        expect(array).toEqual([new Cartesian3(0.0, 1.0, 2.0), new Cartesian3(3.0, 0.0, 4.0)]);
    });

    it('unpackArray works with a result parameter', function() {
        var array = [];
        var result = Cartesian3.unpackArray([1.0, 2.0, 3.0], array);
        expect(result).toBe(array);
        expect(result).toEqual([new Cartesian3(1.0, 2.0, 3.0)]);

        array = [new Cartesian3(), new Cartesian3(), new Cartesian3()];
        result = Cartesian3.unpackArray([1.0, 2.0, 3.0], array);
        expect(result).toBe(array);
        expect(result).toEqual([new Cartesian3(1.0, 2.0, 3.0)]);
    });

    it('unpackArray throws with array less than 3 length', function() {
        expect(function() {
            Cartesian3.unpackArray([1.0]);
        }).toThrowDeveloperError();
    });

    it('unpackArray throws with array not multiple of 3', function() {
        expect(function() {
            Cartesian3.unpackArray([1.0, 2.0, 3.0, 4.0]);
        }).toThrowDeveloperError();
    });

    it('clone with a result parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var result = new Cartesian3();
        var returnedResult = Cartesian3.clone(cartesian, result);
        expect(cartesian).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(cartesian).toEqual(result);
    });

    it('clone works with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var returnedResult = Cartesian3.clone(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
    });

    it('maximumComponent works when X is greater', function() {
        var cartesian = new Cartesian3(2.0, 1.0, 0.0);
        expect(Cartesian3.maximumComponent(cartesian)).toEqual(cartesian.x);
    });

    it('maximumComponent works when Y is greater', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 0.0);
        expect(Cartesian3.maximumComponent(cartesian)).toEqual(cartesian.y);
    });

    it('maximumComponent works when Z is greater', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        expect(Cartesian3.maximumComponent(cartesian)).toEqual(cartesian.z);
    });

    it('minimumComponent works when X is lesser', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        expect(Cartesian3.minimumComponent(cartesian)).toEqual(cartesian.x);
    });

    it('minimumComponent works when Y is lesser', function() {
        var cartesian = new Cartesian3(2.0, 1.0, 3.0);
        expect(Cartesian3.minimumComponent(cartesian)).toEqual(cartesian.y);
    });

    it('minimumComponent works when Z is lesser', function() {
        var cartesian = new Cartesian3(2.0, 1.0, 0.0);
        expect(Cartesian3.minimumComponent(cartesian)).toEqual(cartesian.z);
    });

    it('minimumByComponent', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(1.0, 0.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(1.0, 0.0, 0.0);
        second = new Cartesian3(2.0, 0.0, 0.0);
        result = new Cartesian3(1.0, 0.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 0.0);
        second = new Cartesian3(1.0, -20.0, 0.0);
        result = new Cartesian3(1.0, -20.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -20.0, 0.0);
        second = new Cartesian3(1.0, -15.0, 0.0);
        result = new Cartesian3(1.0, -20.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 26.4);
        second = new Cartesian3(1.0, -20.0, 26.5);
        result = new Cartesian3(1.0, -20.0, 26.4);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 26.5);
        second = new Cartesian3(1.0, -20.0, 26.4);
        result = new Cartesian3(1.0, -20.0, 26.4);
        expect(Cartesian3.minimumByComponent(first, second, result)).toEqual(result);
    });

    it('minimumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(1.0, 0.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, first)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian3.minimumByComponent(first, second, first)).toEqual(result);
    });

    it('minimumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(1.0, 0.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, second)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian3.minimumByComponent(first, second, second)).toEqual(result);
    });

    it('minimumByComponent throws without first', function() {
        expect(function() {
            Cartesian3.minimumByComponent();
        }).toThrowDeveloperError();
    });

    it('minimumByComponent throws without second', function() {
        expect(function() {
            Cartesian3.minimumByComponent(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('minimumByComponent works when first\'s or second\'s X is lesser', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(1.0, 0.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
        second.x = 3.0;
        result.x = 2.0;
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
    });

    it('minimumByComponent works when first\'s or second\'s Y is lesser', function() {
        var first = new Cartesian3(0.0, 2.0, 0.0);
        var second = new Cartesian3(0.0, 1.0, 0.0);
        var result = new Cartesian3(0.0, 1.0, 0.0);
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
        second.y = 3.0;
        result.y = 2.0;
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
    });

    it('minimumByComponent works when first\'s or second\'s Z is lesser', function() {
        var first = new Cartesian3(0.0, 0.0, 2.0);
        var second = new Cartesian3(0.0, 0.0, 1.0);
        var result = new Cartesian3(0.0, 0.0, 1.0);
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
        second.z = 3.0;
        result.z = 2.0;
        expect(Cartesian3.minimumByComponent(first, second, new Cartesian3())).toEqual(result);
    });

    it('maximumByComponent', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(2.0, 0.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(1.0, 0.0, 0.0);
        second = new Cartesian3(2.0, 0.0, 0.0);
        result = new Cartesian3(2.0, 0.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 0.0);
        second = new Cartesian3(1.0, -20.0, 0.0);
        result = new Cartesian3(2.0, -15.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -20.0, 0.0);
        second = new Cartesian3(1.0, -15.0, 0.0);
        result = new Cartesian3(2.0, -15.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 26.4);
        second = new Cartesian3(1.0, -20.0, 26.5);
        result = new Cartesian3(2.0, -15.0, 26.5);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        first = new Cartesian3(2.0, -15.0, 26.5);
        second = new Cartesian3(1.0, -20.0, 26.4);
        result = new Cartesian3(2.0, -15.0, 26.5);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('maximumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(2.0, 0.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, first)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian3.maximumByComponent(first, second, first)).toEqual(result);
    });

    it('maximumByComponent with a result parameter that is an input parameter', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(2.0, 0.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, second)).toEqual(result);
        first.x = 1.0;
        second.x = 2.0;
        expect(Cartesian3.maximumByComponent(first, second, second)).toEqual(result);
    });

    it('maximumByComponent throws without first', function() {
        expect(function() {
            Cartesian3.maximumByComponent();
        }).toThrowDeveloperError();
    });

    it('maximumByComponent throws without second', function() {
        expect(function() {
            Cartesian3.maximumByComponent(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('maximumByComponent works when first\'s or second\'s X is greater', function() {
        var first = new Cartesian3(2.0, 0.0, 0.0);
        var second = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3(2.0, 0.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        second.x = 3.0;
        result.x = 3.0;
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('maximumByComponent works when first\'s or second\'s Y is greater', function() {
        var first = new Cartesian3(0.0, 2.0, 0.0);
        var second = new Cartesian3(0.0, 1.0, 0.0);
        var result = new Cartesian3(0.0, 2.0, 0.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        second.y = 3.0;
        result.y = 3.0;
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('maximumByComponent works when first\'s or second\'s Z is greater', function() {
        var first = new Cartesian3(0.0, 0.0, 2.0);
        var second = new Cartesian3(0.0, 0.0, 1.0);
        var result = new Cartesian3(0.0, 0.0, 2.0);
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
        second.z = 3.0;
        result.z = 3.0;
        expect(Cartesian3.maximumByComponent(first, second, result)).toEqual(result);
    });

    it('magnitudeSquared', function() {
        var cartesian = new Cartesian3(3.0, 4.0, 5.0);
        expect(Cartesian3.magnitudeSquared(cartesian)).toEqual(50.0);
    });

    it('magnitude', function() {
        var cartesian = new Cartesian3(3.0, 4.0, 5.0);
        expect(Cartesian3.magnitude(cartesian)).toEqual(Math.sqrt(50.0));
    });

    it('distance', function() {
        var distance = Cartesian3.distance(new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(2.0, 0.0, 0.0));
        expect(distance).toEqual(1.0);
    });

    it('distance throws without left', function() {
        expect(function() {
            Cartesian3.distance();
        }).toThrowDeveloperError();
    });

    it('distance throws without right', function() {
        expect(function() {
            Cartesian3.distance(Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('distanceSquared', function() {
        var distanceSquared = Cartesian3.distanceSquared(new Cartesian3(1.0, 0.0, 0.0), new Cartesian3(3.0, 0.0, 0.0));
        expect(distanceSquared).toEqual(4.0);
    });

    it('distanceSquared throws without left', function() {
        expect(function() {
            Cartesian3.distanceSquared();
        }).toThrowDeveloperError();
    });

    it('distanceSquared throws without right', function() {
        expect(function() {
            Cartesian3.distanceSquared(Cartesian3.UNIT_X);
        }).toThrowDeveloperError();
    });

    it('normalize works with a result parameter', function() {
        var cartesian = new Cartesian3(2.0, 0.0, 0.0);
        var expectedResult = new Cartesian3(1.0, 0.0, 0.0);
        var result = new Cartesian3();
        var returnedResult = Cartesian3.normalize(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('normalize works with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(2.0, 0.0, 0.0);
        var expectedResult = new Cartesian3(1.0, 0.0, 0.0);
        var returnedResult = Cartesian3.normalize(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('normalize throws with zero vector', function() {
        expect(function() {
            Cartesian3.normalize(Cartesian3.ZERO, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyComponents works with a result parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 7.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(8.0, 15.0, 42.0);
        var returnedResult = Cartesian3.multiplyComponents(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyComponents works with a result parameter that is an input parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 7.0);
        var expectedResult = new Cartesian3(8.0, 15.0, 42.0);
        var returnedResult = Cartesian3.multiplyComponents(left, right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('divideComponents works with a result parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 8.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(0.5, 0.6, 0.75);
        var returnedResult = Cartesian3.divideComponents(left, right, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideComponents works with a result parameter that is an input parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 8.0);
        var expectedResult = new Cartesian3(0.5, 0.6, 0.75);
        var returnedResult = Cartesian3.divideComponents(left, right, left);
        expect(left).toBe(returnedResult);
        expect(left).toEqual(expectedResult);
    });

    it('dot', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 7.0);
        var expectedResult = 65.0;
        var result = Cartesian3.dot(left, right);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 7.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(6.0, 8.0, 13.0);
        var returnedResult = Cartesian3.add(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('add works with a result parameter that is an input parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 6.0);
        var right = new Cartesian3(4.0, 5.0, 7.0);
        var expectedResult = new Cartesian3(6.0, 8.0, 13.0);
        var returnedResult = Cartesian3.add(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('subtract works with a result parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 4.0);
        var right = new Cartesian3(1.0, 5.0, 7.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(1.0, -2.0, -3.0);
        var returnedResult = Cartesian3.subtract(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('subtract works with this result parameter', function() {
        var left = new Cartesian3(2.0, 3.0, 4.0);
        var right = new Cartesian3(1.0, 5.0, 7.0);
        var expectedResult = new Cartesian3(1.0, -2.0, -3.0);
        var returnedResult = Cartesian3.subtract(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var result = new Cartesian3();
        var scalar = 2;
        var expectedResult = new Cartesian3(2.0, 4.0, 6.0);
        var returnedResult = Cartesian3.multiplyByScalar(cartesian, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('multiplyByScalar with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var scalar = 2;
        var expectedResult = new Cartesian3(2.0, 4.0, 6.0);
        var returnedResult = Cartesian3.multiplyByScalar(cartesian, scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var result = new Cartesian3();
        var scalar = 2;
        var expectedResult = new Cartesian3(0.5, 1.0, 1.5);
        var returnedResult = Cartesian3.divideByScalar(cartesian, scalar, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('divideByScalar with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        var scalar = 2;
        var expectedResult = new Cartesian3(0.5, 1.0, 1.5);
        var returnedResult = Cartesian3.divideByScalar(cartesian, scalar, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('negate without a result parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -5.0);
        var expectedResult = new Cartesian3(-1.0, 2.0, 5.0);
        var result = Cartesian3.negate(cartesian, new Cartesian3());
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -5.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(-1.0, 2.0, 5.0);
        var returnedResult = Cartesian3.negate(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('negate with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -5.0);
        var expectedResult = new Cartesian3(-1.0, 2.0, 5.0);
        var returnedResult = Cartesian3.negate(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('abs without a result parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -4.0);
        var expectedResult = new Cartesian3(1.0, 2.0, 4.0);
        var result = Cartesian3.abs(cartesian, new Cartesian3());
        expect(result).toEqual(expectedResult);
    });

    it('abs with a result parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -4.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(1.0, 2.0, 4.0);
        var returnedResult = Cartesian3.abs(cartesian, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('abs with a result parameter that is an input parameter', function() {
        var cartesian = new Cartesian3(1.0, -2.0, -4.0);
        var expectedResult = new Cartesian3(1.0, 2.0, 4.0);
        var returnedResult = Cartesian3.abs(cartesian, cartesian);
        expect(cartesian).toBe(returnedResult);
        expect(cartesian).toEqual(expectedResult);
    });

    it('lerp works with a result parameter', function() {
        var start = new Cartesian3(4.0, 8.0, 10.0);
        var end = new Cartesian3(8.0, 20.0, 20.0);
        var t = 0.25;
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(5.0, 11.0, 12.5);
        var returnedResult = Cartesian3.lerp(start, end, t, result);
        expect(result).toBe(returnedResult);
        expect(result).toEqual(expectedResult);
    });

    it('lerp works with a result parameter that is an input parameter', function() {
        var start = new Cartesian3(4.0, 8.0, 10.0);
        var end = new Cartesian3(8.0, 20.0, 20.0);
        var t = 0.25;
        var expectedResult = new Cartesian3(5.0, 11.0, 12.5);
        var returnedResult = Cartesian3.lerp(start, end, t, start);
        expect(start).toBe(returnedResult);
        expect(start).toEqual(expectedResult);
    });

    it('lerp extrapolate forward', function() {
        var start = new Cartesian3(4.0, 8.0, 10.0);
        var end = new Cartesian3(8.0, 20.0, 20.0);
        var t = 2.0;
        var expectedResult = new Cartesian3(12.0, 32.0, 30.0);
        var result = Cartesian3.lerp(start, end, t, new Cartesian3());
        expect(result).toEqual(expectedResult);
    });

    it('lerp extrapolate backward', function() {
        var start = new Cartesian3(4.0, 8.0, 10.0);
        var end = new Cartesian3(8.0, 20.0, 20.0);
        var t = -1.0;
        var expectedResult = new Cartesian3(0.0, -4.0, 0.0);
        var result = Cartesian3.lerp(start, end, t, new Cartesian3());
        expect(result).toEqual(expectedResult);
    });

    it('angleBetween works for right angles', function() {
        var x = Cartesian3.UNIT_X;
        var y = Cartesian3.UNIT_Y;
        expect(Cartesian3.angleBetween(x, y)).toEqual(CesiumMath.PI_OVER_TWO);
        expect(Cartesian3.angleBetween(y, x)).toEqual(CesiumMath.PI_OVER_TWO);
    });

    it('angleBetween works for acute angles', function() {
        var x = new Cartesian3(0.0, 1.0, 0.0);
        var y = new Cartesian3(1.0, 1.0, 0.0);
        expect(Cartesian3.angleBetween(x, y)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
        expect(Cartesian3.angleBetween(y, x)).toEqualEpsilon(CesiumMath.PI_OVER_FOUR, CesiumMath.EPSILON14);
    });

    it('angleBetween works for obtuse angles', function() {
        var x = new Cartesian3(0.0, 1.0, 0.0);
        var y = new Cartesian3(0.0, -1.0, -1.0);
        expect(Cartesian3.angleBetween(x, y)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
        expect(Cartesian3.angleBetween(y, x)).toEqualEpsilon(CesiumMath.PI * 3.0 / 4.0, CesiumMath.EPSILON14);
    });

    it('angleBetween works for zero angles', function() {
        var x = Cartesian3.UNIT_X;
        expect(Cartesian3.angleBetween(x, x)).toEqual(0.0);
    });

    it('most orthogonal angle is x', function() {
        var v = new Cartesian3(0.0, 1.0, 2.0);
        expect(Cartesian3.mostOrthogonalAxis(v, new Cartesian3())).toEqual(Cartesian3.UNIT_X);
    });

    it('most orthogonal angle is y', function() {
        var v = new Cartesian3(1.0, 0.0, 2.0);
        expect(Cartesian3.mostOrthogonalAxis(v, new Cartesian3())).toEqual(Cartesian3.UNIT_Y);
    });

    it('most orthogonal angle is z', function() {
        var v = new Cartesian3(1.0, 3.0, 0.0);
        expect(Cartesian3.mostOrthogonalAxis(v, new Cartesian3())).toEqual(Cartesian3.UNIT_Z);

        v = new Cartesian3(3.0, 1.0, 0.0);
        expect(Cartesian3.mostOrthogonalAxis(v, new Cartesian3())).toEqual(Cartesian3.UNIT_Z);
    });

    it('equals', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        expect(Cartesian3.equals(cartesian, new Cartesian3(1.0, 2.0, 3.0))).toEqual(true);
        expect(Cartesian3.equals(cartesian, new Cartesian3(2.0, 2.0, 3.0))).toEqual(false);
        expect(Cartesian3.equals(cartesian, new Cartesian3(2.0, 1.0, 3.0))).toEqual(false);
        expect(Cartesian3.equals(cartesian, new Cartesian3(1.0, 2.0, 4.0))).toEqual(false);
        expect(Cartesian3.equals(cartesian, undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartesian = new Cartesian3(1.0, 2.0, 3.0);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 2.0, 3.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(2.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 3.0, 3.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 2.0, 4.0), 1.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(2.0, 2.0, 3.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 3.0, 3.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(cartesian.equalsEpsilon(new Cartesian3(1.0, 2.0, 4.0), CesiumMath.EPSILON6)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

        cartesian = new Cartesian3(3000000.0, 4000000.0, 5000000.0);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.0, 4000000.0, 5000000.0), 0.0)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.2, 4000000.0, 5000000.0), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.0, 4000000.2, 5000000.0), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.0, 4000000.0, 5000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.2, 4000000.2, 5000000.2), CesiumMath.EPSILON7)).toEqual(true);
        expect(cartesian.equalsEpsilon(new Cartesian3(3000000.2, 4000000.2, 5000000.2), CesiumMath.EPSILON9)).toEqual(false);
        expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

        expect(Cartesian3.equalsEpsilon(undefined, cartesian, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartesian = new Cartesian3(1.123, 2.345, 6.789);
        expect(cartesian.toString()).toEqual('(1.123, 2.345, 6.789)');
    });

    it('cross works with a result parameter', function() {
        var left = new Cartesian3(1, 2, 5);
        var right = new Cartesian3(4, 3, 6);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(-3, 14, -5);
        var returnedResult = Cartesian3.cross(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('cross works with a result parameter that is an input parameter', function() {
        var left = new Cartesian3(1, 2, 5);
        var right = new Cartesian3(4, 3, 6);
        var expectedResult = new Cartesian3(-3, 14, -5);
        var returnedResult = Cartesian3.cross(left, right, left);
        expect(returnedResult).toBe(left);
        expect(left).toEqual(expectedResult);
    });

    it('midpoint works with a result parameter', function() {
        var left = new Cartesian3(0.0, 0.0, 6.0);
        var right = new Cartesian3(0.0, 0.0, -6.0);
        var result = new Cartesian3();
        var expectedResult = new Cartesian3(0.0, 0.0, 0.0);
        var returnedResult = Cartesian3.midpoint(left, right, result);
        expect(returnedResult).toBe(result);
        expect(result).toEqual(expectedResult);
    });

    it('midpoint throws with no left', function() {
        expect(function() {
            return Cartesian3.midpoint(undefined, new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('midpoint throws with no right', function() {
        expect(function() {
            return Cartesian3.midpoint(new Cartesian3(), undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('midpoint throws with no result', function() {
        expect(function() {
            return Cartesian3.midpoint(new Cartesian3(), new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('fromSpherical throws with no spherical parameter', function() {
        expect(function() {
            Cartesian3.fromSpherical(undefined);
        }).toThrowDeveloperError();
    });

    it('fromSpherical work with no result parameter', function() {
        expect(function() {
            Cartesian3.fromSpherical({
                    clock : sixtyDegrees,
                    cone : (fortyFiveDegrees + Math.PI / 2.0),
                    magnitude : Math.sqrt(8.0)
            });
        }).not.toThrowDeveloperError();
    });

    it('clone returns undefined with no parameter', function() {
        expect(Cartesian3.clone()).toBeUndefined();
    });

    it('maximumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian3.maximumComponent();
        }).toThrowDeveloperError();
    });

    it('minimumComponent throws with no parameter', function() {
        expect(function() {
            Cartesian3.minimumComponent();
        }).toThrowDeveloperError();
    });

    it('magnitudeSquared throws with no parameter', function() {
        expect(function() {
            Cartesian3.magnitudeSquared();
        }).toThrowDeveloperError();
    });

    it('magnitude throws with no parameter', function() {
        expect(function() {
            Cartesian3.magnitude();
        }).toThrowDeveloperError();
    });

    it('normalize throws with no parameter', function() {
        expect(function() {
            Cartesian3.normalize();
        }).toThrowDeveloperError();
    });

    it('dot throws with no left parameter', function() {
        expect(function() {
            Cartesian3.dot(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throw with no left parameter', function() {
        var right = new Cartesian3(4.0, 5.0, 6.0);
        expect(function() {
            Cartesian3.multiplyComponents(undefined, right);
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throw with no right parameter', function() {
        var left = new Cartesian3(4.0, 5.0, 6.0);
        expect(function() {
            Cartesian3.multiplyComponents(left, undefined);
        }).toThrowDeveloperError();
    });

    it('divideComponents throw with no left parameter', function() {
        var right = new Cartesian3(4.0, 5.0, 6.0);
        expect(function() {
            Cartesian3.divideComponents(undefined, right);
        }).toThrowDeveloperError();
    });

    it('divideComponents throw with no right parameter', function() {
        var left = new Cartesian3(4.0, 5.0, 6.0);
        expect(function() {
            Cartesian3.divideComponents(left, undefined);
        }).toThrowDeveloperError();
    });

    it('dot throws with no right parameter', function() {
        expect(function() {
            Cartesian3.dot(new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('add throws with no left parameter', function() {
        expect(function() {
            Cartesian3.add(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('add throws with no right parameter', function() {
        expect(function() {
            Cartesian3.add(new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('subtract throws with no left parameter', function() {
        expect(function() {
            Cartesian3.subtract(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('subtract throws with no right parameter', function() {
        expect(function() {
            Cartesian3.subtract(new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian3.multiplyByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian3.multiplyByScalar(new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian3.divideByScalar(undefined, 2.0);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no scalar parameter', function() {
        expect(function() {
            Cartesian3.divideByScalar(new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('negate throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian3.negate(undefined);
        }).toThrowDeveloperError();
    });

    it('abs throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian3.abs(undefined);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no start parameter', function() {
        var end = new Cartesian3(8.0, 20.0, 6.0);
        var t = 0.25;
        expect(function() {
            Cartesian3.lerp(undefined, end, t);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no end parameter', function() {
        var start = new Cartesian3(4.0, 8.0, 6.0);
        var t = 0.25;
        expect(function() {
            Cartesian3.lerp(start, undefined, t);
        }).toThrowDeveloperError();
    });

    it('lerp throws with no t parameter', function() {
        var start = new Cartesian3(4.0, 8.0, 6.0);
        var end = new Cartesian3(8.0, 20.0, 6.0);
        expect(function() {
            Cartesian3.lerp(start, end, undefined);
        }).toThrowDeveloperError();
    });

    it('angleBetween throws with no left parameter', function() {
        var right = new Cartesian3(8.0, 20.0, 6.0);
        expect(function() {
            Cartesian3.angleBetween(undefined, right);
        }).toThrowDeveloperError();
    });

    it('angleBetween throws with no right parameter', function() {
        var left = new Cartesian3(4.0, 8.0, 6.0);
        expect(function() {
            Cartesian3.angleBetween(left, undefined);
        }).toThrowDeveloperError();
    });

    it('mostOrthogonalAxis throws with no cartesian parameter', function() {
        expect(function() {
            Cartesian3.mostOrthogonalAxis(undefined);
        }).toThrowDeveloperError();
    });

    it('equalsEpsilon throws with no epsilon', function() {
        expect(function() {
            Cartesian3.equalsEpsilon(new Cartesian3(), new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('cross throw with no left paramater', function() {
        var right = new Cartesian3(4, 3, 6);
        expect(function() {
            Cartesian3.cross(undefined, right);
        }).toThrowDeveloperError();
    });

    it('cross throw with no left paramater', function() {
        var left = new Cartesian3(1, 2, 5);
        expect(function() {
            Cartesian3.cross(left, undefined);
        }).toThrowDeveloperError();
    });

    it('fromElements returns a cartesian3 with corrrect coordinates', function(){
        var cartesian = Cartesian3.fromElements(2, 2, 4);
        var expectedResult = new Cartesian3(2, 2, 4);
        expect(cartesian).toEqual(expectedResult);
    });

    it('fromElements result param returns cartesian3 with correct coordinates', function(){
        var cartesian3 = new Cartesian3();
        Cartesian3.fromElements(2, 2, 4, cartesian3);
        var expectedResult = new Cartesian3(2, 2, 4);
        expect(cartesian3).toEqual(expectedResult);
    });

    it('fromDegrees', function(){
        var lon = -115;
        var lat = 37;
        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromDegrees(lon, lat);
        var expected = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(lon, lat));
        expect(actual).toEqual(expected);
    });

    it('fromDegrees with height', function(){
        var lon = -115;
        var lat = 37;
        var height = 100000;
        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromDegrees(lon, lat, height);
        var expected = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(lon, lat, height));
        expect(actual).toEqual(expected);
    });

    it('fromDegrees with result', function(){
        var lon = -115;
        var lat = 37;
        var height = 100000;
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartesian3();
        var actual = Cartesian3.fromDegrees(lon, lat, height, ellipsoid, result);
        var expected = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(lon, lat, height));
        expect(actual).toEqual(expected);
        expect(actual).toBe(result);
    });

    it('fromDegrees throws with no longitude', function() {
        expect(function() {
            Cartesian3.fromDegrees();
        }).toThrowDeveloperError();
    });

    it('fromDegrees throws with no latitude', function() {
        expect(function() {
            Cartesian3.fromDegrees(1);
        }).toThrowDeveloperError();
    });

    it('fromRadians', function(){
        var lon = CesiumMath.toRadians(150);
        var lat = CesiumMath.toRadians(-40);
        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromRadians(lon, lat);
        var expected = ellipsoid.cartographicToCartesian(new Cartographic(lon, lat));
        expect(actual).toEqual(expected);
    });

    it('fromRadians with height', function(){
        var lon = CesiumMath.toRadians(150);
        var lat = CesiumMath.toRadians(-40);
        var height = 100000;
        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromRadians(lon, lat, height);
        var expected = ellipsoid.cartographicToCartesian(new Cartographic(lon, lat, height));
        expect(actual).toEqual(expected);
    });

    it('fromRadians with result', function(){
        var lon = CesiumMath.toRadians(150);
        var lat = CesiumMath.toRadians(-40);
        var height = 100000;
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartesian3();
        var actual = Cartesian3.fromRadians(lon, lat, height, ellipsoid, result);
        var expected = ellipsoid.cartographicToCartesian(new Cartographic(lon, lat, height));
        expect(actual).toEqual(expected);
        expect(actual).toBe(result);
    });

    it('fromRadians throws with no longitude', function() {
        expect(function() {
            Cartesian3.fromRadians();
        }).toThrowDeveloperError();
    });

    it('fromRadians throws with no latitude', function() {
        expect(function() {
            Cartesian3.fromRadians(1);
        }).toThrowDeveloperError();
    });

    it('fromDegreesArray', function(){
        var lon1 = 90;
        var lat1 = -70;
        var lon2 = -100;
        var lat2 = 40;

        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromDegreesArray([lon1, lat1, lon2, lat2]);
        var expected = ellipsoid.cartographicArrayToCartesianArray([Cartographic.fromDegrees(lon1, lat1), Cartographic.fromDegrees(lon2, lat2)]);
        expect(actual).toEqual(expected);
    });

    it('fromDegreesArray throws with no positions', function() {
        expect(function() {
            Cartesian3.fromDegreesArray();
        }).toThrowDeveloperError();
    });

    it('fromDegreesArray throws with positions length < 2', function() {
        expect(function() {
            Cartesian3.fromDegreesArray([]);
        }).toThrowDeveloperError();
    });

    it('fromDegreesArray throws with positions length not multiple of 2', function() {
        expect(function() {
            Cartesian3.fromDegreesArray([1, 3, 5]);
        }).toThrowDeveloperError();
    });

    it('fromRadiansArray', function(){
        var lon1 = CesiumMath.toRadians(90);
        var lat1 = CesiumMath.toRadians(-70);
        var lon2 = CesiumMath.toRadians(-100);
        var lat2 = CesiumMath.toRadians(40);

        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromRadiansArray([lon1, lat1, lon2, lat2]);
        var expected = ellipsoid.cartographicArrayToCartesianArray([new Cartographic(lon1, lat1), new Cartographic(lon2, lat2)]);
        expect(actual).toEqual(expected);
    });

    it('fromRadiansArray with result', function(){
        var lon1 = CesiumMath.toRadians(90);
        var lat1 = CesiumMath.toRadians(-70);
        var lon2 = CesiumMath.toRadians(-100);
        var lat2 = CesiumMath.toRadians(40);

        var ellipsoid = Ellipsoid.WGS84;
        var result = [new Cartesian3(), new Cartesian3()];
        var actual = Cartesian3.fromRadiansArray([lon1, lat1, lon2, lat2], ellipsoid, result);
        var expected = ellipsoid.cartographicArrayToCartesianArray([new Cartographic(lon1, lat1), new Cartographic(lon2, lat2)]);
        expect(result).toEqual(expected);
        expect(actual).toBe(result);
    });

    it('fromRadiansArray throws with no positions', function() {
        expect(function() {
            Cartesian3.fromRadiansArray();
        }).toThrowDeveloperError();
    });

    it('fromRadiansArray throws with positions length < 2', function() {
        expect(function() {
            Cartesian3.fromRadiansArray([]);
        }).toThrowDeveloperError();
    });

    it('fromRadiansArray throws with positions length not multiple of 2', function() {
        expect(function() {
            Cartesian3.fromRadiansArray([1, 3, 5]);
        }).toThrowDeveloperError();
    });

    it('fromDegreesArrayHeights', function(){
        var lon1 = 90;
        var lat1 = -70;
        var alt1 = 200000;
        var lon2 = -100;
        var lat2 = 40;
        var alt2 = 100000;

        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromDegreesArrayHeights([lon1, lat1, alt1, lon2, lat2, alt2]);
        var expected = ellipsoid.cartographicArrayToCartesianArray([Cartographic.fromDegrees(lon1, lat1, alt1), Cartographic.fromDegrees(lon2, lat2, alt2)]);
        expect(actual).toEqual(expected);
    });

    it('fromDegreesArrayHeights throws with no positions', function() {
        expect(function() {
            Cartesian3.fromDegreesArrayHeights();
        }).toThrowDeveloperError();
    });

    it('fromDegreesArrayHeights throws with positions length < 3', function() {
        expect(function() {
            Cartesian3.fromDegreesArrayHeights([]);
        }).toThrowDeveloperError();
    });

    it('fromDegreesArrayHeights throws with positions length not multiple of 3', function() {
        expect(function() {
            Cartesian3.fromDegreesArrayHeights([1, 3, 5, 2]);
        }).toThrowDeveloperError();
    });

    it('fromRadiansArrayHeights', function(){
        var lon1 = CesiumMath.toRadians(90);
        var lat1 = CesiumMath.toRadians(-70);
        var alt1 = 200000;
        var lon2 = CesiumMath.toRadians(-100);
        var lat2 = CesiumMath.toRadians(40);
        var alt2 = 100000;

        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartesian3.fromRadiansArrayHeights([lon1, lat1, alt1, lon2, lat2, alt2]);
        var expected = ellipsoid.cartographicArrayToCartesianArray([new Cartographic(lon1, lat1, alt1), new Cartographic(lon2, lat2, alt2)]);
        expect(actual).toEqual(expected);
    });

    it('fromRadiansArrayHeights with result', function(){
        var lon1 = CesiumMath.toRadians(90);
        var lat1 = CesiumMath.toRadians(-70);
        var alt1 = 200000;
        var lon2 = CesiumMath.toRadians(-100);
        var lat2 = CesiumMath.toRadians(40);
        var alt2 = 100000;

        var ellipsoid = Ellipsoid.WGS84;
        var result = [new Cartesian3(), new Cartesian3()];
        var actual = Cartesian3.fromRadiansArrayHeights([lon1, lat1, alt1, lon2, lat2, alt2], ellipsoid, result);
        var expected = ellipsoid.cartographicArrayToCartesianArray([new Cartographic(lon1, lat1, alt1), new Cartographic(lon2, lat2, alt2)]);
        expect(result).toEqual(expected);
        expect(actual).toBe(result);
    });

    it('fromRadiansArrayHeights throws with no positions', function() {
        expect(function() {
            Cartesian3.fromRadiansArrayHeights();
        }).toThrowDeveloperError();
    });

    it('fromRadiansArrayHeights throws with positions length < 3', function() {
        expect(function() {
            Cartesian3.fromRadiansArrayHeights([]);
        }).toThrowDeveloperError();
    });

    it('fromRadiansArrayHeights throws with positions length not multiple of 3', function() {
        expect(function() {
            Cartesian3.fromRadiansArrayHeights([1, 3, 5, 2]);
        }).toThrowDeveloperError();
    });

    it('minimumByComponent throws with no result', function() {
        expect(function() {
            Cartesian3.minimumByComponent(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('maximumByComponent throws with no result', function() {
        expect(function() {
            Cartesian3.maximumByComponent(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('normalize throws with no result', function() {
        expect(function() {
            Cartesian3.normalize(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyComponents throws with no result', function() {
        expect(function() {
            Cartesian3.multiplyComponents(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('divideComponents throws with no result', function() {
        expect(function() {
            Cartesian3.divideComponents(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('add throws with no result', function() {
        expect(function() {
            Cartesian3.add(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('subtract throws with no result', function() {
        expect(function() {
            Cartesian3.subtract(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('multiplyByScalar throws with no result', function() {
        expect(function() {
            Cartesian3.multiplyByScalar(new Cartesian3(), 5);
        }).toThrowDeveloperError();
    });

    it('divideByScalar throws with no result', function() {
        expect(function() {
            Cartesian3.divideByScalar(new Cartesian3(), 5);
        }).toThrowDeveloperError();
    });

    it('negate throws with no result', function() {
        expect(function() {
            Cartesian3.negate(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('abs throws with no result', function() {
        expect(function() {
            Cartesian3.abs(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('cross throws with no result', function() {
        expect(function() {
            Cartesian3.cross(new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('lerp throws with no result', function() {
        expect(function() {
            Cartesian3.lerp(new Cartesian3(), new Cartesian3(), 10);
        }).toThrowDeveloperError();
    });

    it('mostOrthogonalAxis throws with no result', function() {
        expect(function() {
            Cartesian3.mostOrthogonalAxis(new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('projects vector a onto vector b', function() {
        var a = new Cartesian3(0.0, 1.0, 0.0);
        var b = new Cartesian3(1.0, 0.0, 0.0);
        var result = Cartesian3.projectVector(a, b, new Cartesian3());
        expect(result).toEqual(new Cartesian3(0.0, 0.0, 0.0));

        a = new Cartesian3(1.0, 1.0, 0.0);
        b = new Cartesian3(1.0, 0.0, 0.0);
        result = Cartesian3.projectVector(a, b, new Cartesian3());
        expect(result).toEqual(new Cartesian3(1.0, 0.0, 0.0));
    });

    it('projectVector throws when missing parameters', function() {
        expect(function() {
            return Cartesian3.projectVector(undefined, new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
        expect(function() {
            return Cartesian3.projectVector(new Cartesian3(), undefined, new Cartesian3());
        }).toThrowDeveloperError();
        expect(function() {
            return Cartesian3.projectVector(new Cartesian3(), new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    createPackableSpecs(Cartesian3, new Cartesian3(1, 2, 3), [1, 2, 3]);
    createPackableArraySpecs(Cartesian3, [new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6)], [1, 2, 3, 4, 5, 6]);
});
