defineSuite([
    'DataSources/GroundGeometryUpdater',
    'Core/ApproximateTerrainHeights',
    'Core/Event',
    'Core/GeometryOffsetAttribute',
    'Core/JulianDate',
    'Core/Rectangle',
    'Scene/HeightReference',
    'DataSources/ConstantProperty'
], function(
    GroundGeometryUpdater,
    ApproximateTerrainHeights,
    Event,
    GeometryOffsetAttribute,
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

    it('getGeometryHeight works for for height reference NONE and RELATIVE_TO_GROUND', function() {
        var expected = 30;
        var height = new ConstantProperty(expected);
        var heightReference = new ConstantProperty(HeightReference.NONE);
        expect(GroundGeometryUpdater.getGeometryHeight(height, heightReference, time)).toEqual(expected);

        heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        expect(GroundGeometryUpdater.getGeometryHeight(height, heightReference, time)).toEqual(expected);
    });

    it('getGeometryHeight works for for height reference CLAMP_TO_GROUND', function() {
        var height = new ConstantProperty(50);
        var heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        expect(GroundGeometryUpdater.getGeometryHeight(height, heightReference, time)).toEqual(0);
    });

    it('getGeometryExtrudedHeight works for for height reference NONE and RELATIVE_TO_GROUND', function() {
        var expected = 30;
        var height = new ConstantProperty(expected);
        var heightReference = new ConstantProperty(HeightReference.NONE);
        expect(GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference, time)).toEqual(expected);

        heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        expect(GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference, time)).toEqual(expected);
    });

    it('getGeometryExtrudedHeight works for for height reference CLAMP_TO_GROUND', function() {
        var height = new ConstantProperty(50);
        var heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        expect(GroundGeometryUpdater.getGeometryExtrudedHeight(height, heightReference, time)).toEqual(GroundGeometryUpdater.CLAMP_TO_GROUND);
    });

    it('computeGeometryOffsetAttribute works', function() {
        var heightReference;
        var extrudedHeightReference;
        var result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBeUndefined();

        heightReference = new ConstantProperty(HeightReference.NONE);
        extrudedHeightReference = new ConstantProperty(HeightReference.NONE);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBeUndefined();

        heightReference = new ConstantProperty(HeightReference.NONE);
        extrudedHeightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBeUndefined();

        heightReference = new ConstantProperty(HeightReference.NONE);
        extrudedHeightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.TOP);

        heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.NONE);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.TOP);

        heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.TOP);

        heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.ALL);

        heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.NONE);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.TOP);

        heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.TOP);

        heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        extrudedHeightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        result = GroundGeometryUpdater.computeGeometryOffsetAttribute(heightReference, extrudedHeightReference, time);
        expect(result).toBe(GeometryOffsetAttribute.ALL);
    });
});
