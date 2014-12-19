/*global defineSuite*/
defineSuite([
        'DataSources/BoxGraphics',
        'Core/Cartesian3',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        BoxGraphics,
        Cartesian3,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new BoxGraphics();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.minimumCorner = new ConstantProperty();
        source.maximumCorner = new ConstantProperty();

        var target = new BoxGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.show).toBe(source.show);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.minimumCorner).toBe(source.minimumCorner);
        expect(target.maximumCorner).toBe(source.maximumCorner);
    });

    it('merge does not assign assigned properties', function() {
        var source = new BoxGraphics();

        var material = new ColorMaterialProperty();
        var show = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var minimumCorner = new ConstantProperty();
        var maximumCorner = new ConstantProperty();

        var target = new BoxGraphics();
        target.material = material;
        target.show = show;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.minimumCorner = minimumCorner;
        target.maximumCorner = maximumCorner;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.show).toBe(show);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.minimumCorner).toBe(minimumCorner);
        expect(target.maximumCorner).toBe(maximumCorner);
    });

    it('clone works', function() {
        var source = new BoxGraphics();
        source.material = new ColorMaterialProperty();
        source.show = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.minimumCorner = new ConstantProperty();
        source.maximumCorner = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.show).toBe(source.show);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.minimumCorner).toBe(source.minimumCorner);
        expect(result.maximumCorner).toBe(source.maximumCorner);
    });

    it('merge throws if source undefined', function() {
        var target = new BoxGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new BoxGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'minimumCorner', new Cartesian3(0, 0, 0), new Cartesian3(1, 1, 1));
        testDefinitionChanged(property, 'maximumCorner', new Cartesian3(1, 1, 1), new Cartesian3(2, 2, 2));
    });
});