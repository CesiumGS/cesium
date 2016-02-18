/*global defineSuite*/
defineSuite([
        'Core/ComponentDatatype'
    ], function(
        ComponentDatatype) {
    'use strict';

    it('fromTypedArray works', function() {
        expect(ComponentDatatype.fromTypedArray(new Int8Array())).toBe(ComponentDatatype.BYTE);
        expect(ComponentDatatype.fromTypedArray(new Uint8Array())).toBe(ComponentDatatype.UNSIGNED_BYTE);
        expect(ComponentDatatype.fromTypedArray(new Int16Array())).toBe(ComponentDatatype.SHORT);
        expect(ComponentDatatype.fromTypedArray(new Uint16Array())).toBe(ComponentDatatype.UNSIGNED_SHORT);
        expect(ComponentDatatype.fromTypedArray(new Float32Array())).toBe(ComponentDatatype.FLOAT);
        expect(ComponentDatatype.fromTypedArray(new Float64Array())).toBe(ComponentDatatype.DOUBLE);
    });

    it('validate works', function() {
        expect(ComponentDatatype.validate(ComponentDatatype.BYTE)).toBe(true);
        expect(ComponentDatatype.validate(ComponentDatatype.UNSIGNED_BYTE)).toBe(true);
        expect(ComponentDatatype.validate(ComponentDatatype.SHORT)).toBe(true);
        expect(ComponentDatatype.validate(ComponentDatatype.UNSIGNED_SHORT)).toBe(true);
        expect(ComponentDatatype.validate(ComponentDatatype.FLOAT)).toBe(true);
        expect(ComponentDatatype.validate(ComponentDatatype.DOUBLE)).toBe(true);
        expect(ComponentDatatype.validate(undefined)).toBe(false);
        expect(ComponentDatatype.validate({})).toBe(false);
    });

    it('createTypedArray works with size', function() {
        var typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.BYTE, 0);
        expect(typedArray).toBeInstanceOf(Int8Array);
        expect(typedArray.length).toBe(0);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_BYTE, 1);
        expect(typedArray).toBeInstanceOf(Uint8Array);
        expect(typedArray.length).toBe(1);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.SHORT, 2);
        expect(typedArray).toBeInstanceOf(Int16Array);
        expect(typedArray.length).toBe(2);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_SHORT, 3);
        expect(typedArray).toBeInstanceOf(Uint16Array);
        expect(typedArray.length).toBe(3);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, 6);
        expect(typedArray).toBeInstanceOf(Float32Array);
        expect(typedArray.length).toBe(6);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.DOUBLE, 7);
        expect(typedArray).toBeInstanceOf(Float64Array);
        expect(typedArray.length).toBe(7);
    });

    it('createTypedArray works with values', function() {
        var values = [34, 12, 4, 1];
        var typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.BYTE, values);
        expect(typedArray).toBeInstanceOf(Int8Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_BYTE, values);
        expect(typedArray).toBeInstanceOf(Uint8Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.SHORT, values);
        expect(typedArray).toBeInstanceOf(Int16Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.UNSIGNED_SHORT, values);
        expect(typedArray).toBeInstanceOf(Uint16Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, values);
        expect(typedArray).toBeInstanceOf(Float32Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);

        typedArray = ComponentDatatype.createTypedArray(ComponentDatatype.DOUBLE, values);
        expect(typedArray).toBeInstanceOf(Float64Array);
        expect(typedArray).toEqual(values);
        expect(typedArray.length).toBe(values.length);
    });

    it('createArrayBufferView works', function() {
        var buffer = new ArrayBuffer(100);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.BYTE, buffer, 0, 1)).toBeInstanceOf(Int8Array);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.UNSIGNED_BYTE, buffer, 0, 1)).toBeInstanceOf(Uint8Array);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.SHORT, buffer, 0, 1)).toBeInstanceOf(Int16Array);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.UNSIGNED_SHORT, buffer, 0, 1)).toBeInstanceOf(Uint16Array);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.FLOAT, buffer, 0, 1)).toBeInstanceOf(Float32Array);
        expect(ComponentDatatype.createArrayBufferView(ComponentDatatype.DOUBLE, buffer, 0, 1)).toBeInstanceOf(Float64Array);
    });

    it('createTypedArray throws without type', function() {
        expect(function() {
            ComponentDatatype.createTypedArray(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('createTypedArray throws without length or values', function() {
        expect(function() {
            ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, undefined);
        }).toThrowDeveloperError();
    });

    it('createArrayBufferView throws without type', function() {
        var buffer = new ArrayBuffer(100);
        expect(function() {
            ComponentDatatype.createTypedArray(undefined, buffer, 0, 1);
        }).toThrowDeveloperError();
    });

    it('createArrayBufferView throws with invalid type', function() {
        var buffer = new ArrayBuffer(100);
        expect(function() {
            ComponentDatatype.createTypedArray({}, buffer, 0, 1);
        }).toThrowDeveloperError();
    });

    it('createArrayBufferView throws without buffer', function() {
        expect(function() {
            ComponentDatatype.createTypedArray(ComponentDatatype.BYTE, undefined, 0, 1);
        }).toThrowDeveloperError();
    });
});
