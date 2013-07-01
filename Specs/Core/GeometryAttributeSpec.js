/*global defineSuite*/
defineSuite([
         'Core/GeometryAttribute',
         'Core/ComponentDatatype'
     ], function(
         GeometryAttribute,
         ComponentDatatype) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var color = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            values : new Uint8Array([
                255, 0, 0, 255,
                0, 255, 0, 255,
                0, 0, 255, 255
            ])
        });

        expect(color.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(color.componentsPerAttribute).toEqual(4);
        expect(color.normalize).toEqual(true);
        expect(color.values).toEqual([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 255
        ]);
    });

    it('clone', function() {
        var color = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            values : new Uint8Array([
                255, 0, 0, 255,
                0, 255, 0, 255,
                0, 0, 255, 255
            ])
        });
        var clone = color.clone();

        expect(clone.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(clone.componentsPerAttribute).toEqual(4);
        expect(clone.normalize).toEqual(true);
        expect(clone.values).not.toBe(color.values);
        expect(clone.values instanceof Uint8Array);
        expect(clone.values).toEqual([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 255
        ]);
    });

    it('clone with result parameter', function() {
        var color = new GeometryAttribute({
            componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute : 4,
            normalize : true,
            values : new Uint8Array([
                255, 0, 0, 255,
                0, 255, 0, 255,
                0, 0, 255, 255
            ])
        });
        var result = new GeometryAttribute();
        var clone = color.clone(result);

        expect(clone).toBe(result);
        expect(clone.componentDatatype).toEqual(ComponentDatatype.UNSIGNED_BYTE);
        expect(clone.componentsPerAttribute).toEqual(4);
        expect(clone.normalize).toEqual(true);
        expect(clone.values).not.toBe(color.values);
        expect(clone.values instanceof Uint8Array);
        expect(clone.values).toEqual([
            255, 0, 0, 255,
            0, 255, 0, 255,
            0, 0, 255, 255
        ]);
    });

});
