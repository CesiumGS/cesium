/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicPolyline',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty'
    ], function(
        DynamicPolyline,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPolyline();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var target = new DynamicPolyline();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPolyline();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var color = new ColorMaterialProperty();
        var width = new ConstantProperty(1);
        var show = new ConstantProperty(true);

        var target = new DynamicPolyline();
        target.material = color;
        target.width = width;
        target.show = show;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new DynamicPolyline();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPolyline();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});