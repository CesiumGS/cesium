defineSuite([
        'DataSources/CylinderGraphics',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Scene/ShadowMode',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        CylinderGraphics,
        Color,
        DistanceDisplayCondition,
        ColorMaterialProperty,
        ConstantProperty,
        ShadowMode,
        testDefinitionChanged,
        testMaterialDefinitionChanged) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.BLUE,
            show : true,
            length : 1,
            topRadius : 2,
            bottomRadius : 3,
            numberOfVerticalLines : 4,
            slices : 5,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 6,
            shadows : ShadowMode.DISABLED,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
        };

        var cylinder = new CylinderGraphics(options);
        expect(cylinder.material).toBeInstanceOf(ColorMaterialProperty);
        expect(cylinder.show).toBeInstanceOf(ConstantProperty);
        expect(cylinder.length).toBeInstanceOf(ConstantProperty);
        expect(cylinder.topRadius).toBeInstanceOf(ConstantProperty);
        expect(cylinder.bottomRadius).toBeInstanceOf(ConstantProperty);
        expect(cylinder.numberOfVerticalLines).toBeInstanceOf(ConstantProperty);
        expect(cylinder.slices).toBeInstanceOf(ConstantProperty);
        expect(cylinder.fill).toBeInstanceOf(ConstantProperty);
        expect(cylinder.outline).toBeInstanceOf(ConstantProperty);
        expect(cylinder.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(cylinder.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(cylinder.shadows).toBeInstanceOf(ConstantProperty);
        expect(cylinder.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

        expect(cylinder.material.color.getValue()).toEqual(options.material);
        expect(cylinder.show.getValue()).toEqual(options.show);
        expect(cylinder.length.getValue()).toEqual(options.length);
        expect(cylinder.topRadius.getValue()).toEqual(options.topRadius);
        expect(cylinder.bottomRadius.getValue()).toEqual(options.bottomRadius);
        expect(cylinder.numberOfVerticalLines.getValue()).toEqual(options.numberOfVerticalLines);
        expect(cylinder.slices.getValue()).toEqual(options.slices);
        expect(cylinder.fill.getValue()).toEqual(options.fill);
        expect(cylinder.outline.getValue()).toEqual(options.outline);
        expect(cylinder.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(cylinder.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(cylinder.shadows.getValue()).toEqual(options.shadows);
        expect(cylinder.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
    });

    it('merge assigns unassigned properties', function() {
        var source = new CylinderGraphics();
        source.material = new ColorMaterialProperty();
        source.length = new ConstantProperty();
        source.topRadius = new ConstantProperty();
        source.bottomRadius = new ConstantProperty();
        source.numberOfVerticalLines = new ConstantProperty();
        source.slices = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty();

        var target = new CylinderGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.length).toBe(source.length);
        expect(target.topRadius).toBe(source.topRadius);
        expect(target.bottomRadius).toBe(source.bottomRadius);
        expect(target.numberOfVerticalLines).toBe(source.numberOfVerticalLines);
        expect(target.slices).toBe(source.slices);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.shadows).toBe(source.shadows);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge does not assign assigned properties', function() {
        var source = new CylinderGraphics();

        var material = new ColorMaterialProperty();
        var topRadius = new ConstantProperty();
        var length = new ConstantProperty();
        var bottomRadius = new ConstantProperty();
        var numberOfVerticalLines = new ConstantProperty();
        var slices = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var shadows = new ConstantProperty();
        var distanceDisplayCondition = new ConstantProperty();

        var target = new CylinderGraphics();
        target.material = material;
        target.length = length;
        target.topRadius = topRadius;
        target.bottomRadius = bottomRadius;
        target.numberOfVerticalLines = numberOfVerticalLines;
        target.slices = slices;
        target.fill = fill;
        target.outline = outline;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.shadows = shadows;
        target.distanceDisplayCondition = distanceDisplayCondition;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.length).toBe(length);
        expect(target.topRadius).toBe(topRadius);
        expect(target.bottomRadius).toBe(bottomRadius);
        expect(target.numberOfVerticalLines).toBe(numberOfVerticalLines);
        expect(target.slices).toBe(slices);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.shadows).toBe(shadows);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    });

    it('clone works', function() {
        var source = new CylinderGraphics();
        source.material = new ColorMaterialProperty();
        source.length = new ConstantProperty();
        source.topRadius = new ConstantProperty();
        source.bottomRadius = new ConstantProperty();
        source.numberOfVerticalLines = new ConstantProperty();
        source.slices = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.shadows = new ConstantProperty();
        source.distanceDisplayCondition = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.length).toBe(source.length);
        expect(result.topRadius).toBe(source.topRadius);
        expect(result.bottomRadius).toBe(source.bottomRadius);
        expect(result.numberOfVerticalLines).toBe(source.numberOfVerticalLines);
        expect(result.slices).toBe(source.slices);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.shadows).toBe(source.shadows);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge throws if source undefined', function() {
        var target = new CylinderGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new CylinderGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'length', 2, 3);
        testDefinitionChanged(property, 'topRadius', 3, 4);
        testDefinitionChanged(property, 'bottomRadius', 5, 6);
        testDefinitionChanged(property, 'numberOfVerticalLines', 16, 32);
        testDefinitionChanged(property, 'slices', 16, 24);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'shadows', ShadowMode.ENABLED, ShadowMode.DISABLED);
        testDefinitionChanged(property, 'distanceDisplayCondition', new DistanceDisplayCondition(), new DistanceDisplayCondition(10.0, 100.0));
    });
});
