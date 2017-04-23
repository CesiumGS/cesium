/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGraphics',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'Scene/ShadowMode',
        'Specs/testDefinitionChanged',
        'Specs/testMaterialDefinitionChanged'
    ], function(
        PolylineGraphics,
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
            depthFailMaterial : Color.RED,
            positions : [],
            show : true,
            width : 1,
            followSurface : false,
            granularity : 2,
            shadows : ShadowMode.DISABLED,
            distanceDisplayCondition : new DistanceDisplayCondition()
        };

        var polyline = new PolylineGraphics(options);
        expect(polyline.material).toBeInstanceOf(ColorMaterialProperty);
        expect(polyline.depthFailMaterial).toBeInstanceOf(ColorMaterialProperty);
        expect(polyline.positions).toBeInstanceOf(ConstantProperty);
        expect(polyline.show).toBeInstanceOf(ConstantProperty);
        expect(polyline.width).toBeInstanceOf(ConstantProperty);
        expect(polyline.followSurface).toBeInstanceOf(ConstantProperty);
        expect(polyline.granularity).toBeInstanceOf(ConstantProperty);
        expect(polyline.shadows).toBeInstanceOf(ConstantProperty);
        expect(polyline.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

        expect(polyline.material.color.getValue()).toEqual(options.material);
        expect(polyline.depthFailMaterial.color.getValue()).toEqual(options.depthFailMaterial);
        expect(polyline.positions.getValue()).toEqual(options.positions);
        expect(polyline.show.getValue()).toEqual(options.show);
        expect(polyline.width.getValue()).toEqual(options.width);
        expect(polyline.followSurface.getValue()).toEqual(options.followSurface);
        expect(polyline.granularity.getValue()).toEqual(options.granularity);
        expect(polyline.shadows.getValue()).toEqual(options.shadows);
        expect(polyline.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.depthFailMaterial = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.shadows = new ConstantProperty(ShadowMode.ENABLED);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

        var target = new PolylineGraphics();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.depthFailMaterial).toBe(source.depthFailMaterial);
        expect(target.positions).toBe(source.positions);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
        expect(target.followSurface).toBe(source.followSurface);
        expect(target.granularity).toBe(source.granularity);
        expect(target.shadows).toBe(source.shadows);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.depthFailMaterial = new ColorMaterialProperty();
        source.positions = new ConstantProperty();
        source.width = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.shadows = new ConstantProperty();
        source.distanceDisplayCondition = new ConstantProperty();

        var color = new ColorMaterialProperty();
        var depthFailColor = new ColorMaterialProperty();
        var positions = new ConstantProperty();
        var width = new ConstantProperty();
        var show = new ConstantProperty();
        var followSurface = new ConstantProperty();
        var granularity = new ConstantProperty();
        var shadows = new ConstantProperty();
        var distanceDisplayCondition = new ConstantProperty();

        var target = new PolylineGraphics();
        target.material = color;
        target.depthFailMaterial = depthFailColor;
        target.positions = positions;
        target.width = width;
        target.show = show;
        target.followSurface = followSurface;
        target.granularity = granularity;
        target.shadows = shadows;
        target.distanceDisplayCondition = distanceDisplayCondition;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.depthFailMaterial).toBe(depthFailColor);
        expect(target.positions).toBe(positions);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
        expect(target.followSurface).toBe(followSurface);
        expect(target.granularity).toBe(granularity);
        expect(target.shadows).toBe(shadows);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    });

    it('clone works', function() {
        var source = new PolylineGraphics();
        source.material = new ColorMaterialProperty();
        source.depthFailMaterial = new ColorMaterialProperty();
        source.width = new ConstantProperty();
        source.positions = new ConstantProperty();
        source.show = new ConstantProperty();
        source.followSurface = new ConstantProperty();
        source.granularity = new ConstantProperty();
        source.shadows = new ConstantProperty();
        source.distanceDisplayCondition = new ConstantProperty();

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.depthFailMaterial).toBe(source.depthFailMaterial);
        expect(result.positions).toBe(source.positions);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
        expect(result.followSurface).toBe(source.followSurface);
        expect(result.granularity).toBe(source.granularity);
        expect(result.shadows).toBe(source.shadows);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
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
        testMaterialDefinitionChanged(property, 'depthFailMaterial', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'show', true, false);
        testDefinitionChanged(property, 'positions', [], []);
        testDefinitionChanged(property, 'width', 3, 4);
        testDefinitionChanged(property, 'followSurface', false, true);
        testDefinitionChanged(property, 'granularity', 2, 1);
        testDefinitionChanged(property, 'shadows', ShadowMode.ENABLED, ShadowMode.DISABLED);
        testDefinitionChanged(property, 'distanceDisplayCondition', new DistanceDisplayCondition(), new DistanceDisplayCondition(10.0, 20.0));
    });
});
