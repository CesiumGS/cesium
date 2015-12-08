/*global defineSuite*/
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
    "use strict";

    it('default constructor sets expected values', function() {
        var property = new NodeTransformationProperty();
        expect(property.isConstant).toBe(true);
        expect(property.scale).toBeUndefined();
        expect(property.translation).toBeUndefined();
        expect(property.rotation).toBeUndefined();

        var result = property.getValue();
        expect(result.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
        expect(result.translation).toEqual(Cartesian3.ZERO);
        expect(result.rotation).toEqual(Quaternion.IDENTITY);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            scale : Cartesian3.UNIT_X,
            translation : Cartesian3.UNIT_Y,
            rotation : new Quaternion(0.5, 0.5, 0.5, 0.5)
        };

        var property = new NodeTransformationProperty(options);
        expect(property.scale).toBeInstanceOf(ConstantProperty);
        expect(property.translation).toBeInstanceOf(ConstantProperty);
        expect(property.rotation).toBeInstanceOf(ConstantProperty);

        expect(property.scale.getValue()).toEqual(options.scale);
        expect(property.translation.getValue()).toEqual(options.translation);
        expect(property.rotation.getValue()).toEqual(options.rotation);
    });

    it('works with constant values', function() {
        var property = new NodeTransformationProperty();
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);
        property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));

        var result = property.getValue(JulianDate.now());
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translation).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    });

    it('works with dynamic values', function() {
        var property = new NodeTransformationProperty();
        property.scale = new TimeIntervalCollectionProperty();
        property.translation = new TimeIntervalCollectionProperty();
        property.rotation = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.scale.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Cartesian3.UNIT_X
        }));
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

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translation).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    });

    it('works with a result parameter', function() {
        var property = new NodeTransformationProperty();
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);
        property.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));

        var result = {
            scale : new Cartesian3(),
            translation : new Cartesian3(),
            rotation : new Quaternion()
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translation).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotation).toEqual(new Quaternion(0.5, 0.5, 0.5, 0.5));
    });

    it('equals works', function() {
        var left = new NodeTransformationProperty();
        left.scale = new ConstantProperty(Cartesian3.UNIT_X);
        left.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        left.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));

        var right = new NodeTransformationProperty();
        right.scale = new ConstantProperty(Cartesian3.UNIT_X);
        right.translation = new ConstantProperty(Cartesian3.UNIT_Y);
        right.rotation = new ConstantProperty(new Quaternion(0.5, 0.5, 0.5, 0.5));
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
        testDefinitionChanged(property, 'scale', Cartesian3.UNIT_X, Cartesian3.ZERO);
        testDefinitionChanged(property, 'rotation', Cartesian3.UNIT_X, Cartesian3.ZERO);
        testDefinitionChanged(property, 'translation', new Quaternion(0.5, 0.5, 0.5, 0.5), Quaternion.ZERO);
    });
});