defineSuite([
        'DataSources/ImageMaterialProperty',
        'Core/Cartesian2',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/TimeIntervalCollectionProperty'
    ], function(
        ImageMaterialProperty,
        Cartesian2,
        Color,
        JulianDate,
        TimeInterval,
        ConstantProperty,
        TimeIntervalCollectionProperty) {
    'use strict';

    it('constructor provides the expected defaults', function() {
        var property = new ImageMaterialProperty();
        expect(property.getType()).toEqual('Image');

        var result = property.getValue();
        expect(result.image).toBeUndefined();
        expect(result.repeat).toEqual(new Cartesian2(1.0, 1.0));
        expect(result.color).toEqual(Color.WHITE);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            image : 'test.invalid',
            repeat : new Cartesian2(1, 2),
            color : Color.RED.withAlpha(0.5),
            transparent: true
        };

        var property = new ImageMaterialProperty(options);
        expect(property.image).toBeInstanceOf(ConstantProperty);
        expect(property.repeat).toBeInstanceOf(ConstantProperty);
        expect(property.color).toBeInstanceOf(ConstantProperty);
        expect(property.transparent).toBeInstanceOf(ConstantProperty);

        expect(property.image.getValue()).toEqual(options.image);
        expect(property.repeat.getValue()).toEqual(options.repeat);
        expect(property.color.getValue()).toEqual(options.color);
        expect(property.transparent.getValue()).toEqual(options.transparent);
    });

    it('works with constant values', function() {
        var property = new ImageMaterialProperty();
        property.image = new ConstantProperty('http://test.invalid/image.png');
        property.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var result = property.getValue(JulianDate.now());
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('works with dynamic values', function() {
        var property = new ImageMaterialProperty();
        property.image = new TimeIntervalCollectionProperty();
        property.repeat = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.image.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 'http://test.invalid/image.png'
        }));
        property.repeat.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Cartesian2(2, 3)
        }));

        var result = property.getValue(start);
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('works with a result parameter', function() {
        var property = new ImageMaterialProperty();
        property.image = new ConstantProperty('http://test.invalid/image.png');
        property.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var result = {};
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(result).toBe(returnedResult);
        expect(result.image).toEqual('http://test.invalid/image.png');
        expect(result.repeat).toEqual(new Cartesian2(2, 3));
    });

    it('equals works', function() {
        var left = new ImageMaterialProperty();
        left.image = new ConstantProperty('http://test.invalid/image.png');
        left.repeat = new ConstantProperty(new Cartesian2(2, 3));

        var right = new ImageMaterialProperty();
        right.image = new ConstantProperty('http://test.invalid/image.png');
        right.repeat = new ConstantProperty(new Cartesian2(2, 3));

        expect(left.equals(right)).toEqual(true);

        right.image = new ConstantProperty('http://test.invalid/image2.png');
        expect(left.equals(right)).toEqual(false);

        right.image = left.image;
        right.repeat = new ConstantProperty(new Cartesian2(3, 2));
        expect(left.equals(right)).toEqual(false);

        right.repeat = left.repeat;
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new ImageMaterialProperty();
        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var oldValue = property.image;
        property.image = new ConstantProperty('http://test.invalid/image.png');
        expect(listener).toHaveBeenCalledWith(property, 'image', property.image, oldValue);
        listener.calls.reset();

        property.image.setValue('http://test.invalid/image2.png');
        expect(listener).toHaveBeenCalledWith(property, 'image', property.image, property.image);
        listener.calls.reset();

        property.image = property.image;
        expect(listener.calls.count()).toEqual(0);
        listener.calls.reset();

        oldValue = property.repeat;
        property.repeat = new ConstantProperty(new Cartesian2(1.5, 1.5));
        expect(listener).toHaveBeenCalledWith(property, 'repeat', property.repeat, oldValue);
        listener.calls.reset();

        property.repeat.setValue(new Cartesian2(1.0, 1.0));
        expect(listener).toHaveBeenCalledWith(property, 'repeat', property.repeat, property.repeat);
        listener.calls.reset();

        property.repeat = property.repeat;
        expect(listener.calls.count()).toEqual(0);
    });

    it('isConstant is only true when all properties are constant or undefined', function() {
        var property = new ImageMaterialProperty();
        expect(property.isConstant).toBe(true);

        property.image = undefined;
        property.repeat = undefined;
        expect(property.isConstant).toBe(true);

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.image = new TimeIntervalCollectionProperty();
        property.image.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 'http://test.invalid/image.png'
        }));
        expect(property.isConstant).toBe(false);

        property.image = undefined;
        expect(property.isConstant).toBe(true);
        property.repeat = new TimeIntervalCollectionProperty();
        property.repeat.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Cartesian2(2, 3)
        }));
        expect(property.isConstant).toBe(false);
    });
});
