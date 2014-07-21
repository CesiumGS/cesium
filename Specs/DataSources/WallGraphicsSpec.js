/*global defineSuite*/
defineSuite([
        'DataSources/WallGraphics',
        'Core/Color',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        WallGraphics,
        Color,
        ColorMaterialProperty,
        ConstantProperty,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('merge assigns unassigned properties', function() {
        var source = new WallGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.minimumHeights = new ConstantProperty();
        source.maximumHeights = new ConstantProperty();

        var target = new WallGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.positions).toBe(source.positions);
        expect(target.show).toBe(source.show);
        expect(target.granularity).toBe(source.granularity);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.minimumHeights).toBe(source.minimumHeights);
        expect(target.maximumHeights).toBe(source.maximumHeights);
    });

    it('merge does not assign assigned properties', function() {
        var source = new WallGraphics();

        var material = new ColorMaterialProperty();
        var positions = new ColorMaterialProperty();
        var show = new ConstantProperty();
        var granularity = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var minimumHeights = new ConstantProperty();
        var maximumHeights = new ConstantProperty();

        var target = new WallGraphics();
        target.material = material;
        target.positions = positions;
        target.show = show;
        target.granularity = granularity;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.minimumHeights = minimumHeights;
        target.maximumHeights = maximumHeights;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.positions).toBe(positions);
        expect(target.show).toBe(show);
        expect(target.granularity).toBe(granularity);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.minimumHeights).toBe(minimumHeights);
        expect(target.maximumHeights).toBe(maximumHeights);
    });

    it('clone works', function() {
        var source = new WallGraphics();
        source.material = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.minimumHeights = new ConstantProperty();
        source.maximumHeights = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.positions).toBe(source.positions);
        expect(result.show).toBe(source.show);
        expect(result.granularity).toBe(source.granularity);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.minimumHeights).toBe(source.minimumHeights);
        expect(result.maximumHeights).toBe(source.maximumHeights);
    });

    it('merge throws if source undefined', function() {
        var target = new WallGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new WallGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'granularity', 3, 4);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'minimumHeights', [0, 1], [2, 3]);
        testDefinitionChanged(property, 'maximumHeights', [3, 5], [7, 8]);
    });
});