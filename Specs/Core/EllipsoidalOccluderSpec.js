/*global defineSuite*/
defineSuite([
        'Core/EllipsoidalOccluder',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/IntersectionTests',
        'Core/Math',
        'Core/Ray',
        'Core/Rectangle'
    ], function(
        EllipsoidalOccluder,
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        IntersectionTests,
        CesiumMath,
        Ray,
        Rectangle) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('uses ellipsoid', function() {
        var ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
        var occluder = new EllipsoidalOccluder(ellipsoid);
        expect(occluder.ellipsoid).toEqual(ellipsoid);
    });

    it('throws if ellipsoid is not provided to constructor', function() {
        function createOccluderWithoutEllipsoid() {
            return new EllipsoidalOccluder(undefined, new Cartesian3(1.0, 2.0, 3.0));
        }
        expect(createOccluderWithoutEllipsoid).toThrowDeveloperError();
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
        occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

        var point = new Cartesian3(-7000000, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });

    it('reports visible when point is in front of ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

        var point = new Cartesian3(6900000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports visible when point is in opposite direction from ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

        var point = new Cartesian3(7100000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports not visible when point is over horizon', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.cameraPosition = new Cartesian3(7000000.0, 0.0, 0.0);

        var point = new Cartesian3(4510635.0, 4510635.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });

    describe('computeHorizonCullingPoint', function() {
        it('requires directionToPoint and positions', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
            var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0)];
            var directionToPoint = BoundingSphere.fromPoints(positions).center;

            expect(function() {
                ellipsoidalOccluder.computeHorizonCullingPoint(undefined, positions);
            }).toThrowDeveloperError();

            expect(function() {
                ellipsoidalOccluder.computeHorizonCullingPoint(directionToPoint, undefined);
            }).toThrowDeveloperError();
        });

        it('returns point on ellipsoid when single position is on center line', function() {
            var ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
            var positions = [new Cartesian3(12345.0, 0.0, 0.0)];
            var directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

            var result = ellipsoidalOccluder.computeHorizonCullingPoint(directionToPoint, positions);

            expect(result.x).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
            expect(result.y).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
            expect(result.z).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        });

        it('returns undefined when horizon of single point is parallel to center line', function() {
            var ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
            var positions = [new Cartesian3(0.0, 4567.0, 0.0)];
            var directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

            var result = ellipsoidalOccluder.computeHorizonCullingPoint(directionToPoint, positions);
            expect(result).toBeUndefined();
        });

        it('returns undefined when single point is in the opposite direction of the center line', function() {
            var ellipsoid = new Ellipsoid(12345.0, 4567.0, 8910.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
            var positions = [new Cartesian3(-14000.0, -1000.0, 0.0)];
            var directionToPoint = new Cartesian3(1.0, 0.0, 0.0);

            var result = ellipsoidalOccluder.computeHorizonCullingPoint(directionToPoint, positions);
            expect(result).toBeUndefined();
        });

        it('computes a point from a single position with a grazing altitude close to zero', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

            var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0)];
            var boundingSphere = BoundingSphere.fromPoints(positions);

            var firstPositionArray = [positions[0]];
            var result = ellipsoidalOccluder.computeHorizonCullingPoint(boundingSphere.center, firstPositionArray);
            var unscaledResult = Cartesian3.multiplyComponents(result, ellipsoid.radii, new Cartesian3());

            // The grazing altitude of the ray from the horizon culling point to the
            // position used to compute it should be very nearly zero.
            var direction = Cartesian3.normalize(Cartesian3.subtract(positions[0], unscaledResult, new Cartesian3()), new Cartesian3());
            var nearest = IntersectionTests.grazingAltitudeLocation(new Ray(unscaledResult, direction), ellipsoid);
            var nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
            expect(nearestCartographic.height).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
        });

        it('computes a point from multiple positions with a grazing altitude close to zero for one of the positions and less than zero for the others', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

            var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0), new Cartesian3(-12446.0, 12445.0, 12445.0)];
            var boundingSphere = BoundingSphere.fromPoints(positions);

            var result = ellipsoidalOccluder.computeHorizonCullingPoint(boundingSphere.center, positions);
            var unscaledResult = Cartesian3.multiplyComponents(result, ellipsoid.radii, new Cartesian3());

            // The grazing altitude of the ray from the horizon culling point to the
            // position used to compute it should be very nearly zero.
            var foundOneNearZero = false;
            for (var i = 0; i < positions.length; ++i) {
                var direction = Cartesian3.normalize(Cartesian3.subtract(positions[i], unscaledResult, new Cartesian3()), new Cartesian3());
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

    describe('computeHorizonCullingPointFromVertices', function() {
        it('requires directionToPoint, vertices, and stride', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

            var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0), new Cartesian3(-12446.0, 12445.0, 12445.0)];
            var boundingSphere = BoundingSphere.fromPoints(positions);

            var vertices = [];
            for (var i = 0; i < positions.length; ++i) {
                var position = positions[i];
                vertices.push(position.x);
                vertices.push(position.y);
                vertices.push(position.z);
                vertices.push(1.0);
                vertices.push(2.0);
                vertices.push(3.0);
                vertices.push(4.0);
            }

            ellipsoidalOccluder.computeHorizonCullingPointFromVertices(boundingSphere.center, vertices, 7);

            expect(function() {
                ellipsoidalOccluder.computeHorizonCullingPointFromVertices(undefined, vertices, 7);
            }).toThrowDeveloperError();

            expect(function() {
                ellipsoidalOccluder.computeHorizonCullingPointFromVertices(boundingSphere.center, undefined, 7);
            }).toThrowDeveloperError();

            expect(function() {
                ellipsoidalOccluder.computeHorizonCullingPointFromVertices(boundingSphere.center, vertices, undefined);
            }).toThrowDeveloperError();
        });

        it('produces same answers as computeHorizonCullingPoint', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

            var positions = [new Cartesian3(-12345.0, 12345.0, 12345.0), new Cartesian3(-12346.0, 12345.0, 12345.0), new Cartesian3(-12446.0, 12445.0, 12445.0)];
            var boundingSphere = BoundingSphere.fromPoints(positions);

            var center = new Cartesian3(-12000.0, 12000.0, 12000.0);

            var vertices = [];
            for (var i = 0; i < positions.length; ++i) {
                var position = positions[i];
                vertices.push(position.x - center.x);
                vertices.push(position.y - center.y);
                vertices.push(position.z - center.z);
                vertices.push(1.0);
                vertices.push(2.0);
                vertices.push(3.0);
                vertices.push(4.0);
            }

            var result1 = ellipsoidalOccluder.computeHorizonCullingPoint(boundingSphere.center, positions);
            var result2 = ellipsoidalOccluder.computeHorizonCullingPointFromVertices(boundingSphere.center, vertices, 7, center);

            expect(result1.x).toEqualEpsilon(result2.x, CesiumMath.EPSILON14);
            expect(result1.y).toEqualEpsilon(result2.y, CesiumMath.EPSILON14);
            expect(result1.z).toEqualEpsilon(result2.z, CesiumMath.EPSILON14);
        });
    });

    describe('computeHorizonCullingPointFromRectangle', function() {
        it('returns undefined for global rectangle', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);
            var rectangle = Rectangle.MAX_VALUE;
            var result = ellipsoidalOccluder.computeHorizonCullingPointFromRectangle(rectangle, ellipsoid);
            expect(result).toBeUndefined();
        });

        it('computes a point with a grazing altitude close to zero for one of the rectangle corners and less than or equal to zero for the others', function() {
            var ellipsoid = new Ellipsoid(12345.0, 12345.0, 12345.0);
            var ellipsoidalOccluder = new EllipsoidalOccluder(ellipsoid);

            var rectangle = new Rectangle(0.1, 0.2, 0.3, 0.4);
            var result = ellipsoidalOccluder.computeHorizonCullingPointFromRectangle(rectangle, ellipsoid);
            expect(result).toBeDefined();
            var unscaledResult = Cartesian3.multiplyComponents(result, ellipsoid.radii, new Cartesian3());

            // The grazing altitude of the ray from the horizon culling point to the
            // position used to compute it should be very nearly zero.
            var positions = [ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle)),
                             ellipsoid.cartographicToCartesian(Rectangle.southeast(rectangle)),
                             ellipsoid.cartographicToCartesian(Rectangle.northwest(rectangle)),
                             ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle))];

            var foundOneNearZero = false;
            for (var i = 0; i < positions.length; ++i) {
                var direction = Cartesian3.normalize(Cartesian3.subtract(positions[i], unscaledResult, new Cartesian3()), new Cartesian3());
                var nearest = IntersectionTests.grazingAltitudeLocation(new Ray(unscaledResult, direction), ellipsoid);
                var nearestCartographic = ellipsoid.cartesianToCartographic(nearest);
                if (Math.abs(nearestCartographic.height) < CesiumMath.EPSILON5) {
                    foundOneNearZero = true;
                } else {
                    expect(nearestCartographic.height).toBeLessThanOrEqualTo(0.0);
                }
            }

            expect(foundOneNearZero).toBe(true);
        });
    });
});
