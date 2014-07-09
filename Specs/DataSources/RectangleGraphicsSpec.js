/*global defineSuite*/
defineSuite([
        'DataSources/RectangleGraphics',
        'Core/Color',
        'Core/Rectangle',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        RectangleGraphics,
        Color,
        Rectangle,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new RectangleGraphics();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty();
        source.coordinates = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.rotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.closeTop = new ConstantProperty();
        source.closeBottom = new ConstantProperty();

        var target = new RectangleGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
        expect(target.coordinates).toBe(source.coordinates);
        expect(target.height).toBe(source.height);
        expect(target.extrudedHeight).toBe(source.extrudedHeight);
        expect(target.granularity).toBe(source.granularity);
        expect(target.stRotation).toBe(source.stRotation);
        expect(target.rotation).toBe(source.rotation);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.closeTop).toBe(source.closeTop);
        expect(target.closeBottom).toBe(source.closeBottom);
    });

    it('merge does not assign assigned properties', function() {
        var source = new RectangleGraphics();

        var material = new ColorMaterialProperty();
        var show = new ConstantProperty();
        var coordinates = new ConstantProperty();
        var height = new ConstantProperty();
        var extrudedHeight = new ConstantProperty();
        var granularity = new ConstantProperty();
        var stRotation = new ConstantProperty();
        var rotation = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var closeTop = new ConstantProperty();
        var closeBottom = new ConstantProperty();

        var target = new RectangleGraphics();
        target.material = material;
        target.show = show;
        target.coordinates = coordinates;
        target.height = height;
        target.extrudedHeight = extrudedHeight;
        target.granularity = granularity;
        target.stRotation = stRotation;
        target.rotation = rotation;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.closeTop = closeTop;
        target.closeBottom = closeBottom;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.show).toBe(show);
        expect(target.coordinates).toBe(coordinates);
        expect(target.height).toBe(height);
        expect(target.extrudedHeight).toBe(extrudedHeight);
        expect(target.granularity).toBe(granularity);
        expect(target.stRotation).toBe(stRotation);
        expect(target.rotation).toBe(rotation);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.closeTop).toBe(closeTop);
        expect(target.closeBottom).toBe(closeBottom);
    });

    it('clone works', function() {
        var source = new RectangleGraphics();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty();
        source.coordinates = new ConstantProperty();
        source.height = new ConstantProperty();
        source.extrudedHeight = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.stRotation = new ConstantProperty();
        source.rotation = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.closeTop = new ConstantProperty();
        source.closeBottom = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
        expect(result.coordinates).toBe(source.coordinates);
        expect(result.height).toBe(source.height);
        expect(result.extrudedHeight).toBe(source.extrudedHeight);
        expect(result.granularity).toBe(source.granularity);
        expect(result.stRotation).toBe(source.stRotation);
        expect(result.rotation).toBe(source.rotation);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.closeTop).toBe(source.closeTop);
        expect(result.closeBottom).toBe(source.closeBottom);
    });

    it('merge throws if source undefined', function() {
        var target = new RectangleGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new RectangleGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'coordinates', new Rectangle(0, 0, 0.1, 0.1), new Rectangle(0, 0, 1, 1));
        testDefinitionChanged(property, 'height', 2, 5);
        testDefinitionChanged(property, 'extrudedHeight', 3, 4);
        testDefinitionChanged(property, 'granularity', 3, 4);
        testDefinitionChanged(property, 'stRotation', 3, 4);
        testDefinitionChanged(property, 'rotation', 3, 4);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'closeTop', false, true);
        testDefinitionChanged(property, 'closeBottom', false, true);
    });
});