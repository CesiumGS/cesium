/*global defineSuite*/
defineSuite([
        'DataSources/PathGraphics',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty'
    ], function(
        PathGraphics,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var target = new PathGraphics();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
        expect(target.leadTime).toBe(source.leadTime);
        expect(target.trailTime).toBe(source.trailTime);
        expect(target.resolution).toBe(source.resolution);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var color = new ColorMaterialProperty();
        var width = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var leadTime = new ConstantProperty(1);
        var trailTime = new ConstantProperty(1);
        var resolution = new ConstantProperty(1);

        var target = new PathGraphics();
        target.material = color;
        target.width = width;
        target.show = show;
        target.leadTime = leadTime;
        target.trailTime = trailTime;
        target.resolution = resolution;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
        expect(target.leadTime).toBe(leadTime);
        expect(target.trailTime).toBe(trailTime);
        expect(target.resolution).toBe(resolution);
    });

    it('clone works', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
        expect(result.leadTime).toBe(source.leadTime);
        expect(result.trailTime).toBe(source.trailTime);
        expect(result.resolution).toBe(source.resolution);
    });

    it('merge throws if source undefined', function() {
        var target = new PathGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});