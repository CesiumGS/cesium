/*global defineSuite*/
defineSuite([
         'Core/ShowGeometryInstanceAttribute',
         'Core/ComponentDatatype'
     ], function(
         ShowGeometryInstanceAttribute,
         ComponentDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var attribute = new ShowGeometryInstanceAttribute(false);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(attribute.componentsPerAttribute).toEqual(1);
        expect(attribute.normalize).toEqual(true);

        expect(attribute.value).toEqual(new Uint8Array([false]));
    });

    it('toValue', function() {
        expect(ShowGeometryInstanceAttribute.toValue(true)).toEqual(new Uint8Array([true]));
    });

    it('toValue throws without a color', function() {
        expect(function() {
            ShowGeometryInstanceAttribute.toValue();
        }).toThrow();
    });

});
