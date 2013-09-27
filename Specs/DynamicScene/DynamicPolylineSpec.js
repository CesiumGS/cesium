/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolyline',
             'DynamicScene/ConstantProperty',
             'Core/Color'
            ], function(
              DynamicPolyline,
              ConstantProperty,
              Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPolyline();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var target = new DynamicPolyline();
        target.merge(source);
        expect(target.color).toBe(source.color);
        expect(target.width).toBe(source.width);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.show).toBe(source.show);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPolyline();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var color = new ConstantProperty(Color.WHITE);
        var width = new ConstantProperty(1);
        var outlineColor = new ConstantProperty(Color.WHITE);
        var outlineWidth = new ConstantProperty(1);
        var show = new ConstantProperty(true);

        var target = new DynamicPolyline();
        target.color = color;
        target.width = width;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.show = show;

        target.merge(source);
        expect(target.color).toBe(color);
        expect(target.width).toBe(width);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.show).toBe(show);
    });

    it('clone works', function() {
        var source = new DynamicPolyline();
        source.color = new ConstantProperty(Color.WHITE);
        source.width = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);

        var result = source.clone();
        expect(result.color).toBe(source.color);
        expect(result.width).toBe(source.width);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.show).toBe(source.show);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPolyline();
        expect(function() {
            target.merge(undefined);
        }).toThrow();
    });
});