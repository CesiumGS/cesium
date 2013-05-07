/*global defineSuite*/
defineSuite([
         'Core/EllipsoidalOccluder',
         'Core/Occluder',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Core/IntersectionTests',
         'Core/Visibility',
         'Core/Math',
         'Core/Ellipsoid',
         'Core/Extent',
         'Core/Ray'
     ], function(
         EllipsoidalOccluder,
         Occluder,
         Cartesian3,
         BoundingSphere,
         IntersectionTests,
         Visibility,
         CesiumMath,
         Ellipsoid,
         Extent,
         Ray) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('uses ellipsoid', function() {
        var ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
        var occluder = new EllipsoidalOccluder(ellipsoid);
        expect(occluder.getEllipsoid()).toEqual(ellipsoid);
    });

    it('throws if ellipsoid is not provided to constructor', function() {
        function createOccluderWithoutEllipsoid() {
            return new EllipsoidalOccluder(undefined, new Cartesian3(1.0, 2.0, 3.0));
        }
        expect(createOccluderWithoutEllipsoid).toThrow();
    });

    it('isPointVisible example works as claimed', function() {
        var cameraPosition = new Cartesian3(0, 0, 2.5);
        var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
        var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
        var point = new Cartesian3(0, -3, -3);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('isScaledSpacePointVisible example works as claimed', function() {
        var cameraPosition = new Cartesian3(0, 0, 2.5);
        var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
        var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
        var point = new Cartesian3(0, -3, -3);
        var scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
        expect(occluder.isScaledSpacePointVisible(scaledSpacePoint)).toEqual(true);
    });

    it('reports not visible when point is directly behind ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(-7000000, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });

    it('reports visible when point is in front of ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(6900000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports visible when point is in opposite direction from ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(7100000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports not visible when point is over horizon', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(4510635.0, 4510635.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });

    it('horizon culling point computed from a single position should produce a grazing altitude close to zero', function() {
        var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
        var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

        var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0)];
        var boundingSphere = BoundingSphere.fromPoints(positions);

        var firstPositionArray = [positions[0]];
        var result = ellipsoidalOccluder.computeHorizonCullingPoint(boundingSphere.center, firstPositionArray);
        var unscaledResult = result.multiplyComponents(ellipsoid.getRadii());

        // The grazing altitude of the ray from the horizon culling point to the
        // position used to compute it should be very nearly zero.
        var direction = positions[0].subtract(unscaledResult).normalize();
        var nearest = IntersectionTests.grazingAltitudeLocation(new Ray(unscaledResult, direction), ellipsoid);
        var nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
        expect(nearestCartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
    });

    it('horizon culling point computed from multiple positions should produce a grazing altitude close to zero for one of the positions and less than zero for the others', function() {
        var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
        var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

        var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0), new Cartesian3(-12446.0, 12445.0, 12445.0)];
        var boundingSphere = BoundingSphere.fromPoints(positions);

        var result = ellipsoidalOccluder.computeHorizonCullingPoint(boundingSphere.center, positions);
        var unscaledResult = result.multiplyComponents(ellipsoid.getRadii());

        // The grazing altitude of the ray from the horizon culling point to the
        // position used to compute it should be very nearly zero.
        var foundOneNearZero = false;
        for (var i = 0; i < positions.length; ++i) {
            var direction = positions[i].subtract(unscaledResult).normalize();
            var nearest = IntersectionTests.grazingAltitudeLocation(new Ray(unscaledResult, direction), ellipsoid);
            var nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
            if (Math.abs(nearestCartographic.height) < CesiumMath.EPSILON5) {
                foundOneNearZero = true;
            } else {
                expect(nearestCartographic.height).toBeLessThan(0.0);
            }
        }

        expect(foundOneNearZero).toBe(true);
    });

});
