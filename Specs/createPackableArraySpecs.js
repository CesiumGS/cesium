define([
        'Core/defaultValue'
    ], function(
        defaultValue) {
    'use strict';

    function createPackableArraySpecs(packable, unpackedArray, packedArray, namePrefix) {
        namePrefix = defaultValue(namePrefix, '');

        it(namePrefix + ' can pack', function() {
            var actualPackedArray = packable.packArray(unpackedArray);
            expect(actualPackedArray.length).toEqual(packedArray.length);
            expect(actualPackedArray).toEqual(packedArray);
        });

        it(namePrefix + ' can roundtrip', function() {
            var actualPackedArray = packable.packArray(unpackedArray);
            var result = packable.unpackArray(actualPackedArray);
            expect(result).toEqual(unpackedArray);
        });

        it(namePrefix + ' can unpack', function() {
            var result = packable.unpackArray(packedArray);
            expect(result).toEqual(unpackedArray);
        });

        it(namePrefix + ' packArray throws with undefined array', function() {
            expect(function() {
                packable.packArray(undefined);
            }).toThrowDeveloperError();
        });

        it(namePrefix + ' unpackArray throws with undefined array', function() {
            expect(function() {
                packable.unpackArray(undefined);
            }).toThrowDeveloperError();
        });
    }

    return createPackableArraySpecs;
});
