defineSuite([
    'DataSources/RelativeToTerrainHeightProperty',
    'Core/ApproximateTerrainHeights',
    'Core/Cartesian3',
    'Core/EllipsoidTerrainProvider',
    'Core/Event',
    'Core/ExtrapolationType',
    'Core/JulianDate',
    'Core/Math',
    'DataSources/CallbackProperty',
    'DataSources/ConstantProperty',
    'ThirdParty/when'
], function(
    RelativeToTerrainHeightProperty,
    ApproximateTerrainHeights,
    Cartesian3,
    EllipsoidTerrainProvider,
    Event,
    ExtrapolationType,
    JulianDate,
    CesiumMath,
    CallbackProperty,
    ConstantProperty,
    when) {
    'use strict';

    var time = JulianDate.now();
    var terrainProvider = new EllipsoidTerrainProvider();

    it('can default construct', function() {
        var property = new RelativeToTerrainHeightProperty(terrainProvider);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBeUndefined();
        expect(property.heightRelativeToTerrain).toBeUndefined();
        expect(property.getValue(time)).toBe(0);
    });

    it('can construct with arguments', function() {
        var position = new ConstantProperty();
        var heightRelativeToTerrain = new ConstantProperty();
        var property = new RelativeToTerrainHeightProperty(terrainProvider, position, heightRelativeToTerrain);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.position).toBe(position);
        expect(property.heightRelativeToTerrain).toBe(heightRelativeToTerrain);
    });

    it('raises definitionChanged event when position is set', function() {
        var property = new RelativeToTerrainHeightProperty(terrainProvider);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var position = new ConstantProperty();
        property.position = position;
        expect(listener).toHaveBeenCalledWith(property, 'position', position, undefined);
    });

    it('raises definitionChanged event when heightRelativeToTerrain is set', function() {
        var property = new RelativeToTerrainHeightProperty(terrainProvider);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        var heightRelativeToTerrain = new ConstantProperty();
        property.heightRelativeToTerrain = heightRelativeToTerrain;
        expect(listener).toHaveBeenCalledWith(property, 'heightRelativeToTerrain', heightRelativeToTerrain, undefined);
    });

    it('subscribes and unsubscribes to position definitionChanged and propagates up', function() {
        var position = new ConstantProperty();
        var property = new RelativeToTerrainHeightProperty(terrainProvider, position);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        //Position changing should raise out property change event
        position.definitionChanged.raiseEvent(position);
        expect(listener).toHaveBeenCalledWith(property, 'position', position, position);

        //Make sure it unsubscribes when value is changed
        property.position = undefined;

        listener.calls.reset();
        position.definitionChanged.raiseEvent(position);
        expect(listener.calls.count()).toBe(0);
    });

    it('subscribes and unsubscribes to heightRelativeToTerrain definitionChanged and propagates up', function() {
        var heightRelativeToTerrain = new ConstantProperty();
        var property = new RelativeToTerrainHeightProperty(terrainProvider, undefined, heightRelativeToTerrain);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        //Position changing should raise out property change event
        heightRelativeToTerrain.definitionChanged.raiseEvent(heightRelativeToTerrain);
        expect(listener).toHaveBeenCalledWith(property, 'heightRelativeToTerrain', heightRelativeToTerrain, heightRelativeToTerrain);

        //Make sure it unsubscribes when value is changed
        property.heightRelativeToTerrain = undefined;

        listener.calls.reset();
        heightRelativeToTerrain.definitionChanged.raiseEvent(heightRelativeToTerrain);
        expect(listener.calls.count()).toBe(0);
    });

    it('does not raise definitionChanged event when position is set to the same instance', function() {
        var position = new ConstantProperty();
        var heightRelativeToTerrain = new ConstantProperty();
        var property = new RelativeToTerrainHeightProperty(terrainProvider, position, heightRelativeToTerrain);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.position = position;
        property.heightRelativeToTerrain = heightRelativeToTerrain;
        expect(listener.calls.count()).toBe(0);
    });

    it('produces correct value', function() {
        var terrainHeight = 30.0;
        spyOn(RelativeToTerrainHeightProperty, '_sampleTerrainMostDetailed').and.returnValue(when.resolve(terrainHeight));
        var position = new ConstantProperty(Cartesian3.fromDegrees(-120.0, 40.0));
        var heightRelativeToTerrain = new ConstantProperty(40.0);
        var property = new RelativeToTerrainHeightProperty(terrainProvider, position, heightRelativeToTerrain);

        expect(property.getValue(time)).toEqual(70.0);
    });

    it('equals works', function() {
        var position = new ConstantProperty();
        var heightRelativeToTerrain = new ConstantProperty();

        var left = new RelativeToTerrainHeightProperty(terrainProvider);
        var right = new RelativeToTerrainHeightProperty(terrainProvider);

        expect(left.equals(right)).toBe(true);

        left.position = position;
        expect(left.equals(right)).toBe(false);

        right.position = position;
        expect(left.equals(right)).toBe(true);

        left.heightRelativeToTerrain = heightRelativeToTerrain;
        expect(left.equals(right)).toBe(false);

        right.heightRelativeToTerrain = heightRelativeToTerrain;
        expect(left.equals(right)).toBe(false);
    });

    it('constructor throws without terrainProvider', function() {
        expect(function() {
            return new RelativeToTerrainHeightProperty();
        }).toThrowDeveloperError();
    });

    it('getValue throws without time', function() {
        var property = new RelativeToTerrainHeightProperty(terrainProvider);
        expect(function() {
            property.getValue();
        }).toThrowDeveloperError();
    });
});
