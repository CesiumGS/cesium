/*global defineSuite*/
defineSuite([
        'DataSources/ModelTransformProperty',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/TimeInterval',
        'DataSources/ConstantProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Specs/testDefinitionChanged'
    ], function(
        ModelTransformProperty,
        Cartesian3,
        JulianDate,
        Quaternion,
        TimeInterval,
        ConstantProperty,
        TimeIntervalCollectionProperty,
        testDefinitionChanged
        ) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('default constructor sets expected values', function() {
        var property = new ModelTransformProperty();
        expect(property.isConstant).toBe(true);
        expect(property.scale).toBeUndefined();
        expect(property.translate).toBeUndefined();
        expect(property.rotate).toBeUndefined();

        var result = property.getValue();
        expect(result.scale).toEqual(new Cartesian3(1.0, 1.0, 1.0));
        expect(result.translate).toEqual(new Cartesian3(0.0, 0.0, 0.0));
        expect(result.rotate).toEqual(Quaternion.IDENTITY);
    });

    it('constructor sets options and allows raw assignment', function() {
        var options = {
            scale : Cartesian3.UNIT_X,
            translate : Cartesian3.UNIT_Y,
            rotate : Quaternion.IDENTITY
        };

        var property = new ModelTransformProperty(options);
        expect(property.scale).toBeInstanceOf(ConstantProperty);
        expect(property.translate).toBeInstanceOf(ConstantProperty);
        expect(property.rotate).toBeInstanceOf(ConstantProperty);

        expect(property.scale.getValue()).toEqual(options.scale);
        expect(property.translate.getValue()).toEqual(options.translate);
        expect(property.rotate.getValue()).toEqual(options.rotate);
    });

    it('works with constant values', function() {
        var property = new ModelTransformProperty();
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);
        property.translate = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotate = new ConstantProperty(Quaternion.IDENTITY);

        var result = property.getValue(JulianDate.now());
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translate).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotate).toEqual(Quaternion.IDENTITY);
    });

    it('works with dynamic values', function() {
        var property = new ModelTransformProperty();
        property.scale = new TimeIntervalCollectionProperty();
        property.translate = new TimeIntervalCollectionProperty();
        property.rotate = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.scale.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Cartesian3.UNIT_X
        }));
        property.translate.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Cartesian3.UNIT_Y
        }));
        property.rotate.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Quaternion.IDENTITY
        }));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translate).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotate).toEqual(Quaternion.IDENTITY);
    });

    it('works with a result parameter', function() {
        var property = new ModelTransformProperty();
        property.scale = new ConstantProperty(Cartesian3.UNIT_X);
        property.translate = new ConstantProperty(Cartesian3.UNIT_Y);
        property.rotate = new ConstantProperty(Quaternion.IDENTITY);

        var result = {
            scale : Cartesian3.ZERO.clone(),
            translate : Cartesian3.ZERO.clone(),
            rotate : Quaternion.ZERO.clone()
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.scale).toEqual(Cartesian3.UNIT_X);
        expect(result.translate).toEqual(Cartesian3.UNIT_Y);
        expect(result.rotate).toEqual(Quaternion.IDENTITY);
    });

    it('equals works', function() {
        var left = new ModelTransformProperty();
        left.scale = new ConstantProperty(Cartesian3.UNIT_X);
        left.translate = new ConstantProperty(Cartesian3.UNIT_Y);
        left.rotate = new ConstantProperty(Quaternion.IDENTITY);

        var right = new ModelTransformProperty();
        right.scale = new ConstantProperty(Cartesian3.UNIT_X);
        right.translate = new ConstantProperty(Cartesian3.UNIT_Y);
        right.rotate = new ConstantProperty(Quaternion.IDENTITY);
        expect(left.equals(right)).toEqual(true);

        right.scale = new ConstantProperty(Cartesian3.ZERO);
        expect(left.equals(right)).toEqual(false);

        right.scale = new ConstantProperty(Cartesian3.UNIT_X);
        right.translate = new ConstantProperty(Cartesian3.ZERO);
        expect(left.equals(right)).toEqual(false);

        right.translate = new ConstantProperty(Cartesian3.UNIT_Y);
        right.rotate = new ConstantProperty(Quaternion.ZERO);
        expect(left.equals(right)).toEqual(false);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new ModelTransformProperty();
        testDefinitionChanged(property, 'scale', Cartesian3.UNIT_X, Cartesian3.ZERO);
        testDefinitionChanged(property, 'rotate', Cartesian3.UNIT_X, Cartesian3.ZERO);
        testDefinitionChanged(property, 'translate', Quaternion.IDENTITY, Quaternion.ZERO);
    });
});