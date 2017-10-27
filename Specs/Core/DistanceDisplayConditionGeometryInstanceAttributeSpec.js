defineSuite([
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/ComponentDatatype',
        'Core/DistanceDisplayCondition'
    ], function(
        DistanceDisplayConditionGeometryInstanceAttribute,
        ComponentDatatype,
        DistanceDisplayCondition) {
    'use strict';

    it('constructor', function() {
        var attribute = new DistanceDisplayConditionGeometryInstanceAttribute(10.0, 100.0);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(attribute.componentsPerAttribute).toEqual(2);
        expect(attribute.normalize).toEqual(false);

        var value = new Float32Array([10.0, 100.0]);
        expect(attribute.value).toEqual(value);
    });

    it('constructor throws with far > near', function() {
        expect(function() {
            return new DistanceDisplayConditionGeometryInstanceAttribute(100.0, 10.0);
        }).toThrowDeveloperError();
    });

    it('fromDistanceDisplayCondition', function() {
        var dc = new DistanceDisplayCondition(10.0, 100.0);
        var attribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(dc);
        expect(attribute.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(attribute.componentsPerAttribute).toEqual(2);
        expect(attribute.normalize).toEqual(false);

        var value = new Float32Array([dc.near, dc.far]);
        expect(attribute.value).toEqual(value);
    });

    it('fromDistanceDisplayCondition throws without distanceDisplayCondition', function() {
        expect(function() {
            DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition();
        }).toThrowDeveloperError();
    });

    it('fromDistanceDisplayCondition throws with far >= near', function() {
        expect(function() {
            DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(new DistanceDisplayCondition(100.0, 10.0));
        }).toThrowDeveloperError();
    });

    it('toValue', function() {
        var dc = new DistanceDisplayCondition(10.0, 200.0);
        var expectedResult = new Float32Array([dc.near, dc.far]);
        expect(DistanceDisplayConditionGeometryInstanceAttribute.toValue(dc)).toEqual(expectedResult);
    });

    it('toValue works with result parameter', function() {
        var dc = new DistanceDisplayCondition(10.0, 200.0);
        var expectedResult = new Float32Array([dc.near, dc.far]);
        var result = new Float32Array(2);
        var returnedResult = DistanceDisplayConditionGeometryInstanceAttribute.toValue(dc, result);
        expect(returnedResult).toBe(result);
        expect(returnedResult).toEqual(expectedResult);
    });

    it('toValue throws without a distanceDisplayCondition', function() {
        expect(function() {
            DistanceDisplayConditionGeometryInstanceAttribute.toValue();
        }).toThrowDeveloperError();
    });
});
