defineSuite([
        'DataSources/NodeTransformationProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Specs/testDefinitionChanged'
    ], function(
        NodeTransformationProperty,
        Cartesian3,
        JulianDate,
        Quaternion,
        TimeInterval,
        ConstantProperty,
        TimeIntervalCollectionProperty,
        testDefinitionChanged) {
    'use strict';

    it('default constructor sets expected values', function() {
        var property = new NodeTransformationProperty();
        expect(property.isConstant).toBe(true);
        expect(property.translation).toBeUndefined();
        expect(property.rotation).toBeUndefined();
        expect(property.scale).toBeUndefined();

        var result = property.getValue();
        expect(result.translation).toEqual(Cartesian3.ZERO);
        expect(result.rotation).toEqual(Quaternion.IDENTITY);
        expect(result.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            translation : Cartesian3.UNIT_Y,
            rotation : new Quaternion(0.5, 0.5, 0.5, 0.5),
            scale : Cartesian3.UNIT_X
        };

        var property = new NodeTransformationProperty(options);
        expect(property.translation).toBeInstanceOf(ConstantProperty);
        expect(property.rotation).toBeInstanceOf(ConstantProperty);
        expect(property.scale).toBeInstanceOf(ConstantProperty);

        expect(property.translation.getValue()).toEqual(options.translation);
        expect(property.rotation.getValue()).toEqual(options.rotation);
        expect(property.scale.getValue()).toEqual(options.scale);
    });

    it('works with constant values', function() {
        var property = new NodeTransformationProperty();
        property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);

        var result = property.getValue(JulianDate.now());
        expect(result.translation).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
    });

    it('works with dynamic values', function() {
        var property = new NodeTransformationProperty();
        property.translation = new TimeIntervalCollectionProperty();
        property.rotation = new TimeIntervalCollectionProperty();
        property.scale = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.translation.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Cartesian3.UNIT_Y
        }));
        property.rotation.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : new Quaternion(0.5, 0.5, 0.5, 0.5)
        }));
        property.scale.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Cartesian3.UNIT_X
        }));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.translation).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
    });

    it('works with a result parameter', function() {
        var property = new NodeTransformationProperty();
        property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);

        var translation = new Cartesian3();
        var rotation = new Quaternion();
        var scale = new Cartesian3();
        var result = {
            translation : translation,
            rotation : rotation,
            scale : scale
        };

        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(returnedResult.translation).toBe(translation);
        expect(returnedResult.translation).toEqual(Cartesian3.UNIT_Y);
        expect(returnedResult.rotation).toBe(rotation);
        expect(returnedResult.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
        expect(returnedResult.scale).toBe(scale);
        expect(returnedResult.scale).toEqual(Cartesian3.UNIT_X);
    });

    it('equals works', function() {
        var left = new NodeTransformationProperty();
        left.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        left.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
        left.scale = new ConstantProperty(Cartesian3.UNIT_X);

        var right = new NodeTransformationProperty();
        right.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        right.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
        right.scale = new ConstantProperty(Cartesian3.UNIT_X);
        expect(left.equals(right)).toEqual(true);

        right.scale = new ConstantProperty(Cartesian3.ZERO);
        expect(left.equals(right)).toEqual(false);

        right.scale = new ConstantProperty(Cartesian3.UNIT_X);
        right.translation = new ConstantProperty(Cartesian3.ZERO);
        expect(left.equals(right)).toEqual(false);

        right.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        right.rotation = new ConstantProperty(Quaternion.ZERO);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new NodeTransformationProperty();
        testDefinitionChanged(property, 'rotation', Cartesian3.UNIT_X, Cartesian3.ZERO);
        testDefinitionChanged(property, 'translation', new Quaternion(0.5, 0.5, 0.5, 0.5), Quaternion.ZERO);
        testDefinitionChanged(property, 'scale', Cartesian3.UNIT_X, Cartesian3.ZERO);
    });
});
