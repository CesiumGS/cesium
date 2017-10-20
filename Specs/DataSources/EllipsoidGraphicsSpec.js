defineSuite([
        'DataSources/EllipsoidGraphics',
        'Core/Cartesian3',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Scene/ShadowMode',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        EllipsoidGraphics,
        Cartesian3,
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
            stackPartitions : 1,
            slicePartitions : 2,
            subdivisions : 3,
            fill : false,
            outline : false,
            outlineColor : Color.RED,
            outlineWidth : 4,
            shadows : ShadowMode.DISABLED,
            distanceDisplayCondition : new DistanceDisplayCondition()
        };

        var ellipsoid = new EllipsoidGraphics(options);
        expect(ellipsoid.material).toBeInstanceOf(ColorMaterialProperty);
        expect(ellipsoid.show).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.stackPartitions).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.slicePartitions).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.subdivisions).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.fill).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.outline).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.shadows).toBeInstanceOf(ConstantProperty);
        expect(ellipsoid.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

        expect(ellipsoid.material.color.getValue()).toEqual(options.material);
        expect(ellipsoid.show.getValue()).toEqual(options.show);
        expect(ellipsoid.stackPartitions.getValue()).toEqual(options.stackPartitions);
        expect(ellipsoid.slicePartitions.getValue()).toEqual(options.slicePartitions);
        expect(ellipsoid.subdivisions.getValue()).toEqual(options.subdivisions);
        expect(ellipsoid.fill.getValue()).toEqual(options.fill);
        expect(ellipsoid.outline.getValue()).toEqual(options.outline);
        expect(ellipsoid.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(ellipsoid.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(ellipsoid.shadows.getValue()).toEqual(options.shadows);
        expect(ellipsoid.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
    });

    it('merge assigns unassigned properties', function() {
        var source = new EllipsoidGraphics();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty();
        source.show = new ConstantProperty();
        source.stackPartitions = new ConstantProperty();
        source.slicePartitions = new ConstantProperty();
        source.subdivisions = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

        var target = new EllipsoidGraphics();
        target.merge(source);

        expect(target.material).toBe(source.material);
        expect(target.radii).toBe(source.radii);
        expect(target.show).toBe(source.show);
        expect(target.stackPartitions).toBe(source.stackPartitions);
        expect(target.slicePartitions).toBe(source.slicePartitions);
        expect(target.subdivisions).toBe(source.subdivisions);
        expect(target.fill).toBe(source.fill);
        expect(target.outline).toBe(source.outline);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.shadows).toBe(source.shadows);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge does not assign assigned properties', function() {
        var source = new EllipsoidGraphics();

        var material = new ColorMaterialProperty();
        var radii = new ConstantProperty();
        var show = new ConstantProperty();
        var stackPartitions = new ConstantProperty();
        var slicePartitions = new ConstantProperty();
        var subdivisions = new ConstantProperty();
        var fill = new ConstantProperty();
        var outline = new ConstantProperty();
        var outlineColor = new ConstantProperty();
        var outlineWidth = new ConstantProperty();
        var shadows = new ConstantProperty();
        var distanecDisplayCondition = new ConstantProperty();

        var target = new EllipsoidGraphics();
        target.material = material;
        target.radii = radii;
        target.show = show;
        target.stackPartitions = stackPartitions;
        target.slicePartitions = slicePartitions;
        target.subdivisions = subdivisions;
        target.shadows = shadows;
        target.distanceDisplayCondition = distanecDisplayCondition;

        source.fill = fill;
        source.outline = outline;
        source.outlineColor = outlineColor;
        source.outlineWidth = outlineWidth;

        target.merge(source);

        expect(target.material).toBe(material);
        expect(target.radii).toBe(radii);
        expect(target.show).toBe(show);
        expect(target.stackPartitions).toBe(stackPartitions);
        expect(target.slicePartitions).toBe(slicePartitions);
        expect(target.subdivisions).toBe(subdivisions);
        expect(target.fill).toBe(fill);
        expect(target.outline).toBe(outline);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.shadows).toBe(shadows);
        expect(target.distanceDisplayCondition).toBe(distanecDisplayCondition);
    });

    it('clone works', function() {
        var source = new EllipsoidGraphics();
        source.material = new ColorMaterialProperty();
        source.radii = new ConstantProperty();
        source.show = new ConstantProperty();
        source.stackPartitions = new ConstantProperty();
        source.slicePartitions = new ConstantProperty();
        source.subdivisions = new ConstantProperty();
        source.fill = new ConstantProperty();
        source.outline = new ConstantProperty();
        source.outlineColor = new ConstantProperty();
        source.outlineWidth = new ConstantProperty();
        source.shadows = new ConstantProperty();
        source.distanceDisplayCondition = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.radii).toBe(source.radii);
        expect(result.show).toBe(source.show);
        expect(result.stackPartitions).toBe(source.stackPartitions);
        expect(result.slicePartitions).toBe(source.slicePartitions);
        expect(result.subdivisions).toBe(source.subdivisions);
        expect(result.fill).toBe(source.fill);
        expect(result.outline).toBe(source.outline);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.shadows).toBe(source.shadows);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge throws if source undefined', function() {
        var target = new EllipsoidGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new EllipsoidGraphics();
        testMaterialDefinitionChanged(property, 'material', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'radii', new Cartesian3(1, 2, 3), new Cartesian3(4, 5, 6));
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'stackPartitions', 1, 2);
        testDefinitionChanged(property, 'slicePartitions', 1, 2);
        testDefinitionChanged(property, 'subdivisions', 1, 2);
        testDefinitionChanged(property, 'fill', false, true);
        testDefinitionChanged(property, 'outline', true, false);
        testDefinitionChanged(property, 'outlineColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'outlineWidth', 2, 3);
        testDefinitionChanged(property, 'shadows', ShadowMode.ENABLED, ShadowMode.DISABLED);
        testDefinitionChanged(property, 'distanceDisplayCondition', new DistanceDisplayCondition(), new DistanceDisplayCondition(10.0, 100.0));
    });
});
