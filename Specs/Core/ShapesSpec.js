/*global defineSuite*/
defineSuite([
         'Core/Shapes',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         Shapes,
         Cartographic,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('computeCircleBoundary computes a closed loop', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var positions = Shapes.computeCircleBoundary(ellipsoid, center, 1.0);

        expect(positions[0]).toEqual(positions[positions.length - 1]);
    });

    it('computeCircleBoundary uses custom granularity', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var positions = Shapes.computeCircleBoundary(ellipsoid, center, 1.0, CesiumMath.toRadians(60));

        expect(positions.length).toEqual(10);
    });

    it('computeCircleBoundary throws without an ellipsoid', function() {
        expect(function() {
            Shapes.computeCircleBoundary();
        }).toThrowDeveloperError();
    });

    it('computeCircleBoundary throws without a center', function() {
        var ellipsoid = Ellipsoid.WGS84;
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid);
        }).toThrowDeveloperError();
    });

    it('computeCircleBoundary throws without a radius', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center);
        }).toThrowDeveloperError();
    });

    it('computeCircleBoundary throws with a negative radius', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center, -1.0);
        }).toThrowDeveloperError();
    });

    it('computeCircleBoundary throws with a negative granularity', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center, 1.0, -1.0);
        }).toThrowDeveloperError();
    });

    it('computeEllipseBoundary computes a closed loop', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var positions = Shapes.computeEllipseBoundary(ellipsoid, center, 5.0, 1.0);

        expect(positions[0]).toEqual(positions[positions.length - 1]);
    });

    it('computeEllipseBoundary can swap the semi major and minor axes', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var points = Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, 5.0);
        expect(points.length).toBeGreaterThan(0);
    });

    it('computeEllipseBoundary throws without an ellipsoid', function() {
        expect(function() {
            Shapes.computeEllipseBoundary();
        }).toThrowDeveloperError();
    });

    it('computeEllipseBoundary throws without a center', function() {
        var ellipsoid = Ellipsoid.WGS84;
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid);
        }).toThrowDeveloperError();
    });

    it('computeEllipseBoundary throws without a semi-major axis', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0);
        }).toThrowDeveloperError();
    });

    it('computeEllipseBoundary with a negative axis length', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, -1.0, 1.0);
        }).toThrowDeveloperError();
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, -1.0);
        }).toThrowDeveloperError();
    });

    it('computeEllipseBoundary throws with a negative granularity', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, 1.0, 0, -1.0);
        }).toThrowDeveloperError();
    });

    it('compute2DCircle returns a unit circle by default', function() {
        var points = Shapes.compute2DCircle();
        expect(points.length).toBeGreaterThan(0);
        expect(points[0].x).toEqual(1);
        expect(points[0].y).toEqual(0);
    });

    it('compute2DCircle returns an circle with radius 5', function() {
        var points = Shapes.compute2DCircle(5.0);
        expect(points.length).toBeGreaterThan(0);
        expect(points[0].x).toEqual(5);
        expect(points[0].y).toEqual(0);
    });
});
