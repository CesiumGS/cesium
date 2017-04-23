/*global defineSuite*/
defineSuite([
        'DataSources/RectangleGraphics',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/Rectangle',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Scene/ShadowMode',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        RectangleGraphics,
        Color,
        DistanceDisplayCondition,
        Rectangle,
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
            coordinates : new Rectangle(0.1, 0.2, 0.3, 0.4),
            height : 5,
            extrudedHeight : 6,
            granularity : 7,
            rotation : 8,
            stRotation : 9,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 10,
            closeTop : false,
            closeBottom : false,
            shadows : ShadowMode.DISABLED,
            distanceDisplayCondition : new DistanceDisplayCondition()
        };

        var rectangle = new RectangleGraphics(options);
        expect(rectangle.material).toBeInstanceOf(ColorMaterialProperty);
        expect(rectangle.show).toBeInstanceOf(ConstantProperty);
        expect(rectangle.coordinates).toBeInstanceOf(ConstantProperty);
        expect(rectangle.height).toBeInstanceOf(ConstantProperty);
        expect(rectangle.extrudedHeight).toBeInstanceOf(ConstantProperty);
        expect(rectangle.granularity).toBeInstanceOf(ConstantProperty);
        expect(rectangle.rotation).toBeInstanceOf(ConstantProperty);
        expect(rectangle.stRotation).toBeInstanceOf(ConstantProperty);
        expect(rectangle.fill).toBeInstanceOf(ConstantProperty);
        expect(rectangle.outline).toBeInstanceOf(ConstantProperty);
        expect(rectangle.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(rectangle.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(rectangle.closeTop).toBeInstanceOf(ConstantProperty);
        expect(rectangle.closeBottom).toBeInstanceOf(ConstantProperty);
        expect(rectangle.shadows).toBeInstanceOf(ConstantProperty);
        expect(rectangle.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
        
        expect(rectangle.material.color.getValue()).toEqual(options.material);
        expect(rectangle.show.getValue()).toEqual(options.show);
        expect(rectangle.coordinates.getValue()).toEqual(options.coordinates);
        expect(rectangle.height.getValue()).toEqual(options.height);
        expect(rectangle.extrudedHeight.getValue()).toEqual(options.extrudedHeight);
        expect(rectangle.granularity.getValue()).toEqual(options.granularity);
        expect(rectangle.rotation.getValue()).toEqual(options.rotation);
        expect(rectangle.stRotation.getValue()).toEqual(options.stRotation);
        expect(rectangle.fill.getValue()).toEqual(options.fill);
        expect(rectangle.outline.getValue()).toEqual(options.outline);
        expect(rectangle.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(rectangle.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(rectangle.closeTop.getValue()).toEqual(options.closeTop);
        expect(rectangle.closeBottom.getValue()).toEqual(options.closeBottom);
        expect(rectangle.shadows.getValue()).toEqual(options.shadows);
        expect(rectangle.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
    });

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
        source.outlineWidth = new ConstantProperty();
        source.closeTop = new ConstantProperty();
        source.closeBottom = new ConstantProperty();
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty();

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
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.closeTop).toBe(source.closeTop);
        expect(target.closeBottom).toBe(source.closeBottom);
        expect(target.shadows).toBe(source.shadows);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
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
        var outlineWidth = new ConstantProperty();
        var closeTop = new ConstantProperty();
        var closeBottom = new ConstantProperty();
        var shadows = new ConstantProperty();
        var distanceDisplayCondition = new ConstantProperty();

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
        target.outlineWidth = outlineWidth;
        target.closeTop = closeTop;
        target.closeBottom = closeBottom;
        target.shadows = shadows;
        target.distanceDisplayCondition = distanceDisplayCondition;

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
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.closeTop).toBe(closeTop);
        expect(target.closeBottom).toBe(closeBottom);
        expect(target.shadows).toBe(shadows);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
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
        source.outlineWidth = new ConstantProperty();
        source.closeTop = new ConstantProperty();
        source.closeBottom = new ConstantProperty();
        source.shadows = new ConstantProperty();
        source.distanceDisplayCondition = new ConstantProperty();

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
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.closeTop).toBe(source.closeTop);
        expect(result.closeBottom).toBe(source.closeBottom);
        expect(result.shadows).toBe(source.shadows);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
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
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'closeTop', false, true);
        testDefinitionChanged(property, 'closeBottom', false, true);
        testDefinitionChanged(property, 'shadows', ShadowMode.ENABLED, ShadowMode.DISABLED);
        testDefinitionChanged(property, 'distanceDisplayCondition', new DistanceDisplayCondition(), new DistanceDisplayCondition(10.0, 100.0));
    });
});
