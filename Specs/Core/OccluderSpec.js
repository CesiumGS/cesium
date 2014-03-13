/*global defineSuite*/
defineSuite([
         'Core/Occluder',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Core/Visibility',
         'Core/Math',
         'Core/Ellipsoid',
         'Core/Extent'
     ], function(
         Occluder,
         Cartesian3,
         BoundingSphere,
         Visibility,
         CesiumMath,
         Ellipsoid,
         Extent) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws an exception during construction (1 of 3)', function() {
        expect(function() {
            return new Occluder();
        }).toThrowDeveloperError();
    });

    it('throws an exception during construction (2 of 3)', function() {
        expect(function() {
            return new Occluder(new BoundingSphere(new Cartesian3(0, 0, 0)));
        }).toThrowDeveloperError();
    });

    it('throws an exception during construction (3 of 3)', function() {
        expect(function() {
            return new Occluder(new Cartesian3(0, 0, 0));
        }).toThrowDeveloperError();
    });

    it('can entirely eclipse a smaller occludee', function() {
        var giantSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
        var littleSphere = new BoundingSphere(new Cartesian3(0, 0, -2.75), 0.25);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(giantSphere, cameraPosition);
        expect(occluder.isBoundingSphereVisible(littleSphere)).toEqual(false);
        expect(occluder.getVisibility(littleSphere)).toEqual(Visibility.NONE);
    });

    it('can have a fully visible occludee', function() {
        var bigSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
        var littleSphere = new BoundingSphere(new Cartesian3(0, 0, -2.75), 0.25);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(littleSphere, cameraPosition);
        expect(occluder.getRadius()).toBeLessThan(bigSphere.radius);
        expect(occluder.isBoundingSphereVisible(bigSphere)).toEqual(true);
        expect(occluder.getVisibility(bigSphere)).toEqual(Visibility.FULL);
    });

    it('blocks the occludee when both are aligned and the same size', function() {
        var sphere1 = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
        var sphere2 = new BoundingSphere(new Cartesian3(0, 0, -2.5), 0.5);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(sphere1, cameraPosition);
        expect(occluder.isBoundingSphereVisible(sphere2)).toEqual(false);
        expect(occluder.getVisibility(sphere2)).toEqual(Visibility.NONE);
    });

    it('can have a fully visible occludee', function() {
        var sphere1 = new BoundingSphere(new Cartesian3(-1.25, 0, -1.5), 0.5);
        var sphere2 = new BoundingSphere(new Cartesian3(1.25, 0, -1.5), 0.5);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(sphere1, cameraPosition);
        expect(occluder.getVisibility(sphere2)).toEqual(Visibility.FULL);
    });

    it('can partially block an occludee without intersecting', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -2), 1);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(0.5, 0.5, -3), 1);
        expect(occluder.getVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
    });

    it('can partially block an occludee when it intersects laterally', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(-0.5, 0, -1), 1);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(0.5, 0, -1), 1);
        expect(occluder.getVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
    });

    it('can partially block an occludee when it intersects vertically', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -2), 1);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(0, 0.5, -2.5), 1);
        expect(occluder.getVisibility(occludeeBS)).toEqual(Visibility.PARTIAL);
    });

    it('reports full visibility when occludee is larger than occluder', function() {
        var littleSphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
        var bigSphere = new BoundingSphere(new Cartesian3(0, 0, -3), 1);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(littleSphere, cameraPosition);
        expect(occluder.getVisibility(bigSphere)).toEqual(Visibility.FULL);
    });

    it('getVisibility throws without a bounding sphere', function() {
        var sphere = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
        var cameraPosition = Cartesian3.ZERO;
        var occluder = new Occluder(sphere, cameraPosition);

        expect(function() {
            occluder.getVisibility();
        }).toThrowDeveloperError();
    });

    it('can throw errors during getOccludeePoint (1 of 5)', function() {
        expect(function() {
            Occluder.getOccludeePoint();
        }).toThrowDeveloperError();
    });

    it('can throw errors during getOccludeePoint (2 of 5)', function() {
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);
        var occludeePosition = new Cartesian3(0, 0, -5);
        var positions = [];

        expect(function() {
            Occluder.getOccludeePoint(occluderBS, occludeePosition, positions);
        }).toThrowDeveloperError();
    });

    it('can throw errors during getOccludeePoint (3 of 5)', function() {
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);
        var positions = [];

        expect(function() {
            Occluder.getOccludeePoint(occluderBS, new Cartesian3(0, 0, -3), positions);
        }).toThrowDeveloperError();
    });

    it('can throw errors during getOccludeePoint (4 of 5)', function() {
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);

        expect(function() {
            Occluder.getOccludeePoint(occluderBS, new Cartesian3(0, 0, -3));
        }).toThrowDeveloperError();
    });

    it('can throw errors during getOccludeePoint (5 of 5)', function() {
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -5), 1);

        expect(function() {
            Occluder.getOccludeePoint(occluderBS, new Cartesian3(0, 0, -5), new Cartesian3(0, 0, -3));
        }).toThrowDeveloperError();
    });

    it('can compute an occludee point', function() {
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
        var positions = [new Cartesian3(-1.085, 0, -6.221), new Cartesian3(1.085, 0, -6.221)];
        var tileOccluderSphere = BoundingSphere.fromPoints(positions);
        var occludeePosition = tileOccluderSphere.center;
        var result = Occluder.getOccludeePoint(occluderBS, occludeePosition, positions);
        expect(result).toEqualEpsilon(new Cartesian3(0, 0, -5), CesiumMath.EPSILON1);
    });

    it('can compute a rotation vector (major axis = 0)', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(8, 0, 0), 1);
        var occludee = new Occluder(occludeeBS, cameraPosition);

        var occluderPosition = occluder.getPosition();
        var occludeePosition = occludee.getPosition();
        var occluderPlaneNormal = Cartesian3.normalize(Cartesian3.subtract(occludeePosition, occluderPosition));
        var occluderPlaneD = -(Cartesian3.dot(occluderPlaneNormal, occluderPosition));

        var tempVec0 = Cartesian3.abs(Cartesian3.clone(occluderPlaneNormal));
        var majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
        if (((majorAxis === 0) && (tempVec0.z > tempVec0.x)) || ((majorAxis === 1) && (tempVec0.z > tempVec0.y))) {
            majorAxis = 2;
        }
        expect(majorAxis).toEqual(0);
        var aRotationVector = Occluder._anyRotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD);
        expect(aRotationVector).toBeTruthy();
    });

    it('can compute a rotation vector (major axis = 1)', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(7, 2, 0), 1);
        var occludee = new Occluder(occludeeBS, cameraPosition);

        var occluderPosition = occluder.getPosition();
        var occludeePosition = occludee.getPosition();
        var occluderPlaneNormal = Cartesian3.normalize(Cartesian3.subtract(occludeePosition, occluderPosition));
        var occluderPlaneD = -(Cartesian3.dot(occluderPlaneNormal, occluderPosition));

        var tempVec0 = Cartesian3.abs(Cartesian3.clone(occluderPlaneNormal));
        var majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
        if (((majorAxis === 0) && (tempVec0.z > tempVec0.x)) || ((majorAxis === 1) && (tempVec0.z > tempVec0.y))) {
            majorAxis = 2;
        }
        expect(majorAxis).toEqual(1);
        var aRotationVector = Occluder._anyRotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD);
        expect(aRotationVector).toBeTruthy();
    });

    it('can compute a rotation vector (major axis = 2)', function() {
        var cameraPosition = Cartesian3.ZERO;
        var occluderBS = new BoundingSphere(new Cartesian3(5, 0, 0), 2);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var occludeeBS = new BoundingSphere(new Cartesian3(6, 0, 2), 1);
        var occludee = new Occluder(occludeeBS, cameraPosition);

        var occluderPosition = occluder.getPosition();
        var occludeePosition = occludee.getPosition();
        var occluderPlaneNormal = Cartesian3.normalize(Cartesian3.subtract(occludeePosition, occluderPosition));
        var occluderPlaneD = -(Cartesian3.dot(occluderPlaneNormal, occluderPosition));

        var tempVec0 = Cartesian3.abs(Cartesian3.clone(occluderPlaneNormal));
        var majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
        if (((majorAxis === 0) && (tempVec0.z > tempVec0.x)) || ((majorAxis === 1) && (tempVec0.z > tempVec0.y))) {
            majorAxis = 2;
        }
        expect(majorAxis).toEqual(2);
        var aRotationVector = Occluder._anyRotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD);
        expect(aRotationVector).toBeTruthy();
    });

    it('can  have an invisible occludee point', function() {
        var cameraPosition = new Cartesian3(0, 0, -8);
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var positions = [new Cartesian3(-0.25, 0, -5.3), new Cartesian3(0.25, 0, -5.3)];
        var tileOccluderSphere = BoundingSphere.fromPoints(positions);
        var occludeePosition = tileOccluderSphere.center;
        var result = Occluder.getOccludeePoint(occluderBS, occludeePosition, positions);

        var bs = new BoundingSphere(result, 0.0);

        expect(occluder.isBoundingSphereVisible(bs)).toEqual(false);
        expect(occluder.getVisibility(bs)).toEqual(Visibility.NONE);
    });

    it('can have a visible occludee point', function() {
        var cameraPosition = new Cartesian3(3, 0, -8);
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
        var occluder = new Occluder(occluderBS, cameraPosition);
        var positions = [new Cartesian3(-0.25, 0, -5.3), new Cartesian3(0.25, 0, -5.3)];
        var tileOccluderSphere = BoundingSphere.fromPoints(positions);
        var occludeePosition = tileOccluderSphere.center;
        var result = Occluder.getOccludeePoint(occluderBS, occludeePosition, positions);
        expect(occluder.isBoundingSphereVisible(new BoundingSphere(result, 0.0))).toEqual(true);
    });

    it('compute occludee point from extent throws without an extent', function() {
        expect(function() {
            return Occluder.computeOccludeePointFromExtent();
        }).toThrowDeveloperError();
    });

    it('compute invalid occludee point from extent', function() {
        var extent = Extent.MAX_VALUE;
        expect(Occluder.computeOccludeePointFromExtent(extent)).toEqual(undefined);
    });

    it('compute valid occludee point from extent', function() {
        var edge = Math.PI / 32.0;
        var extent = new Extent(-edge, -edge, edge, edge);
        var ellipsoid = Ellipsoid.WGS84;
        var positions = extent.subsample(ellipsoid);
        var bs = BoundingSphere.fromPoints(positions);
        var point = Occluder.getOccludeePoint(new BoundingSphere(Cartesian3.ZERO, ellipsoid.minimumRadius), bs.center, positions);
        var actual = Occluder.computeOccludeePointFromExtent(extent);
        expect(actual).toEqual(point);
    });

    it('fromBoundingSphere throws without a bounding sphere', function() {
        expect(function() {
            Occluder.fromBoundingSphere();
        }).toThrowDeveloperError();
    });

    it('fromBoundingSphere throws without camera position', function() {
        expect(function() {
            Occluder.fromBoundingSphere(new BoundingSphere());
        }).toThrowDeveloperError();
    });

    it('fromBoundingSphere without result parameter', function() {
        var cameraPosition = new Cartesian3(3, 0, -8);
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
        var occluder0 = new Occluder(occluderBS, cameraPosition);
        var occluder1 = Occluder.fromBoundingSphere(occluderBS, cameraPosition);

        expect(occluder1.getPosition()).toEqual(occluder0.getPosition());
        expect(occluder1.getRadius()).toEqual(occluder0.getRadius());
    });

    it('fromBoundingSphere with result parameter', function() {
        var cameraPosition = new Cartesian3(3, 0, -8);
        var occluderBS = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
        var occluder0 = new Occluder(occluderBS, cameraPosition);
        var result = new Occluder(occluderBS, Cartesian3.ZERO);
        var occluder1 = Occluder.fromBoundingSphere(occluderBS, cameraPosition, result);

        expect(occluder1).toBe(result);
        expect(occluder1.getPosition()).toEqual(occluder0.getPosition());
        expect(occluder1.getRadius()).toEqual(occluder0.getRadius());
    });
});
