/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPath',
             'DynamicScene/ConstantProperty',
             'Core/Color'
            ], function(
                    DynamicPath,
              ConstantProperty,
              Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPath();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var target = new DynamicPath();
        target.merge(source);
        expect(target.color).toBe(source.color);
        expect(target.width).toBe(source.width);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.show).toBe(source.show);
        expect(target.leadTime).toBe(source.leadTime);
        expect(target.trailTime).toBe(source.trailTime);
        expect(target.resolution).toBe(source.resolution);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPath();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var color = new ConstantProperty(Color.WHITE);
        var width = new ConstantProperty(1);
        var outlineColor = new ConstantProperty(Color.WHITE);
        var outlineWidth = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var leadTime = new ConstantProperty(1);
        var trailTime = new ConstantProperty(1);
        var resolution = new ConstantProperty(1);

        var target = new DynamicPath();
        target.color = color;
        target.width = width;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.show = show;
        target.leadTime = leadTime;
        target.trailTime = trailTime;
        target.resolution = resolution;

        target.merge(source);
        expect(target.color).toBe(color);
        expect(target.width).toBe(width);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.show).toBe(show);
        expect(target.leadTime).toBe(leadTime);
        expect(target.trailTime).toBe(trailTime);
        expect(target.resolution).toBe(resolution);
    });

    it('clone works', function() {
        var source = new DynamicPath();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);

        var result = source.clone();
        expect(result.color).toBe(source.color);
        expect(result.width).toBe(source.width);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.show).toBe(source.show);
        expect(result.leadTime).toBe(source.leadTime);
        expect(result.trailTime).toBe(source.trailTime);
        expect(result.resolution).toBe(source.resolution);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPath();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});