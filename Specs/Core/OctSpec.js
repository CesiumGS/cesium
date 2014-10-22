/*global defineSuite*/
defineSuite([
        'Core/Oct',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Math'
    ], function(
        Oct,
        Cartesian2,
        Cartesian3,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
    it('oct decode(0, 0)', function() {
        var result = new Cartesian3();
        Oct.decode(0, 0, result);
        expect(result).toEqual(negativeUnitZ);
    });

    it('oct encode(0, 0, -1)', function() {
        var result = new Cartesian2();
        Oct.encode(negativeUnitZ, result);
        expect(result).toEqual(new Cartesian2(255, 255));
    });

    it('oct encode(0, 0, 1)', function() {
        var result = new Cartesian2();
        Oct.encode(Cartesian3.UNIT_Z, result);
        expect(result).toEqual(new Cartesian2(128, 128));
    });

    it('oct extents are equal', function() {
        var result = new Cartesian3();
        // lower left
        Oct.decode(0, 0, result);
        expect(result).toEqual(negativeUnitZ);
        // lower right
        Oct.decode(255, 0, result);
        expect(result).toEqual(negativeUnitZ);
        // upper right
        Oct.decode(255, 255, result);
        expect(result).toEqual(negativeUnitZ);
        // upper left
        Oct.decode(255, 0, result);
        expect(result).toEqual(negativeUnitZ);
    });

    it('throws oct encode vector undefined', function() {
        var vector;
        var result = new Cartesian3();
        expect(function() {
            Oct.encode(vector, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode result undefined', function() {
        var result;
        expect(function() {
            Oct.encode(Cartesian3.UNIT_Z, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode non unit vector', function() {
        var nonUnitLengthVector = new Cartesian3(2.0, 0.0, 0.0);
        var result = new Cartesian2();
        expect(function() {
            Oct.encode(nonUnitLengthVector, result);
        }).toThrowDeveloperError();
    });

    it('throws oct encode zero length vector', function() {
        var result = new Cartesian2();
        expect(function() {
            Oct.encode(Cartesian3.ZERO, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode result undefined', function() {
        var result;
        expect(function() {
            Oct.decode(Cartesian2.ZERO, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode x out of bounds', function() {
        var result = new Cartesian3();
        var invalidSNorm = new Cartesian2(256, 0);
        expect(function() {
            Oct.decode(invalidSNorm, result);
        }).toThrowDeveloperError();
    });

    it('throws oct decode y out of bounds', function() {
        var result = new Cartesian3();
        var invalidSNorm = new Cartesian2(0, 256);
        expect(function() {
            Oct.decode(invalidSNorm, result);
        }).toThrowDeveloperError();
    });

    it('oct encoding', function() {
        var epsilon = CesiumMath.EPSILON1;

        var encoded = new Cartesian2();
        var result = new Cartesian3();
        var normal = new Cartesian3(0.0, 0.0, 1.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, 0.0, -1.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, 1.0, 0.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, -1.0, 0.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 0.0, 0.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 0.0, 0.0);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        expect(Oct.decode(encoded.x, encoded.y, result)).toEqualEpsilon(normal, epsilon);
    });

    it('octFloat encoding', function() {
        var epsilon = CesiumMath.EPSILON1;

        var result = new Cartesian3();
        var normal = new Cartesian3(0.0, 0.0, 1.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, 0.0, -1.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, 1.0, 0.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(0.0, -1.0, 0.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 0.0, 0.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 0.0, 0.0);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);

        normal = new Cartesian3(-1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        expect(Oct.decodeFloat(Oct.encodeFloat(normal), result)).toEqualEpsilon(normal, epsilon);
    });

    it('octFloat encoding is equivalent to oct encoding', function() {
        var encoded = new Cartesian2();
        var result1 = new Cartesian3();
        var result2 = new Cartesian3();

        var normal = new Cartesian3(0.0, 0.0, 1.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(0.0, 0.0, -1.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(0.0, 1.0, 0.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(0.0, -1.0, 0.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(1.0, 0.0, 0.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(-1.0, 0.0, 0.0);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(-1.0, -1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(-1.0, 1.0, 1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(-1.0, 1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);

        normal = new Cartesian3(-1.0, -1.0, -1.0);
        Cartesian3.normalize(normal, normal);
        Oct.encode(normal, encoded);
        Oct.decode(encoded.x, encoded.y, result1);
        Oct.decodeFloat(Oct.encodeFloat(normal), result2);
        expect(result1).toEqual(result2);
    });

    it('encodeFloat throws without vector', function() {
        expect(function() {
            Oct.encodeFloat(undefined);
        }).toThrowDeveloperError();
    });

    it('decodeFloat throws without value', function() {
        expect(function() {
            Oct.decodeFloat(undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('decodeFloat throws without result', function() {
        expect(function() {
            Oct.decodeFloat(0.0, undefined);
        }).toThrowDeveloperError();
    });

    it('pack is equivalent to oct encoding', function() {
        var x = Cartesian3.UNIT_X;
        var y = Cartesian3.UNIT_Y;
        var z = Cartesian3.UNIT_Z;

        var packed = Oct.pack(x, y, z, new Cartesian2());
        var decodedX = new Cartesian3();
        var decodedY = new Cartesian3();
        var decodedZ = new Cartesian3();
        Oct.unpack(packed, decodedX, decodedY, decodedZ);

        expect(decodedX).toEqual(Oct.decodeFloat(Oct.encodeFloat(x), new Cartesian3()));
        expect(decodedY).toEqual(Oct.decodeFloat(Oct.encodeFloat(y), new Cartesian3()));
        expect(decodedZ).toEqual(Oct.decodeFloat(Oct.encodeFloat(z), new Cartesian3()));
    });

    it('pack throws without v1', function() {
        expect(function() {
            Oct.pack(undefined, new Cartesian3(), new Cartesian3(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('pack throws without v2', function() {
        expect(function() {
            Oct.pack(new Cartesian3(), undefined, new Cartesian3(), new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('pack throws without v3', function() {
        expect(function() {
            Oct.pack(new Cartesian3(), new Cartesian3(), undefined, new Cartesian2());
        }).toThrowDeveloperError();
    });

    it('pack throws without result', function() {
        expect(function() {
            Oct.pack(new Cartesian3(), new Cartesian3(), new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });

    it('unpack throws without packed', function() {
        expect(function() {
            Oct.unpack(undefined, new Cartesian3(), new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('unpack throws without v1', function() {
        expect(function() {
            Oct.unpack(new Cartesian2(), undefined, new Cartesian3(), new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('unpack throws without v2', function() {
        expect(function() {
            Oct.unpack(new Cartesian2(), new Cartesian3(), undefined, new Cartesian3());
        }).toThrowDeveloperError();
    });

    it('unpack throws without v3', function() {
        expect(function() {
            Oct.unpack(new Cartesian2(), new Cartesian3(), new Cartesian3(), undefined);
        }).toThrowDeveloperError();
    });
});
