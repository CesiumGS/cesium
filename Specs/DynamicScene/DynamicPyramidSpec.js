/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicPyramid',
        'Core/Color',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty'
    ], function(
        DynamicPyramid,
        Color,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new DynamicPyramid();
        source.material = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var target = new DynamicPyramid();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.directions).toBe(source.directions);
        expect(target.intersectionColor).toBe(source.intersectionColor);
        expect(target.radius).toBe(source.radius);
        expect(target.show).toBe(source.show);
        expect(target.showIntersection).toBe(source.showIntersection);
        expect(target.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DynamicPyramid();
        source.material = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var material = new ColorMaterialProperty();
        var directions = new ConstantProperty([]);
        var intersectionColor = new ConstantProperty(Color.WHITE);
        var radius = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var showIntersection = new ConstantProperty(true);
        var intersectionWidth = new ConstantProperty(1);

        var target = new DynamicPyramid();
        target.material = material;
        target.directions = directions;
        target.intersectionColor = intersectionColor;
        target.radius = radius;
        target.show = show;
        target.showIntersection = showIntersection;
        target.intersectionWidth = intersectionWidth;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.directions).toBe(directions);
        expect(target.intersectionColor).toBe(intersectionColor);
        expect(target.radius).toBe(radius);
        expect(target.show).toBe(show);
        expect(target.showIntersection).toBe(showIntersection);
        expect(target.intersectionWidth).toBe(intersectionWidth);
    });

    it('clone works', function() {
        var source = new DynamicPyramid();
        source.material = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.directions).toBe(source.directions);
        expect(result.intersectionColor).toBe(source.intersectionColor);
        expect(result.radius).toBe(source.radius);
        expect(result.show).toBe(source.show);
        expect(result.showIntersection).toBe(source.showIntersection);
        expect(result.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge throws if source undefined', function() {
        var target = new DynamicPyramid();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});