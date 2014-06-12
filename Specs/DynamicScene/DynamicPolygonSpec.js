/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicPolygon',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty'
    ], function(
        DynamicPolygon,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);
        source.height = new ConstantProperty(1);
        source.extrudedHeight = new ConstantProperty(2);
        source.granularity = new ConstantProperty(3);
        source.stRotation = new ConstantProperty(4);

        var target = new DynamicPolygon();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
        expect(target.height).toBe(source.height);
        expect(target.extrudedHeight).toBe(source.extrudedHeight);
        expect(target.granularity).toBe(source.granularity);
        expect(target.stRotation).toBe(source.stRotation);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);

        var material = new ColorMaterialProperty();
        var show = new ConstantProperty(true);
        var height = new ConstantProperty(1);
        var extrudedHeight = new ConstantProperty(2);
        var granularity = new ConstantProperty(3);
        var stRotation = new ConstantProperty(4);

        var target = new DynamicPolygon();
        target.material = material;
        target.show = show;
        target.height = height;
        target.extrudedHeight = extrudedHeight;
        target.granularity = granularity;
        target.stRotation = stRotation;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.show).toBe(show);
        expect(target.height).toBe(height);
        expect(target.extrudedHeight).toBe(extrudedHeight);
        expect(target.granularity).toBe(granularity);
        expect(target.stRotation).toBe(stRotation);
    });

    it('clone works', function() {
        var source = new DynamicPolygon();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty(true);
        source.height = new ConstantProperty(1);
        source.extrudedHeight = new ConstantProperty(2);
        source.granularity = new ConstantProperty(3);
        source.stRotation = new ConstantProperty(4);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
        expect(result.height).toBe(source.height);
        expect(result.extrudedHeight).toBe(source.extrudedHeight);
        expect(result.granularity).toBe(source.granularity);
        expect(result.stRotation).toBe(source.stRotation);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPolygon();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});