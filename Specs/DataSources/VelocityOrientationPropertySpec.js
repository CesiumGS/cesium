defineSuite([
        'DataSources/VelocityOrientationProperty',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/ExtrapolationType',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/Transforms',
        'DataSources/CallbackProperty',
        'DataSources/SampledPositionProperty'
    ], function(
        VelocityOrientationProperty,
        Cartesian3,
        Ellipsoid,
        Event,
        ExtrapolationType,
        JulianDate,
        Quaternion,
        Transforms,
        CallbackProperty,
        SampledPositionProperty) {
    'use strict';

    var time = JulianDate.now();

    it('can default construct', function() {
        var property = new VelocityOrientationProperty();
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBeUndefined();
        expect(property.ellipsoid).toBe(Ellipsoid.WGS84);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('can construct with arguments', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityOrientationProperty(position, Ellipsoid.UNIT_SPHERE);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBe(position);
        expect(property.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
        expect(property.getValue(time)).toBeUndefined();
    });

    it('setting position raises definitionChanged event', function() {
        var property = new VelocityOrientationProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var position = new SampledPositionProperty();
        property.position = position;
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('subscribes/unsubscribes to position definitionChanged and propagates up', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityOrientationProperty(position);

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

    it('setting position does not raise definitionChanged event for same data', function() {
        var position = new SampledPositionProperty();
        var property = new VelocityOrientationProperty(position);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.position = position;
        expect(listener.calls.count()).toBe(0);
    });

    it('setting ellipsoid raises definitionChanged event', function() {
        var property = new VelocityOrientationProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.ellipsoid = Ellipsoid.UNIT_SPHERE;
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('setting ellipsoid does not raise definitionChanged event for same data', function() {
        var property = new VelocityOrientationProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.ellipsoid = Ellipsoid.WGS84;
        expect(listener.calls.count()).toBe(0);
    });

    it('works without result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
        var values = [Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(1, 0, 0)];
        var velocity = Cartesian3.subtract(values[1], values[0], new Cartesian3());
        Cartesian3.normalize(velocity, velocity);

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityOrientationProperty(position);

        var matrix = Transforms.rotationMatrixFromPositionVelocity(position.getValue(times[0]), velocity);
        expect(property.getValue(times[0])).toEqual(Quaternion.fromRotationMatrix(matrix));

        matrix = Transforms.rotationMatrixFromPositionVelocity(position.getValue(times[0]), velocity);
        expect(property.getValue(times[1])).toEqual(Quaternion.fromRotationMatrix(matrix));
    });

    it('works with result parameter', function() {
        var times = [new JulianDate(0, 0), new JulianDate(0, 1.0 / 60.0)];
        var values = [Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(1, 0, 0)];
        var velocity = Cartesian3.subtract(values[1], values[0], new Cartesian3());
        Cartesian3.normalize(velocity, velocity);

        var position = new SampledPositionProperty();
        position.addSamples(times, values);

        var property = new VelocityOrientationProperty(position);

        var expected = new Cartesian3();
        var result = property.getValue(times[0], expected);
        expect(result).toBe(expected);

        var matrix = Transforms.rotationMatrixFromPositionVelocity(position.getValue(times[0]), velocity);
        expect(expected).toEqual(Quaternion.fromRotationMatrix(matrix));
    });

    it('is undefined at zero velocity', function() {
        var position = new CallbackProperty(function() {
            return Cartesian3.fromDegrees(0, 0, 0);
        }, false);

        var property = new VelocityOrientationProperty(position);
        expect(property.getValue(new JulianDate())).toBeUndefined();
    });

    it('returns undefined when position value is undefined', function() {
        var position = new SampledPositionProperty();
        position.addSample(new JulianDate(1, 0), Cartesian3.fromDegrees(0, 0, 0));
        position.forwardExtrapolationType = ExtrapolationType.NONE;
        position.backwardExtrapolationType = ExtrapolationType.NONE;

        var property = new VelocityOrientationProperty(position);

        var result = property.getValue(new JulianDate());
        expect(result).toBeUndefined();
    });

    it('returns undefined when position has exactly one value', function() {
        var position = new SampledPositionProperty();
        position.addSample(new JulianDate(1, 0), Cartesian3.fromDegrees(0, 0, 0));
        position.forwardExtrapolationType = ExtrapolationType.NONE;
        position.backwardExtrapolationType = ExtrapolationType.NONE;

        var property = new VelocityOrientationProperty(position);

        var result = property.getValue(new JulianDate(1, 0));
        expect(result).toBeUndefined();
    });

    it('equals works', function() {
        var position = new SampledPositionProperty();

        var left = new VelocityOrientationProperty();
        var right = new VelocityOrientationProperty();

        expect(left.equals(right)).toBe(true);

        left.position = position;
        expect(left.equals(right)).toBe(false);

        right.position = position;
        expect(left.equals(right)).toBe(true);

        left.ellipsoid = Ellipsoid.UNIT_SPHERE;
        expect(left.equals(right)).toBe(false);

        right.ellipsoid = Ellipsoid.UNIT_SPHERE;
        expect(left.equals(right)).toBe(true);
    });

    it('getValue throws without time', function() {
        var property = new VelocityOrientationProperty();
        expect(function() {
            property.getValue();
        }).toThrowDeveloperError();
    });
});
