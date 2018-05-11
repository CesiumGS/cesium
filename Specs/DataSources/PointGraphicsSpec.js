defineSuite([
        'DataSources/PointGraphics',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/NearFarScalar',
        'DataSources/ConstantProperty',
        'Scene/HeightReference'
    ], function(
        PointGraphics,
        Color,
        DistanceDisplayCondition,
        NearFarScalar,
        ConstantProperty,
        HeightReference) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            color : Color.RED,
            pixelSize : 1,
            outlineColor : Color.BLUE,
            outlineWidth : 2,
            show : false,
            scaleByDistance : new NearFarScalar(3, 4, 5, 6),
            heightReference : HeightReference.RELATIVE_TO_GROUND,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0),
            disableDepthTestDistance : 10.0
        };

        var point = new PointGraphics(options);
        expect(point.color).toBeInstanceOf(ConstantProperty);
        expect(point.pixelSize).toBeInstanceOf(ConstantProperty);
        expect(point.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(point.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(point.show).toBeInstanceOf(ConstantProperty);
        expect(point.scaleByDistance).toBeInstanceOf(ConstantProperty);
        expect(point.heightReference).toBeInstanceOf(ConstantProperty);
        expect(point.distanceDisplayCondition).toBeInstanceOf(ConstantProperty);
        expect(point.disableDepthTestDistance).toBeInstanceOf(ConstantProperty);

        expect(point.color.getValue()).toEqual(options.color);
        expect(point.pixelSize.getValue()).toEqual(options.pixelSize);
        expect(point.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(point.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(point.show.getValue()).toEqual(options.show);
        expect(point.scaleByDistance.getValue()).toEqual(options.scaleByDistance);
        expect(point.heightReference.getValue()).toEqual(options.heightReference);
        expect(point.distanceDisplayCondition.getValue()).toEqual(options.distanceDisplayCondition);
        expect(point.disableDepthTestDistance.getValue()).toEqual(options.disableDepthTestDistance);
    });

    it('merge assigns unassigned properties', function() {
        var source = new PointGraphics();
        source.color = new ConstantProperty(Color.WHITE);
        source.pixelSize = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = new ConstantProperty(10.0);

        var target = new PointGraphics();
        target.merge(source);
        expect(target.color).toBe(source.color);
        expect(target.pixelSize).toBe(source.pixelSize);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.show).toBe(source.show);
        expect(target.scaleByDistance).toBe(source.scaleByDistance);
        expect(target.heightReference).toBe(source.heightReference);
        expect(target.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(target.disableDepthTestDistance).toBe(source.disableDepthTestDistance);
    });

    it('merge does not assign assigned properties', function() {
        var source = new PointGraphics();
        source.color = new ConstantProperty(Color.WHITE);
        source.pixelSize = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = new ConstantProperty(10.0);

        var color = new ConstantProperty(Color.WHITE);
        var pixelSize = new ConstantProperty(1);
        var outlineColor = new ConstantProperty(Color.WHITE);
        var outlineWidth = new ConstantProperty(1);
        var show = new ConstantProperty(true);
        var heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        var distanDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        var disableDepthTestDistance = new ConstantProperty(20.0);

        var target = new PointGraphics();
        target.color = color;
        target.pixelSize = pixelSize;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.show = show;
        target.scaleByDistance = show;
        target.heightReference = heightReference;
        target.distanceDisplayCondition = distanDisplayCondition;
        target.disableDepthTestDistance = disableDepthTestDistance;

        target.merge(source);
        expect(target.color).toBe(color);
        expect(target.pixelSize).toBe(pixelSize);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.show).toBe(show);
        expect(target.scaleByDistance).toBe(show);
        expect(target.heightReference).toBe(heightReference);
        expect(target.distanceDisplayCondition).toBe(distanDisplayCondition);
        expect(target.disableDepthTestDistance).toBe(disableDepthTestDistance);
    });

    it('clone works', function() {
        var source = new PointGraphics();
        source.color = new ConstantProperty(Color.WHITE);
        source.pixelSize = new ConstantProperty(1);
        source.outlineColor = new ConstantProperty(Color.WHITE);
        source.outlineWidth = new ConstantProperty(1);
        source.show = new ConstantProperty(true);
        source.scaleByDistance = new ConstantProperty(new NearFarScalar());
        source.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        source.distanceDisplayCondition = new ConstantProperty(new DistanceDisplayCondition(10.0, 100.0));
        source.disableDepthTestDistance = new ConstantProperty(10.0);

        var result = source.clone();
        expect(result.color).toBe(source.color);
        expect(result.pixelSize).toBe(source.pixelSize);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.show).toBe(source.show);
        expect(result.scaleByDistance).toBe(source.scaleByDistance);
        expect(result.heightReference).toBe(source.heightReference);
        expect(result.distanceDisplayCondition).toBe(source.distanceDisplayCondition);
        expect(result.disableDepthTestDistance).toBe(source.disableDepthTestDistance);
    });

    it('merge throws if source undefined', function() {
        var target = new PointGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});
