/*global defineSuite*/
defineSuite([
         'Core/IntersectionTests',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         IntersectionTests,
         Cartesian3,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('rayPlane intersects', function() {
        var rayOrigin = new Cartesian3(2.0, 0.0, 0.0);
        var rayDirection = new Cartesian3(-1.0, 0.0, 0.0);
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(rayOrigin, rayDirection, planeNormal, planeD);

        expect(intersectionPoint.equals(new Cartesian3(1.0, 0.0, 0.0))).toEqual(true);
    });

    it('rayPlane misses', function() {
        var rayOrigin = new Cartesian3(2.0, 0.0, 0.0);
        var rayDirection = new Cartesian3(1.0, 0.0, 0.0);
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(rayOrigin, rayDirection, planeNormal, planeD);

        expect(intersectionPoint).not.toBeDefined();
    });

    it('rayPlane misses (parallel)', function() {
        var rayOrigin = new Cartesian3(2.0, 0.0, 0.0);
        var rayDirection = new Cartesian3(0.0, 1.0, 0.0);
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(rayOrigin, rayDirection, planeNormal, planeD);

        expect(intersectionPoint).not.toBeDefined();
    });

    it('rayPlane throws without rayOrigin', function() {
        expect(function() {
            IntersectionTests.rayPlane();
        }).toThrow();
    });

    it('rayPlane throws without rayDirection', function() {
        expect(function() {
            IntersectionTests.rayPlane(new Cartesian3());
        }).toThrow();
    });

    it('rayPlane throws without planeNormal', function() {
        expect(function() {
            IntersectionTests.rayPlane(new Cartesian3(), new Cartesian3());
        }).toThrow();
    });

    it('rayPlane throws without planeD', function() {
        expect(function() {
            IntersectionTests.rayPlane(new Cartesian3(), new Cartesian3(), new Cartesian3());
        }).toThrow();
    });

    it('rayEllipsoid throws without rayOrigin', function() {
        expect(function() {
            IntersectionTests.rayEllipsoid();
        }).toThrow();
    });

    it('rayEllipsoid throws without rayDirection', function() {
        expect(function() {
            IntersectionTests.rayEllipsoid(new Cartesian3());
        }).toThrow();
    });

    it('rayEllipsoid throws without ellipsoid', function() {
        expect(function() {
            IntersectionTests.rayEllipsoid(new Cartesian3(), new Cartesian3());
        }).toThrow();
    });

    it('rayEllipsoid outside intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var intersections = IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, 2.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(1.0, 1.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, 1.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(1.0, 0.0, 0.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);
    });

    it('rayEllipsoid inside intersection', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var intersections = IntersectionTests.rayEllipsoid(Cartesian3.ZERO, new Cartesian3(0.0, 0.0, 1.0), unitSphere);
        expect(intersections.start).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
    });

    it('rayEllipsoid tangent intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var intersections = IntersectionTests.rayEllipsoid(Cartesian3.UNIT_X, Cartesian3.UNIT_Z, unitSphere);
        expect(intersections).not.toBeDefined();
    });

    it('rayEllipsoid no intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var intersections = IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, 1.0), unitSphere);
        expect(intersections).not.toBeDefined();

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
        expect(intersections).not.toBeDefined();

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), unitSphere);
        expect(intersections).not.toBeDefined();

        intersections = IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
        expect(intersections).not.toBeDefined();
    });
});
