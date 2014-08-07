/*global defineSuite*/
defineSuite([
        'DataSources/PolygonGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolygonGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new PolygonGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();

        var target = new PolygonGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.positions).toBe(source.positions);
        expect(target.show).toBe(source.show);
        expect(target.height).toBe(source.height);
        expect(target.extrudedHeight).toBe(source.extrudedHeight);
        expect(target.granularity).toBe(source.granularity);
        expect(target.stRotation).toBe(source.stRotation);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolygonGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();

        var material = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var show = new ConstantProperty();
        var height = new ConstantProperty();
        var extrudedHeight = new ConstantProperty();
        var granularity = new ConstantProperty();
        var stRotation = new ConstantProperty();

        var target = new PolygonGraphics();
        target.material = material;
        target.positions = positions;
        target.show = show;
        target.height = height;
        target.extrudedHeight = extrudedHeight;
        target.granularity = granularity;
        target.stRotation = stRotation;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.positions).toBe(positions);
        expect(target.show).toBe(show);
        expect(target.height).toBe(height);
        expect(target.extrudedHeight).toBe(extrudedHeight);
        expect(target.granularity).toBe(granularity);
        expect(target.stRotation).toBe(stRotation);
    });

    it('clone works', function() {
        var source = new PolygonGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty(true);
        source.height = new ConstantProperty(1);
        source.extrudedHeight = new ConstantProperty(2);
        source.granularity = new ConstantProperty(3);
        source.stRotation = new ConstantProperty(4);

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.positions).toBe(source.positions);
        expect(result.show).toBe(source.show);
        expect(result.height).toBe(source.height);
        expect(result.extrudedHeight).toBe(source.extrudedHeight);
        expect(result.granularity).toBe(source.granularity);
        expect(result.stRotation).toBe(source.stRotation);
    });

    it('merge throws if source undefined', function() {
        var target = new PolygonGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new PolygonGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'height', 3, 4);
        testDefinitionChanged(property, 'extrudedHeight', 4, 3);
        testDefinitionChanged(property, 'granularity', 1, 2);
        testDefinitionChanged(property, 'stRotation', 5, 6);
    });
});