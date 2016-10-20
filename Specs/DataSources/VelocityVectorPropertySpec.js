/*global defineSuite*/
defineSuite([
        'DataSources/VelocityVectorProperty',
        'Core/Cartesian3',
        'Core/Event',
        'Core/ExtrapolationType',
        'Core/JulianDate',
        'Core/Math',
        'DataSources/CallbackProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/SampledPositionProperty'
    ], function(
        VelocityVectorProperty,
        Cartesian3,
        Event,
        ExtrapolationType,
        JulianDate,
        CesiumMath,
        CallbackProperty,
        ConstantPositionProperty,
        SampledPositionProperty) {
    'use strict';

    var time = JulianDate.now();

    it('can default construct', function() {
        var property = new VelocityVectorProperty();
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBeUndefined();
        expect(property.getValue(time)).toBeUndefined();
        expect(property.normalize).toBe(true);
    });

    it('can construct with arguments', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityVectorProperty(position, false);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBe(position);
        expect(property.getValue(time)).toEqual(Cartesian3.ZERO);
        expect(property.normalize).toBe(false);
    });

    it('raises definitionChanged event when position is set', function() {
        var property = new VelocityVectorProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var position = new SampledPositionProperty();
        property.position = position;
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('raises definitionChanged event when normalize changes', function() {
        var property = new VelocityVectorProperty(new SampledPositionProperty());

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.normalize = true;
        expect(listener.calls.count()).toBe(0);

        property.normalize = false;
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('subscribes and unsubscribes to position definitionChanged and propagates up', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityVectorProperty(position);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        //Position changing should raise out property change event
        position.definitionChanged.raiseEvent(position);
        expect(listener).toHaveBeenCalledWith(property);

        //Make sure it unsubscribes when value is changed
        property.position = undefined;

        listener.calls.reset();
        position.definitionChanged.raiseEvent(position);
        expect(listener.calls.count()).toBe(0);
    });

    it('does not raise definitionChanged event when position is set to the same instance', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityVectorProperty(position);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.position = position;
        expect(listener.calls.count()).toBe(0);
    });

    it('produces correct normalized value when called without result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
        var values = [new Cartesian3(0.0, 0.0, 0.0), new Cartesian3(20.0, 0.0, 0.0)];

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityVectorProperty(position);

        var expectedVelocityDirection = new Cartesian3(1.0, 0.0, 0.0);
        expect(property.getValue(times[0])).toEqual(expectedVelocityDirection);
        expect(property.getValue(times[1])).toEqual(expectedVelocityDirection);
    });

    it('produces correct normalized value when called with result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
        var values = [new Cartesian3(0.0, 0.0, 0.0), new Cartesian3(20.0, 0.0, 0.0)];

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityVectorProperty(position);

        var expectedVelocityDirection = new Cartesian3(1.0, 0.0, 0.0);

        var expected = new Cartesian3();
        var result = property.getValue(times[0], expected);
        expect(result).toBe(expected);
        expect(result).toEqual(expectedVelocityDirection);
    });

    it('produces correct unnormalized value when called without result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0)];
        var values = [new Cartesian3(0.0, 0.0, 0.0), new Cartesian3(20.0, 0.0, 0.0)];

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityVectorProperty(position, false);

        var expectedVelocity = new Cartesian3(20.0, 0.0, 0.0);
        expect(property.getValue(times[0])).toEqualEpsilon(expectedVelocity, CesiumMath.EPSILON13);
        expect(property.getValue(times[1])).toEqualEpsilon(expectedVelocity, CesiumMath.EPSILON13);
    });

    it('produces correct unnormalized value when called with result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0)];
        var values = [new Cartesian3(0.0, 0.0, 0.0), new Cartesian3(20.0, 0.0, 0.0)];

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityVectorProperty(position, false);

        var expectedVelocity = new Cartesian3(20.0, 0.0, 0.0);

        var expected = new Cartesian3();
        var result = property.getValue(times[0], expected);
        expect(result).toBe(expected);
        expect(result).toEqualEpsilon(expectedVelocity, CesiumMath.EPSILON13);
    });

    it('produces normalized value of undefined with constant position', function() {
        var position = new ConstantPositionProperty(new Cartesian3(1.0, 2.0, 3.0));

        var property = new VelocityVectorProperty(position);
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('produces unnormalized value of zero with constant position', function() {
        var position = new ConstantPositionProperty(new Cartesian3(1.0, 2.0, 3.0));

        var property = new VelocityVectorProperty(position, false);
        expect(property.getValue(new JulianDate())).toEqual(Cartesian3.ZERO);
    });

    it('produces normalized value of undefined at zero velocity', function() {
        var position = new CallbackProperty(function() {
            return new Cartesian3(0, 0, 0);
        }, false);

        var property = new VelocityVectorProperty(position);
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('produces unnormalized value of zero at zero velocity', function() {
        var position = new CallbackProperty(function() {
            return new Cartesian3(0, 0, 0);
        }, false);

        var property = new VelocityVectorProperty(position, false);
        expect(property.getValue(new JulianDate())).toEqual(Cartesian3.ZERO);
    });

    it('returns undefined when position value is undefined', function() {
        var position = new SampledPositionProperty();
        position.addSample(new JulianDate(1, 0), new Cartesian3(0.0, 0.0, 0.0));
        position.forwardExtrapolationType = ExtrapolationType.NONE;
        position.backwardExtrapolationType = ExtrapolationType.NONE;

        var property = new VelocityVectorProperty(position);

        var result = property.getValue(new JulianDate());
        expect(result).toBeUndefined();
    });

    it('returns undefined when position has exactly one value', function() {
        var position = new SampledPositionProperty();
        position.addSample(new JulianDate(1, 0), new Cartesian3(0.0, 0.0, 0.0));
        position.forwardExtrapolationType = ExtrapolationType.NONE;
        position.backwardExtrapolationType = ExtrapolationType.NONE;

        var property = new VelocityVectorProperty(position);

        var result = property.getValue(new JulianDate(1, 0));
        expect(result).toBeUndefined();
    });

    it('equals works', function() {
        var position = new SampledPositionProperty();

        var left = new VelocityVectorProperty();
        var right = new VelocityVectorProperty();

        expect(left.equals(right)).toBe(true);

        left.position = position;
        expect(left.equals(right)).toBe(false);

        right.position = position;
        expect(left.equals(right)).toBe(true);
    });

    it('getValue throws without time', function() {
        var property = new VelocityVectorProperty();
        expect(function() {
            property.getValue();
        }).toThrowDeveloperError();
    });
});
