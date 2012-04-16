(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("IntersectionTests", function () {

        it("rayPlane intersects", function () {
            var rayOrigin = new Cesium.Cartesian3(2.0, 0.0, 0.0);
            var rayDirection = new Cesium.Cartesian3(-1.0, 0.0, 0.0);
            var planeNormal = new Cesium.Cartesian3(1.0, 0.0, 0.0);
            var planeD = -1.0;

            var intersectionPoint = Cesium.IntersectionTests.rayPlane(
                rayOrigin, rayDirection, planeNormal, planeD);

            expect(intersectionPoint.equals(new Cesium.Cartesian3(1.0, 0.0, 0.0))).toBeTruthy();
        });

        it("rayPlane misses", function () {
            var rayOrigin = new Cesium.Cartesian3(2.0, 0.0, 0.0);
            var rayDirection = new Cesium.Cartesian3(1.0, 0.0, 0.0);
            var planeNormal = new Cesium.Cartesian3(1.0, 0.0, 0.0);
            var planeD = -1.0;

            var intersectionPoint = Cesium.IntersectionTests.rayPlane(
                rayOrigin, rayDirection, planeNormal, planeD);

            expect(intersectionPoint).not.toBeDefined();
        });

        it("rayPlane misses (parallel)", function () {
            var rayOrigin = new Cesium.Cartesian3(2.0, 0.0, 0.0);
            var rayDirection = new Cesium.Cartesian3(0.0, 1.0, 0.0);
            var planeNormal = new Cesium.Cartesian3(1.0, 0.0, 0.0);
            var planeD = -1.0;

            var intersectionPoint = Cesium.IntersectionTests.rayPlane(
                rayOrigin, rayDirection, planeNormal, planeD);

            expect(intersectionPoint).not.toBeDefined();
        });

        it("rayPlane throws without rayOrigin", function () {
            expect( function () {
                Cesium.IntersectionTests.rayPlane();
            }).toThrow();
        });

        it("rayPlane throws without rayDirection", function () {
            expect( function () {
                Cesium.IntersectionTests.rayPlane(new Cesium.Cartesian3());
            }).toThrow();
        });

        it("rayPlane throws without planeNormal", function () {
            expect( function () {
                Cesium.IntersectionTests.rayPlane(
                    new Cesium.Cartesian3(),
                    new Cesium.Cartesian3());
            }).toThrow();
        });

        it("rayPlane throws without planeD", function () {
            expect( function () {
                Cesium.IntersectionTests.rayPlane(
                    new Cesium.Cartesian3(),
                    new Cesium.Cartesian3(),
                    new Cesium.Cartesian3());
            }).toThrow();
        });

        it("rayEllipsoid throws without rayOrigin", function () {
            expect( function () {
                Cesium.IntersectionTests.rayEllipsoid();
            }).toThrow();
        });

        it("rayEllipsoid throws without rayDirection", function () {
            expect( function () {
                Cesium.IntersectionTests.rayEllipsoid(new Cesium.Cartesian3());
            }).toThrow();
        });

        it("rayEllipsoid throws without ellipsoid", function () {
            expect( function () {
                Cesium.IntersectionTests.rayEllipsoid(
                    new Cesium.Cartesian3(),
                    new Cesium.Cartesian3());
            }).toThrow();
        });

        it("rayEllipsoid outside intersections", function () {
            var Cartesian3 = Cesium.Cartesian3;
            var unitSphere = Cesium.Ellipsoid.getUnitSphere();

            var intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, 2.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(1.0, 1.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(1.0, 0.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, 1.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(3.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(-1.0, -1.0, 0.0), new Cartesian3(1.0, 0.0, 0.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(-2.0, 0.0, 0.0), new Cartesian3(-1.0, 0.0, 0.0), unitSphere);
            expect(typeof intersections === "undefined").toBeTruthy();

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, -2.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
            expect(typeof intersections === "undefined").toBeTruthy();

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(0.0, 0.0, -2.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
            expect(typeof intersections === "undefined").toBeTruthy();
        });

        it("rayEllipsoid inside intersection", function () {
            var Cartesian3 = Cesium.Cartesian3;
            var unitSphere = Cesium.Ellipsoid.getUnitSphere();

            var intersections = Cesium.IntersectionTests.rayEllipsoid(Cartesian3.getZero(), new Cartesian3(0.0, 0.0, 1.0), unitSphere);
            expect(intersections.start).toEqualEpsilon(0.0, Cesium.Math.EPSILON14);
            expect(intersections.stop).toEqualEpsilon(1.0, Cesium.Math.EPSILON14);
        });

        it("rayEllipsoid tangent intersections", function () {
            var Cartesian3 = Cesium.Cartesian3;
            var unitSphere = Cesium.Ellipsoid.getUnitSphere();

            var intersections = Cesium.IntersectionTests.rayEllipsoid(Cartesian3.getUnitX(), Cartesian3.getUnitZ(), unitSphere);
            expect(intersections).not.toBeDefined();
        });

        it("rayEllipsoid no intersections", function () {
            var Cartesian3 = Cesium.Cartesian3;
            var unitSphere = Cesium.Ellipsoid.getUnitSphere();

            var intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, 1.0), unitSphere);
            expect(intersections).not.toBeDefined();

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 0.0, -1.0), unitSphere);
            expect(intersections).not.toBeDefined();

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, 1.0, 0.0), unitSphere);
            expect(intersections).not.toBeDefined();

            intersections = Cesium.IntersectionTests.rayEllipsoid(new Cartesian3(2.0, 0.0, 0.0), new Cartesian3(0.0, -1.0, 0.0), unitSphere);
            expect(intersections).not.toBeDefined();
        });

    });
})();