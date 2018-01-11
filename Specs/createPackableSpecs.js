define([
        'Core/defaultValue',
        'Core/defined',
        'Core/Math'
    ], function(
        defaultValue,
        defined,
        CesiumMath) {
    'use strict';

    function createPackableSpecs(packable, instance, packedInstance, namePrefix) {
        namePrefix = defaultValue(namePrefix, '');

        it(namePrefix + ' can pack', function() {
            var packedArray = [];
            var returnArray = packable.pack(instance, packedArray);
            expect(returnArray).toBe(packedArray);
            var packedLength = defined(packable.packedLength) ? packable.packedLength : instance.packedLength;
            expect(packedArray.length).toEqual(packedLength);
            expect(packedArray).toEqualEpsilon(packedInstance, CesiumMath.EPSILON15);
        });

        it(namePrefix + ' can roundtrip', function() {
            var packedArray = [];
            packable.pack(instance, packedArray);
            var result = packable.unpack(packedArray);
            expect(instance).toEqual(result);
        });

        it(namePrefix + ' can unpack', function() {
            var result = packable.unpack(packedInstance);
            expect(result).toEqual(instance);
        });

        it(namePrefix + ' can pack with startingIndex', function() {
            var packedArray = [0];
            var expected = packedArray.concat(packedInstance);
            packable.pack(instance, packedArray, 1);
            expect(packedArray).toEqualEpsilon(expected, CesiumMath.EPSILON15);
        });

        it(namePrefix + ' can unpack with startingIndex', function() {
            var packedArray = [0].concat(packedInstance);
            var result = packable.unpack(packedArray, 1);
            expect(instance).toEqual(result);
        });

        it(namePrefix + ' pack throws with undefined value', function() {
            var array = [];
            expect(function() {
                packable.pack(undefined, array);
            }).toThrowDeveloperError();
        });

        it(namePrefix + ' pack throws with undefined array', function() {
            expect(function() {
                packable.pack(instance, undefined);
            }).toThrowDeveloperError();
        });

        it(namePrefix + ' unpack throws with undefined array', function() {
            expect(function() {
                packable.unpack(undefined);
            }).toThrowDeveloperError();
        });

        if (typeof packable.convertPackedArrayForInterpolation === 'function') {
            it(namePrefix + ' packs and unpacks for interpolation.', function() {
                var packedForInterpolation = [];
                packable.convertPackedArrayForInterpolation(packedInstance, 0, 0, packedForInterpolation);
                var value = packable.unpackInterpolationResult(packedForInterpolation, packedInstance, 0, 0);
                var result = packable.unpack(packedInstance);
                expect(value).toEqual(result);
            });

            it(namePrefix + ' convertPackedArrayForInterpolation throws without array.', function(){
                expect(function() {
                    packable.convertPackedArrayForInterpolation(undefined);
                }).toThrowDeveloperError();
            });

            it(namePrefix + ' unpackInterpolationResult throws without packed array.', function(){
                expect(function() {
                    packable.unpackInterpolationResult(undefined, []);
                }).toThrowDeveloperError();
            });

            it(namePrefix + ' unpackInterpolationResult throws without source array.', function(){
                expect(function() {
                    packable.unpackInterpolationResult([], undefined);
                }).toThrowDeveloperError();
            });
        }
    }

    return createPackableSpecs;
});
