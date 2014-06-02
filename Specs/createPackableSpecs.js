/*global define*/
define(function() {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function createPackableSpecs(packable, instance, packedInstance) {
        it('can pack', function() {
            var packedArray = [];
            packable.pack(instance, packedArray);
            expect(packedArray.length).toEqual(packable.packedLength);
            expect(packedArray).toEqual(packedInstance);
        });

        it('can unpack', function() {
            var result = packable.unpack(packedInstance);
            expect(result).toEqual(instance);
        });

        it('can pack with startingIndex', function() {
            var packedArray = [0];
            var expected = packedArray.concat(packedInstance);
            packable.pack(instance, packedArray, 1);
            expect(packedArray).toEqual(expected);
        });

        it('can unpack with startingIndex', function() {
            var packedArray = [0].concat(packedInstance);
            var result = packable.unpack(packedArray, 1);
            expect(instance).toEqual(result);
        });

        it('pack throws with undefined value', function() {
            var array = [];
            expect(function() {
                packable.pack(undefined, array);
            }).toThrowDeveloperError();
        });

        it('pack throws with undefined array', function() {
            expect(function() {
                packable.pack(instance, undefined);
            }).toThrowDeveloperError();
        });

        it('unpack throws with undefined array', function() {
            expect(function() {
                packable.unpack(undefined);
            }).toThrowDeveloperError();
        });
    }

    return createPackableSpecs;
});
