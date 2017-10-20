defineSuite([
        'DataSources/PathGraphics',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty'
    ], function(
        PathGraphics,
        Color,
        DistanceDisplayCondition,
        ColorMaterialProperty,
        ConstantProperty) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            material : Color.RED,
            width : 1,
            show : false,
            leadTime : 2,
            trailTime : 3,
            resolution : 4,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 20.0)
        };

        var path = new PathGraphics(options);
        expect(path.material).toBeInstanceOf(ColorMaterialProperty);
        expect(path.width).toBeInstanceOf(ConstantProperty);
        expect(path.show).toBeInstanceOf(ConstantProperty);
        expect(path.leadTime).toBeInstanceOf(ConstantProperty);
        expect(path.trailTime).toBeInstanceOf(ConstantProperty);
        expect(path.resolution).toBeInstanceOf(ConstantProperty);
        expect(path.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);

        expect(path.material.color.getValue()).toEqual(options.material);
        expect(path.width.getValue()).toEqual(options.width);
        expect(path.show.getValue()).toEqual(options.show);
        expect(path.leadTime.getValue()).toEqual(options.leadTime);
        expect(path.trailTime.getValue()).toEqual(options.trailTime);
        expect(path.resolution.getValue()).toEqual(options.resolution);
        expect(path.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 20.0));

        var target = new PathGraphics();
        target.merge(source);
        expect(target.material).toBe(source.material);
        expect(target.width).toBe(source.width);
        expect(target.show).toBe(source.show);
        expect(target.leadTime).toBe(source.leadTime);
        expect(target.trailTime).toBe(source.trailTime);
        expect(target.resolution).toBe(source.resolution);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

        var color = new ColorMaterialProperty();
        var width = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var leadTime = new ConstantProperty(1);
        var trailTime = new ConstantProperty(1);
        var resolution = new ConstantProperty(1);
        var distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

        var target = new PathGraphics();
        target.material = color;
        target.width = width;
        target.show = show;
        target.leadTime = leadTime;
        target.trailTime = trailTime;
        target.resolution = resolution;
        target.distanceDisplayCondition = distanceDisplayCondition;

        target.merge(source);
        expect(target.material).toBe(color);
        expect(target.width).toBe(width);
        expect(target.show).toBe(show);
        expect(target.leadTime).toBe(leadTime);
        expect(target.trailTime).toBe(trailTime);
        expect(target.resolution).toBe(resolution);
        expect(target.distanceDisplayCondition).toBe(distanceDisplayCondition);
    });

    it('clone works', function() {
        var source = new PathGraphics();
        source.material = new ColorMaterialProperty();
        source.width = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.leadTime = new ConstantProperty(1);
        source.trailTime = new ConstantProperty(1);
        source.resolution = new ConstantProperty(1);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition());

        var result = source.clone();
        expect(result.material).toBe(source.material);
        expect(result.width).toBe(source.width);
        expect(result.show).toBe(source.show);
        expect(result.leadTime).toBe(source.leadTime);
        expect(result.trailTime).toBe(source.trailTime);
        expect(result.resolution).toBe(source.resolution);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
    });

    it('merge throws if source undefined', function() {
        var target = new PathGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});
