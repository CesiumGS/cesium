/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolygon',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicVertexPositionsProperty',
             'Core/Color'
         ], function(
             DynamicPolygon,
             ColorMaterialProperty,
             ConstantProperty,
             DynamicVertexPositionsProperty,
             Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var target = new DynamicPolygon();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var material = new ColorMaterialProperty();
        var show = new ConstantProperty(true);

        var target = new DynamicPolygon();
        target.material = material;
        target.show = show;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPolygon();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});