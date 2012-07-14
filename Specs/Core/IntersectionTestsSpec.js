/*global defineSuite*/
defineSuite([
         'Core/IntersectionTests',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Ray'
     ], function(
         IntersectionTests,
         Cartesian3,
         Ellipsoid,
         CesiumMath,
         Ray) {
    "use strict";
    /*global it,expect*/

    it('rayPlane intersects', function() {
        var ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(ray, planeNormal, planeD);

        expect(intersectionPoint.equals(new Cartesian3(1.0, 0.0, 0.0))).toEqual(true);
    });

    it('rayPlane misses', function() {
        var ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0));
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(ray, planeNormal, planeD);

        expect(intersectionPoint).not.toBeDefined();
    });

    it('rayPlane misses (parallel)', function() {
        var ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0));
        var planeNormal = new Cartesian3(1.0, 0.0, 0.0);
        var planeD = -1.0;

        var intersectionPoint = IntersectionTests.rayPlane(ray, planeNormal, planeD);

        expect(intersectionPoint).not.toBeDefined();
    });

    it('rayPlane throws without ray', function() {
        expect(function() {
            IntersectionTests.rayPlane();
        }).toThrow();
    });

    it('rayPlane throws without planeNormal', function() {
        expect(function() {
            IntersectionTests.rayPlane(new Ray(new Cartesian3(), new Cartesian3()));
        }).toThrow();
    });

    it('rayPlane throws without planeD', function() {
        expect(function() {
            IntersectionTests.rayPlane(new Ray(new Cartesian3(), new Cartesian3()), new Cartesian3());
        }).toThrow();
    });

    it('rayEllipsoid throws without ray', function() {
        expect(function() {
            IntersectionTests.rayEllipsoid();
        }).toThrow();
    });

    it('rayEllipsoid throws without ellipsoid', function() {
        expect(function() {
            IntersectionTests.rayEllipsoid(new Ray(new Cartesian3(), new Cartesian3()));
        }).toThrow();
    });

    it('rayEllipsoid outside intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
        var intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(0.0, 2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(0.0, 0.0, 2.0), new Cartesian3(0.0, 0.0, -1.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(1.0, 1.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, 1.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, 1.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(1.0, 0.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(1.0, CesiumMath.EPSILON14);

        ray = new Ray(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);

        ray = new Ray(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);

        ray = new Ray(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, -1.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(typeof intersections === 'undefined').toEqual(true);
    });

    it('rayEllipsoid inside intersection', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var ray = new Ray(Cartesian3.ZERO, new Cartesian3(0.0, 0.0, 1.0));
        var intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections.start).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(intersections.stop).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
    });

    it('rayEllipsoid tangent intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var ray = new Ray(Cartesian3.UNIT_X, Cartesian3.UNIT_Z);
        var intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections).not.toBeDefined();
    });

    it('rayEllipsoid no intersections', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        var ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, 1.0));
        var intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections).not.toBeDefined();

        ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, -1.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections).not.toBeDefined();

        ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections).not.toBeDefined();

        ray = new Ray(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, -1.0, 0.0));
        intersections = IntersectionTests.rayEllipsoid(ray, unitSphere);
        expect(intersections).not.toBeDefined();
    });

    ///////////////////////////////////////////////////////////////////////////
    // TODO: exceptions

    it('line segment intersects plane', function() {
       var planeNormal = Cartesian3.UNIT_X;
       var planeD = 0.0;

       var p0 = Cartesian3.UNIT_X;
       var p1 = Cartesian3.UNIT_X.negate();
       var p = IntersectionTests.lineSegmentPlaneIntersection(p0, p1, planeNormal, planeD);

       expect(p.equals(Cartesian3.ZERO)).toEqual(true);
    });

    it('line segment does notintersects plane', function() {
        var planeNormal = Cartesian3.UNIT_Y;
        var planeD = 0.0;

        var p0 = new Cartesian3(1.0, 1.0, 0.0);
        var p1 = new Cartesian3(-1.0, 1.0, 0.0);
        var p = IntersectionTests.lineSegmentPlaneIntersection(p0, p1, planeNormal, planeD);

        expect(p).not.toBeDefined();
     });

    ///////////////////////////////////////////////////////////////////////////

    it('triangle is front of a plane', function() {
        var planeNormal = Cartesian3.UNIT_Z;
        var planeD = 0.0;

        var p0 = new Cartesian3(0.0, 0.0, 2.0);
        var p1 = new Cartesian3(0.0, 1.0, 2.0);
        var p2 = new Cartesian3(1.0, 0.0, 2.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).not.toBeDefined();
     });

    it('triangle is behind a plane', function() {
        var planeNormal = Cartesian3.UNIT_Z.negate();
        var planeD = 0.0;

        var p0 = new Cartesian3(0.0, 0.0, 2.0);
        var p1 = new Cartesian3(0.0, 1.0, 2.0);
        var p2 = new Cartesian3(1.0, 0.0, 2.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).not.toBeDefined();
     });

    it('triangle intersects plane with p0 behind', function() {
        var planeNormal = Cartesian3.UNIT_Z;
        var planeD = -1.0;

        var p0 = new Cartesian3(0.0, 0.0, 0.0);
        var p1 = new Cartesian3(0.0, 1.0, 2.0);
        var p2 = new Cartesian3(0.0, -1.0, 2.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(3 + 4);
        expect(triangles[0].equals(p0)).toEqual(true);
    });

    it('triangle intersects plane with p1 behind', function() {
        var planeNormal = Cartesian3.UNIT_Z;
        var planeD = -1.0;

        var p0 = new Cartesian3(0.0, -1.0, 2.0);
        var p1 = new Cartesian3(0.0, 0.0, 0.0);
        var p2 = new Cartesian3(0.0, 1.0, 2.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(3 + 4);
        expect(triangles[0].equals(p1)).toEqual(true);
    });

    it('triangle intersects plane with p2 behind', function() {
        var planeNormal = Cartesian3.UNIT_Z;
        var planeD = -1.0;

        var p0 = new Cartesian3(0.0, 1.0, 2.0);
        var p1 = new Cartesian3(0.0, -1.0, 2.0);
        var p2 = new Cartesian3(0.0, 0.0, 0.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(3 + 4);
        expect(triangles[0].equals(p2)).toEqual(true);
    });

    it('triangle intersects plane with p0 in front', function() {
        var planeNormal = Cartesian3.UNIT_Y;
        var planeD = -1.0;

        var p0 = new Cartesian3(0.0, 2.0, 0.0);
        var p1 = new Cartesian3(1.0, 0.0, 0.0);
        var p2 = new Cartesian3(-1.0, 0.0, 0.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(4 + 3);
        expect(triangles[0].equals(p1)).toEqual(true);  // p0 is in front
        expect(triangles[1].equals(p2)).toEqual(true);
    });

    it('triangle intersects plane with p1 in front', function() {
        var planeNormal = Cartesian3.UNIT_Y;
        var planeD = -1.0;

        var p0 = new Cartesian3(-1.0, 0.0, 0.0);
        var p1 = new Cartesian3(0.0, 2.0, 0.0);
        var p2 = new Cartesian3(1.0, 0.0, 0.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(4 + 3);
        expect(triangles[0].equals(p2)).toEqual(true);  // p1 is in front
        expect(triangles[1].equals(p0)).toEqual(true);
    });

    it('triangle intersects plane with p2 in front', function() {
        var planeNormal = Cartesian3.UNIT_Y;
        var planeD = -1.0;

        var p0 = new Cartesian3(1.0, 0.0, 0.0);
        var p1 = new Cartesian3(-1.0, 0.0, 0.0);
        var p2 = new Cartesian3(0.0, 2.0, 0.0);

        var triangles = IntersectionTests.trianglePlaneIntersection(p0, p1, p2, planeNormal, planeD);
        expect(triangles).toBeDefined();
        expect(triangles.length).toEqual(4 + 3);
        expect(triangles[0].equals(p0)).toEqual(true);  // p2 is in front
        expect(triangles[1].equals(p1)).toEqual(true);
    });

});
