/*global defineSuite*/
defineSuite([
         'Core/GeometryInstanceAttribute',
         'Core/ComponentDatatype'
     ], function(
         GeometryInstanceAttribute,
         ComponentDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var color = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            value : new Uint8Array([255, 255, 0, 255])
        });

        expect(color.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(color.componentsPerAttribute).toEqual(4);
        expect(color.normalize).toEqual(true);
        expect(color.value).toEqual([255, 255, 0, 255]);
    });

    it('clone', function() {
        var color = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            value : new Uint8Array([255, 255, 0, 255])
        });
        var clone = GeometryInstanceAttribute.clone(color);

        expect(clone.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(clone.componentsPerAttribute).toEqual(4);
        expect(clone.normalize).toEqual(true);
        expect(clone.value).not.toBe(color.value);
        expect(clone.value instanceof Uint8Array);
        expect(color.value).toEqual([255, 255, 0, 255]);
    });

    it('clone with result parameter', function() {
        var color = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            value : new Uint8Array([255, 255, 0, 255])
        });
        var result = new GeometryInstanceAttribute();
        var clone = GeometryInstanceAttribute.clone(color, result);

        expect(clone).toBe(result);
        expect(clone.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(clone.componentsPerAttribute).toEqual(4);
        expect(clone.normalize).toEqual(true);
        expect(clone.value).not.toBe(color.value);
        expect(clone.value instanceof Uint8Array);
        expect(color.value).toEqual([255, 255, 0, 255]);
    });

});
