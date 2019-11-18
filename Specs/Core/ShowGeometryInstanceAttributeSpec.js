import { ComponentDatatype } from '../../Source/Cesium.js';
import { ShowGeometryInstanceAttribute } from '../../Source/Cesium.js';

describe('Core/ShowGeometryInstanceAttribute', function() {

    it('constructor', function() {
        var attribute = new ShowGeometryInstanceAttribute(false);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(attribute.componentsPerAttribute).toEqual(1);
        expect(attribute.normalize).toEqual(false);

        expect(attribute.value).toEqual(new Uint8Array([false]));
    });

    it('toValue', function() {
        var expectedResult = new Uint8Array([true]);
        expect(ShowGeometryInstanceAttribute.toValue(true)).toEqual(expectedResult);
    });

    it('toValue works with a result parameter', function() {
        var expectedResult = new Uint8Array([true]);
        var result = new Uint8Array(1);
        var returnedResult = ShowGeometryInstanceAttribute.toValue(true, result);
        expect(returnedResult).toEqual(expectedResult);
        expect(returnedResult).toBe(result);
    });

    it('toValue throws without a color', function() {
        expect(function() {
            ShowGeometryInstanceAttribute.toValue();
        }).toThrowDeveloperError();
    });

});
