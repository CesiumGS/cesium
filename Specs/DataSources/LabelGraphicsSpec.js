/*global defineSuite*/
defineSuite([
        'DataSources/LabelGraphics',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/NearFarScalar',
        'DataSources/ConstantProperty',
        'Scene/HorizontalOrigin',
        'Scene/LabelStyle',
        'Scene/VerticalOrigin'
    ], function(
        LabelGraphics,
        Cartesian2,
        Cartesian3,
        Color,
        NearFarScalar,
        ConstantProperty,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var options = {
            text : '0',
            font : '1',
            style :LabelStyle.FILL,
            fillColor : Color.RED,
            outlineColor : Color.BLUE,
            outlineWidth : 2,
            horizontalOrigin : HorizontalOrigin.LEFT,
            verticalOrigin : VerticalOrigin.BOTTOM,
            eyeOffset : new Cartesian3(3, 4, 5),
            pixelOffset : new Cartesian2(6, 7),
            scale : 8,
            show : true,
            translucencyByDistance : new NearFarScalar(9, 10, 11, 12),
            pixelOffsetScaleByDistance : new NearFarScalar(13, 14, 15, 16)
        };

        var label = new LabelGraphics(options);
        expect(label.text).toBeInstanceOf(ConstantProperty);
        expect(label.font).toBeInstanceOf(ConstantProperty);
        expect(label.style).toBeInstanceOf(ConstantProperty);
        expect(label.fillColor).toBeInstanceOf(ConstantProperty);
        expect(label.outlineColor).toBeInstanceOf(ConstantProperty);
        expect(label.outlineWidth).toBeInstanceOf(ConstantProperty);
        expect(label.horizontalOrigin).toBeInstanceOf(ConstantProperty);
        expect(label.verticalOrigin).toBeInstanceOf(ConstantProperty);
        expect(label.eyeOffset).toBeInstanceOf(ConstantProperty);
        expect(label.scale).toBeInstanceOf(ConstantProperty);
        expect(label.show).toBeInstanceOf(ConstantProperty);
        expect(label.translucencyByDistance).toBeInstanceOf(ConstantProperty);
        expect(label.pixelOffsetScaleByDistance).toBeInstanceOf(ConstantProperty);

        expect(label.text.getValue()).toEqual(options.text);
        expect(label.font.getValue()).toEqual(options.font);
        expect(label.style.getValue()).toEqual(options.style);
        expect(label.fillColor.getValue()).toEqual(options.fillColor);
        expect(label.outlineColor.getValue()).toEqual(options.outlineColor);
        expect(label.outlineWidth.getValue()).toEqual(options.outlineWidth);
        expect(label.horizontalOrigin.getValue()).toEqual(options.horizontalOrigin);
        expect(label.verticalOrigin.getValue()).toEqual(options.verticalOrigin);
        expect(label.eyeOffset.getValue()).toEqual(options.eyeOffset);
        expect(label.scale.getValue()).toEqual(options.scale);
        expect(label.show.getValue()).toEqual(options.show);
        expect(label.translucencyByDistance.getValue()).toEqual(options.translucencyByDistance);
        expect(label.pixelOffsetScaleByDistance.getValue()).toEqual(options.pixelOffsetScaleByDistance);
    });

    it('merge assigns unassigned properties', function() {
        var source = new LabelGraphics();
        source.text = new ConstantProperty('not it');
        source.font = new ConstantProperty('arial');
        source.style = new ConstantProperty(LabelStyle.FILL);
        source.fillColor = new ConstantProperty(Color.BLACK);
        source.outlineColor = new ConstantProperty(Color.BLUE);
        source.outlineWidth = new ConstantProperty(5);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));

        var target = new LabelGraphics();
        target.merge(source);

        expect(target.text).toBe(source.text);
        expect(target.font).toBe(source.font);
        expect(target.style).toBe(source.style);
        expect(target.fillColor).toBe(source.fillColor);
        expect(target.outlineColor).toBe(source.outlineColor);
        expect(target.outlineWidth).toBe(source.outlineWidth);
        expect(target.horizontalOrigin).toBe(source.horizontalOrigin);
        expect(target.verticalOrigin).toBe(source.verticalOrigin);
        expect(target.eyeOffset).toBe(source.eyeOffset);
        expect(target.pixelOffset).toBe(source.pixelOffset);
        expect(target.scale).toBe(source.scale);
        expect(target.show).toBe(source.show);
        expect(target.translucencyByDistance).toBe(source.translucencyByDistance);
        expect(target.pixelOffsetScaleByDistance).toBe(source.pixelOffsetScaleByDistance);
    });

    it('merge does not assign assigned properties', function() {
        var source = new LabelGraphics();
        source.text = new ConstantProperty('not it');
        source.font = new ConstantProperty('arial');
        source.style = new ConstantProperty(LabelStyle.FILL);
        source.fillColor = new ConstantProperty(Color.BLACK);
        source.outlineColor = new ConstantProperty(Color.BLUE);
        source.outlineWidth = new ConstantProperty(5);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));

        var text = new ConstantProperty('my text');
        var font = new ConstantProperty('10px serif');
        var style = new ConstantProperty(LabelStyle.OUTLINE);
        var fillColor = new ConstantProperty(Color.RED);
        var outlineColor = new ConstantProperty(Color.WHITE);
        var outlineWidth = new ConstantProperty(4);
        var horizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
        var verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
        var eyeOffset = new ConstantProperty(Cartesian3.UNIT_Z);
        var pixelOffset = new ConstantProperty(Cartesian2.UNIT_Y);
        var scale = new ConstantProperty(2);
        var show = new ConstantProperty(true);
        var translucencyByDistance = new ConstantProperty(new NearFarScalar());
        var pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar());

        var target = new LabelGraphics();
        target.text = text;
        target.font = font;
        target.style = style;
        target.fillColor = fillColor;
        target.outlineColor = outlineColor;
        target.outlineWidth = outlineWidth;
        target.horizontalOrigin = horizontalOrigin;
        target.verticalOrigin = verticalOrigin;
        target.eyeOffset = eyeOffset;
        target.pixelOffset = pixelOffset;
        target.scale = scale;
        target.show = show;
        target.translucencyByDistance = translucencyByDistance;
        target.pixelOffsetScaleByDistance = pixelOffsetScaleByDistance;

        target.merge(source);

        expect(target.text).toBe(text);
        expect(target.font).toBe(font);
        expect(target.style).toBe(style);
        expect(target.fillColor).toBe(fillColor);
        expect(target.outlineColor).toBe(outlineColor);
        expect(target.outlineWidth).toBe(outlineWidth);
        expect(target.horizontalOrigin).toBe(horizontalOrigin);
        expect(target.verticalOrigin).toBe(verticalOrigin);
        expect(target.eyeOffset).toBe(eyeOffset);
        expect(target.pixelOffset).toBe(pixelOffset);
        expect(target.scale).toBe(scale);
        expect(target.show).toBe(show);
        expect(target.translucencyByDistance).toBe(translucencyByDistance);
        expect(target.pixelOffsetScaleByDistance).toBe(pixelOffsetScaleByDistance);
    });

    it('clone works', function() {
        var source = new LabelGraphics();
        source.text = new ConstantProperty('not it');
        source.font = new ConstantProperty('arial');
        source.style = new ConstantProperty(LabelStyle.FILL);
        source.fillColor = new ConstantProperty(Color.BLACK);
        source.outlineColor = new ConstantProperty(Color.BLUE);
        source.outlineWidth = new ConstantProperty(5);
        source.horizontalOrigin = new ConstantProperty(HorizontalOrigin.LEFT);
        source.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        source.eyeOffset = new ConstantProperty(Cartesian3.UNIT_Y);
        source.pixelOffset = new ConstantProperty(Cartesian2.UNIT_X);
        source.scale = new ConstantProperty(1);
        source.show = new ConstantProperty(false);
        source.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        source.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));

        var result = source.clone();
        expect(result.text).toBe(source.text);
        expect(result.font).toBe(source.font);
        expect(result.style).toBe(source.style);
        expect(result.fillColor).toBe(source.fillColor);
        expect(result.outlineColor).toBe(source.outlineColor);
        expect(result.outlineWidth).toBe(source.outlineWidth);
        expect(result.horizontalOrigin).toBe(source.horizontalOrigin);
        expect(result.verticalOrigin).toBe(source.verticalOrigin);
        expect(result.eyeOffset).toBe(source.eyeOffset);
        expect(result.pixelOffset).toBe(source.pixelOffset);
        expect(result.scale).toBe(source.scale);
        expect(result.show).toBe(source.show);
        expect(result.translucencyByDistance).toBe(source.translucencyByDistance);
        expect(result.pixelOffsetScaleByDistance).toBe(source.pixelOffsetScaleByDistance);
    });

    it('merge throws if source undefined', function() {
        var target = new LabelGraphics();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});
