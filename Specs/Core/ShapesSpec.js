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
    /*global it,expect*/

    it('computeCircleBoundary computes a closed loop', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var positions = Shapes.computeCircleBoundary(ellipsoid, center, 1.0);

        expect(positions[0].equals(positions[positions.length - 1])).toEqual(true);
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
        }).toThrow();
    });

    it('computeCircleBoundary throws without a center', function() {
        var ellipsoid = Ellipsoid.WGS84;
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid);
        }).toThrow();
    });

    it('computeCircleBoundary throws without a radius', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center);
        }).toThrow();
    });

    it('computeCircleBoundary throws with a negative radius', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center, -1.0);
        }).toThrow();
    });

    it('computeCircleBoundary throws with a negative granularity', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeCircleBoundary(ellipsoid, center, 1.0, -1.0);
        }).toThrow();
    });

    it('computeEllipseBoundary computes a closed loop', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var positions = Shapes.computeEllipseBoundary(ellipsoid, center, 5.0, 1.0);

        expect(positions[0].equals(positions[positions.length - 1])).toEqual(true);
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
        }).toThrow();
    });

    it('computeEllipseBoundary throws without a center', function() {
        var ellipsoid = Ellipsoid.WGS84;
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid);
        }).toThrow();
    });

    it('computeEllipseBoundary throws without a semi-major axis', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0);
        }).toThrow();
    });

    it('computeEllipseBoundary with a negative axis length', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, -1.0, 1.0);
        }).toThrow();
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, -1.0);
        }).toThrow();
    });

    it('computeEllipseBoundary throws with a negative granularity', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        expect(function() {
            Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, 1.0, 0, -1.0);
        }).toThrow();
    });
});
