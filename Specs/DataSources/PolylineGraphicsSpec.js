/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolylineGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.BLUE,
            positions : [],
            show : true,
            width : 1,
            followSurface : false,
            granularity : 2
        };

        var polyline = new PolylineGraphics(options);
        expect(polyline.material).toBeInstanceOf(ColorMaterialProperty);
        expect(polyline.positions).toBeInstanceOf(ConstantProperty);
        expect(polyline.show).toBeInstanceOf(ConstantProperty);
        expect(polyline.width).toBeInstanceOf(ConstantProperty);
        expect(polyline.followSurface).toBeInstanceOf(ConstantProperty);
        expect(polyline.granularity).toBeInstanceOf(ConstantProperty);

        expect(polyline.material.color.getValue()).toEqual(options.material);
        expect(polyline.positions.getValue()).toEqual(options.positions);
        expect(polyline.show.getValue()).toEqual(options.show);
        expect(polyline.width.getValue()).toEqual(options.width);
        expect(polyline.followSurface.getValue()).toEqual(options.followSurface);
        expect(polyline.granularity.getValue()).toEqual(options.granularity);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();

        var target = new PolylineGraphics();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.positions).toBe(source.positions);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
        expect(target.followSurface).toBe(source.followSurface);
        expect(target.granularity).toBe(source.granularity);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();

        var color = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var width = new ConstantProperty();
        var show = new ConstantProperty();
        var followSurface = new ConstantProperty();
        var granularity = new ConstantProperty();

        var target = new PolylineGraphics();
        target.material = color;
        target.positions = positions;
        target.width = width;
        target.show = show;
        target.followSurface = followSurface;
        target.granularity = granularity;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.positions).toBe(positions);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
        expect(target.followSurface).toBe(followSurface);
        expect(target.granularity).toBe(granularity);
    });

    it('clone works', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.positions).toBe(source.positions);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
        expect(result.followSurface).toBe(source.followSurface);
        expect(result.granularity).toBe(source.granularity);
    });

    it('merge throws if source undefined', function() {
        var target = new PolylineGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolylineGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'width', 3, 4);
        testDefinitionChanged(property, 'followSurface', false, true);
        testDefinitionChanged(property, 'granularity', 2, 1);
    });
});