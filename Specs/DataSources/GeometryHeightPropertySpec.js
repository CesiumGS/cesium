defineSuite([
    'DataSources/GeometryHeightProperty',
    'Core/ApproximateTerrainHeights',
    'Core/Event',
    'Core/JulianDate',
    'Core/Rectangle',
    'Scene/HeightReference',
    'DataSources/ConstantProperty'
], function(
    GeometryHeightProperty,
    ApproximateTerrainHeights,
    Event,
    JulianDate,
    Rectangle,
    HeightReference,
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
        var property = new GeometryHeightProperty();
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.height).toBeUndefined();
        expect(property.heightReference).toBeUndefined();
        expect(property.getValue(time)).toBe(0);
    });

    it('can construct with arguments', function() {
        var height = new ConstantProperty(30);
        var heightReference = new ConstantProperty(HeightReference.NONE);
        var property = new GeometryHeightProperty(height, heightReference);
        expect(property.isConstant).toBe(true);
        expect(property.definitionChanged).toBeInstanceOf(Event);
        expect(property.height).toBe(height);
        expect(property.heightReference).toBe(heightReference);
        expect(property.getValue(time)).toBe(30);
    });

    it('setting height raises definitionChanged event', function() {
        var property = new GeometryHeightProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.height = new ConstantProperty();
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('setting heightReference raises definitionChanged event', function() {
        var property = new GeometryHeightProperty();

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.heightReference = new ConstantProperty();
        expect(listener).toHaveBeenCalledWith(property);
    });

    it('setting height does not raise definitionChanged event for same data', function() {
        var height = new ConstantProperty(30);
        var property = new GeometryHeightProperty(height);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.height = height;
        expect(listener.calls.count()).toBe(0);
    });

    it('setting heightReference does not raise definitionChanged event for same data', function() {
        var heightReference = new ConstantProperty(HeightReference.NONE);
        var property = new GeometryHeightProperty(undefined, heightReference);

        var listener = jasmine.createSpy('listener');
        property.definitionChanged.addEventListener(listener);

        property.heightReference = heightReference;
        expect(listener.calls.count()).toBe(0);
    });

    it('getValue works for for height reference NONE and RELATIVE_TO_GROUND', function() {
        var expected = 30;
        var height = new ConstantProperty(expected);
        var heightReference = new ConstantProperty(HeightReference.NONE);
        var property = new GeometryHeightProperty(height, heightReference);
        expect(property.getValue(time)).toBe(expected);

        property.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        expect(property.getValue(time)).toBe(expected);
    });

    it('getValue works for for height reference CLAMP_TO_GROUND', function() {
        var height = new ConstantProperty(50);
        var heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        var property = new GeometryHeightProperty(height, heightReference);
        expect(property.getValue(time)).toBe(0);
    });

    it('equals works', function() {
        var height = new ConstantProperty(50);
        var heightReference = new ConstantProperty(HeightReference.NONE);

        var left = new GeometryHeightProperty();
        var right = new GeometryHeightProperty();

        expect(left.equals(undefined)).toBe(false);
        expect(left.equals(right)).toBe(true);

        left.height = height;
        expect(left.equals(right)).toBe(false);

        right.height = height;
        expect(left.equals(right)).toBe(true);

        left.heightReference = heightReference;
        expect(left.equals(right)).toBe(false);

        right.heightReference = heightReference;
        expect(left.equals(right)).toBe(true);
    });

    it('getValue throws without time', function() {
        var property = new GeometryHeightProperty();
        expect(function() {
            property.getValue();
        }).toThrowDeveloperError();
    });

    it('getMinimumTerrainValue return terrain value', function() {
        var rectangle = Rectangle.fromDegrees(0, 0, 1, 1);
        var expected = ApproximateTerrainHeights.getApproximateTerrainHeights(rectangle).minimumTerrainHeight;
        expect(GeometryHeightProperty.getMinimumTerrainValue(rectangle)).toBe(expected);
    });

    it('getMinimumTerrainValue throws without rectangle', function() {
        expect(function() {
            return GeometryHeightProperty.getMinimumTerrainValue();
        }).toThrowDeveloperError();
    });
});
