defineSuite([
    'DataSources/MinimumTerrainHeightProperty',
    'Core/ApproximateTerrainHeights',
    'Core/Cartesian3',
    'Core/Event',
    'Core/ExtrapolationType',
    'Core/JulianDate',
    'Core/Math',
    'DataSources/CallbackProperty',
    'DataSources/ConstantProperty'
], function(
    MinimumTerrainHeightProperty,
    ApproximateTerrainHeights,
    Cartesian3,
    Event,
    ExtrapolationType,
    JulianDate,
    CesiumMath,
    CallbackProperty,
    ConstantProperty) {
    'use strict';

    var time = JulianDate.now();

    beforeAll(function() {
        return ApproximateTerrainHeights.initialize();
    });

    afterAll(function() {
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    it('can default construct', function() {
        var property = new MinimumTerrainHeightProperty();
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.positions).toBeUndefined();
        expect(property.getValue(time)).toBeUndefined();
    });

    it('can construct with arguments', function() {
        var positions = new ConstantProperty();
        var property = new MinimumTerrainHeightProperty(positions);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.positions).toBe(positions);
    });

    it('raises definitionChanged event when positions is set', function() {
        var property = new MinimumTerrainHeightProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var positions = new ConstantProperty();
        property.positions = positions;
        expect(listener).toHaveBeenCalledWith(property, 'positions', positions, undefined);
    });

    it('subscribes and unsubscribes to position definitionChanged and propagates up', function() {
        var positions = new ConstantProperty();
        var property = new MinimumTerrainHeightProperty(positions);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        //Position changing should raise out property change event
        positions.definitionChanged.raiseEvent(positions);
        expect(listener).toHaveBeenCalledWith(property, 'positions', positions, positions);

        //Make sure it unsubscribes when value is changed
        property.positions = undefined;

        listener.calls.reset();
        positions.definitionChanged.raiseEvent(positions);
        expect(listener.calls.count()).toBe(0);
    });

    it('does not raise definitionChanged event when position is set to the same instance', function() {
        var positions = new ConstantProperty();
        var property = new MinimumTerrainHeightProperty(positions);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.positions = positions;
        expect(listener.calls.count()).toBe(0);
    });

    it('produces correct value', function() {
        var positions = new ConstantProperty(Cartesian3.fromDegreesArray([-120.0, 40.0,
                                                                                               -119.0, 40.0,
                                                                                               -119.0, 41.0,
                                                                                               -120.0, 41.0]));
        var property = new MinimumTerrainHeightProperty(positions);

        expect(property.getValue(time)).toEqualEpsilon(-382.8696126443784, CesiumMath.EPSILON10);
    });

    it('equals works', function() {
        var positions = new ConstantProperty();

        var left = new MinimumTerrainHeightProperty();
        var right = new MinimumTerrainHeightProperty();

        expect(left.equals(right)).toBe(true);

        left.positions = positions;
        expect(left.equals(right)).toBe(false);

        right.positions = positions;
        expect(left.equals(right)).toBe(true);
    });

    it('getValue throws without time', function() {
        var property = new MinimumTerrainHeightProperty();
        expect(function() {
            property.getValue();
        }).toThrowDeveloperError();
    });
});
