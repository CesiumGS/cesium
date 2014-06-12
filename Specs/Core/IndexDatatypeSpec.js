/*global defineSuite*/
defineSuite([
        'Core/IndexDatatype',
        'Core/Math'
    ], function(
        IndexDatatype,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('IndexDatatype.validate validates input', function() {
        expect(IndexDatatype.validate(IndexDatatype.UNSIGNED_SHORT)).toEqual(true);
        expect(IndexDatatype.validate('invalid')).toEqual(false);
        expect(IndexDatatype.validate(undefined)).toEqual(false);
    });

    it('IndexDatatype.createTypedArray creates array', function() {
        expect(IndexDatatype.createTypedArray(3, 3).BYTES_PER_ELEMENT).toEqual(Uint16Array.BYTES_PER_ELEMENT);
        expect(IndexDatatype.createTypedArray(CesiumMath.SIXTY_FOUR_KILOBYTES + 1, 3).BYTES_PER_ELEMENT).toEqual(Uint32Array.BYTES_PER_ELEMENT);
    });

    it('IndexDatatype.createTypedArray thorws without numberOfVertices', function() {
        expect(function() {
            IndexDatatype.createTypedArray(undefined);
        }).toThrowDeveloperError();
    });

    it('IndexDatatype.getSizeInBytes returns size', function() {
        expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_BYTE)).toEqual(Uint8Array.BYTES_PER_ELEMENT);
        expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_SHORT)).toEqual(Uint16Array.BYTES_PER_ELEMENT);
        expect(IndexDatatype.getSizeInBytes(IndexDatatype.UNSIGNED_INT)).toEqual(Uint32Array.BYTES_PER_ELEMENT);
    });

    it('IndexDatatype.getSizeInBytes throws without indexDatatype', function() {
        expect(function() {
            IndexDatatype.getSizeInBytes(undefined);
        }).toThrowDeveloperError();
    });
});
