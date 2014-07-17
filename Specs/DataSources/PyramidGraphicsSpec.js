/*global defineSuite*/
defineSuite([
        'DataSources/PyramidGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty'
    ], function(
        PyramidGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new PyramidGraphics();
        source.lateralSurfaceMaterial = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var target = new PyramidGraphics();
        target.merge(source);

        expect(target.lateralSurfaceMaterial).toBe(source.lateralSurfaceMaterial);
        expect(target.directions).toBe(source.directions);
        expect(target.intersectionColor).toBe(source.intersectionColor);
        expect(target.radius).toBe(source.radius);
        expect(target.show).toBe(source.show);
        expect(target.showIntersection).toBe(source.showIntersection);
        expect(target.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PyramidGraphics();
        source.lateralSurfaceMaterial = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var lateralSurfaceMaterial = new ColorMaterialProperty();
        var directions = new ConstantProperty([]);
        var intersectionColor = new ConstantProperty(Color.WHITE);
        var radius = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var showIntersection = new ConstantProperty(true);
        var intersectionWidth = new ConstantProperty(1);

        var target = new PyramidGraphics();
        target.lateralSurfaceMaterial = lateralSurfaceMaterial;
        target.directions = directions;
        target.intersectionColor = intersectionColor;
        target.radius = radius;
        target.show = show;
        target.showIntersection = showIntersection;
        target.intersectionWidth = intersectionWidth;

        target.merge(source);

        expect(target.lateralSurfaceMaterial).toBe(lateralSurfaceMaterial);
        expect(target.directions).toBe(directions);
        expect(target.intersectionColor).toBe(intersectionColor);
        expect(target.radius).toBe(radius);
        expect(target.show).toBe(show);
        expect(target.showIntersection).toBe(showIntersection);
        expect(target.intersectionWidth).toBe(intersectionWidth);
    });

    it('clone works', function() {
        var source = new PyramidGraphics();
        source.lateralSurfaceMaterial = new ColorMaterialProperty();
        source.directions = new ConstantProperty([]);
        source.intersectionColor = new ConstantProperty(Color.WHITE);
        source.radius = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.showIntersection = new ConstantProperty(true);
        source.intersectionWidth = new ConstantProperty(1);

        var result = source.clone();
        expect(result.lateralSurfaceMaterial).toBe(source.lateralSurfaceMaterial);
        expect(result.directions).toBe(source.directions);
        expect(result.intersectionColor).toBe(source.intersectionColor);
        expect(result.radius).toBe(source.radius);
        expect(result.show).toBe(source.show);
        expect(result.showIntersection).toBe(source.showIntersection);
        expect(result.intersectionWidth).toBe(source.intersectionWidth);
    });

    it('merge throws if source undefined', function() {
        var target = new PyramidGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});