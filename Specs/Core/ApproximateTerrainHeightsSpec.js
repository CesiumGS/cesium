defineSuite([
    'Core/ApproximateTerrainHeights',
    'Core/Cartesian3',
    'Core/Math',
    'Core/Rectangle'
], function(
    ApproximateTerrainHeights,
    Cartesian3,
    CesiumMath,
    Rectangle) {
    'use strict';

    beforeAll(function() {
        return ApproximateTerrainHeights.initialize();
    });

    afterAll(function() {
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    it('initializes', function() {
        return ApproximateTerrainHeights.initialize()
            .then(function() {
                expect(ApproximateTerrainHeights._terrainHeights).toBeDefined();
            });
    });

    it('getApproximateTerrainHeights computes minimum and maximum terrain heights', function() {
        var result = ApproximateTerrainHeights.getApproximateTerrainHeights(Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0));
        expect(result.minimumTerrainHeight).toEqualEpsilon(-476.125711887558, CesiumMath.EPSILON10);
        expect(result.maximumTerrainHeight).toEqualEpsilon(-28.53441619873047, CesiumMath.EPSILON10);
    });

    it('getApproximateTerrainHeights throws with no rectangle', function() {
        expect(function() {
            return ApproximateTerrainHeights.getApproximateTerrainHeights();
        }).toThrowDeveloperError();
    });

    it('getApproximateTerrainHeights throws if ApproximateTerrainHeights was not initialized first', function() {
        var heights = ApproximateTerrainHeights._terrainHeights;
        ApproximateTerrainHeights._terrainHeights = undefined;
        expect(function() {
            return ApproximateTerrainHeights.getApproximateTerrainHeights(Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0));
        });
        ApproximateTerrainHeights._terrainHeights = heights;
    });

    it('getInstanceBoundingSphere computes a bounding sphere', function() {
        var result = ApproximateTerrainHeights.getInstanceBoundingSphere(Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0));
        expect(result.center).toEqualEpsilon(new Cartesian3(-3183013.8480289434, -5403772.557261968, 1154581.5817616477), CesiumMath.EPSILON10);
        expect(result.radius).toEqualEpsilon(77884.16539096291, CesiumMath.EPSILON10);
    });

    it('getInstanceBoundingSphere throws with no rectangle', function() {
        expect(function() {
            return ApproximateTerrainHeights.getInstanceBoundingSphere();
        }).toThrowDeveloperError();
    });

    it('getInstanceBoundingSphere throws if ApproximateTerrainHeights was not initialized first', function() {
        var heights = ApproximateTerrainHeights._terrainHeights;
        ApproximateTerrainHeights._terrainHeights = undefined;
        expect(function() {
            return ApproximateTerrainHeights.getInstanceBoundingSphere(Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0));
        });
        ApproximateTerrainHeights._terrainHeights = heights;
    });
});
