/*global defineSuite*/
defineSuite([
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Cartographic2',
         'Core/Cartographic3',
         'Core/Math'
     ], function(
         Ellipsoid,
         Cartesian3,
         Cartographic2,
         Cartographic3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct', function() {
        var e = new Ellipsoid(new Cartesian3(1, 2, 3));

        expect(e.getRadii().equals(new Cartesian3(1, 2, 3))).toEqual(true);
        expect(e.getRadiiSquared().equals(new Cartesian3(1 * 1, 2 * 2, 3 * 3))).toEqual(true);
        expect(e.getRadiiToTheFourth().equals(new Cartesian3(1 * 1 * 1 * 1, 2 * 2 * 2 * 2, 3 * 3 * 3 * 3))).toEqual(true);
        expect(e.getOneOverRadiiSquared().equals(new Cartesian3(1 / (1 * 1), 1 / (2 * 2), 1 / (3 * 3)))).toEqual(true);
    });

    it('throws with no arguments', function() {
        expect(function() {
            return new Ellipsoid();
        }).toThrow();
    });

    it('throws with negative radii componenets', function() {
        expect(function() {
            return new Ellipsoid({
                x: -1,
                y: 0,
                z: 0
            });
        }).toThrow();
    });

    it('getMinimumRadius', function() {
        expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMinimumRadius()).toEqual(1);
    });

    it('getMaximumRadius', function() {
        expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMaximumRadius()).toEqual(3);
    });

    it('geocentricSurfaceNormal', function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.normalize().equals(Ellipsoid.geocentricSurfaceNormal(v))).toEqual(true);
    });

    it('geodeticSurfaceNormal', function() {
        expect(Cartesian3.UNIT_X.equals(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormal(Cartesian3.UNIT_X))).toEqual(true);
        expect(Cartesian3.UNIT_Z.equals(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormal(Cartesian3.UNIT_Z))).toEqual(true);
    });

    it('geodeticSurfaceNormalc', function() {
        expect(Cartesian3.UNIT_X.equalsEpsilon(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormalc(Cartographic3.ZERO), CesiumMath.EPSILON10)).toEqual(true);
        expect(Cartesian3.UNIT_Z.equalsEpsilon(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormalc(new Cartographic3(0, CesiumMath.PI_OVER_TWO, 0)), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('toCartesian', function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

        expect(Cartesian3.UNIT_X.equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(0, 0)), CesiumMath.EPSILON10)).toEqual(true);

        expect(Cartesian3.UNIT_Y.equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(CesiumMath.toRadians(90), 0)), CesiumMath.EPSILON10)).toEqual(true);

        expect(new Cartesian3(0, 0, 0.7).equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(0, CesiumMath.toRadians(90))), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('toCartesian', function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

        expect(new Cartesian3(2, 0, 0).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(0, 0, 1)), CesiumMath.EPSILON10)).toEqual(true);

        expect(new Cartesian3(0, 2, 0).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(CesiumMath.toRadians(90), 0, 1)), CesiumMath.EPSILON10)).toEqual(true);

        expect(new Cartesian3(0, 0, 1.7).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(0, CesiumMath.toRadians(90), 1)), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('toCartesians', function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));
        var cartographics = [new Cartographic3(0, 0, 1),
                             new Cartographic3(CesiumMath.toRadians(90), 0, 1),
                             new Cartographic3(0, CesiumMath.toRadians(90), 1)];
        var cartesians = ellipsoid.toCartesians(cartographics);
        expect(cartesians[0].equalsEpsilon(new Cartesian3(2, 0, 0), CesiumMath.EPSILON10)).toEqual(true);
        expect(cartesians[1].equalsEpsilon(new Cartesian3(0, 2, 0), CesiumMath.EPSILON10)).toEqual(true);
        expect(cartesians[2].equalsEpsilon(new Cartesian3(0, 0, 1.7), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('toCartographic3', function() {
        var ellipsoid = Ellipsoid.WGS84;

        expect(Cartographic3.ZERO.equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(Cartographic3.ZERO)), CesiumMath.EPSILON8)).toEqual(true);

        var p = new Cartographic3(CesiumMath.toRadians(45), CesiumMath.toRadians(-60), -123.4);
        expect(p.equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(p)), CesiumMath.EPSILON3)).toEqual(true);

        var p2 = new Cartographic3(CesiumMath.toRadians(-97.3), CesiumMath.toRadians(71.2), 1188.7);
        expect(p2.equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(p2)), CesiumMath.EPSILON3)).toEqual(true);
    });

    it('toCartographic3s', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = Cartographic3.ZERO;
        var p2 = new Cartographic3(CesiumMath.toRadians(45), CesiumMath.toRadians(-60), -123.4);
        var p3 = new Cartographic3(CesiumMath.toRadians(-97.3), CesiumMath.toRadians(71.2), 1188.7);
        var cartesians = [ellipsoid.toCartesian(p1),
                          ellipsoid.toCartesian(p2),
                          ellipsoid.toCartesian(p3)];
        var cartographics = ellipsoid.toCartographic3s(cartesians);
        expect(cartographics[0].equalsEpsilon(p1, CesiumMath.EPSILON9)).toEqual(true);
        expect(cartographics[1].equalsEpsilon(p2, CesiumMath.EPSILON9)).toEqual(true);
        expect(cartographics[2].equalsEpsilon(p3, CesiumMath.EPSILON9)).toEqual(true);
    });

    it('toCartographic2', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        expect(Cartographic2.ZERO.equalsEpsilon(unitSphere.toCartographic2(Cartesian3.UNIT_X), CesiumMath.EPSILON8)).toEqual(true);

        expect(new Cartographic2(0, CesiumMath.PI_OVER_TWO).equalsEpsilon(unitSphere.toCartographic2(Cartesian3.UNIT_Z), CesiumMath.EPSILON8)).toEqual(true);
    });

    it('can convert cartographicDegrees to Cartesian', function() {
        var ellipsoid = Ellipsoid.WGS84;

        var lon = 45, lat = -60, height = 123.4;
        var expected = ellipsoid.toCartesian(new Cartographic3(CesiumMath.toRadians(lon), CesiumMath.toRadians(lat), height));
        var actual = ellipsoid.cartographicDegreesToCartesian(new Cartographic3(lon, lat, height));
        expect(expected.equalsEpsilon(actual, CesiumMath.EPSILON8)).toEqual(true);

        expected = [expected];
        actual = ellipsoid.cartographicDegreesToCartesians([new Cartographic3(lon, lat, height)]);
        expect(expected.length).toEqual(actual.length);
        expect(expected[0].equalsEpsilon(actual[0], CesiumMath.EPSILON8)).toEqual(true);
    });

    it('scaleToGeocentricSurface', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        expect(Cartesian3.UNIT_X.equalsEpsilon(unitSphere.scaleToGeocentricSurface(new Cartesian3(0.5, 0, 0)), CesiumMath.EPSILON8)).toEqual(true);
    });

    it('scaleToGeodeticSurface', function() {
        var unitSphere = Ellipsoid.UNIT_SPHERE;

        expect(Cartesian3.UNIT_X.equalsEpsilon(unitSphere.scaleToGeodeticSurface(new Cartesian3(0.5, 0, 0)), CesiumMath.EPSILON8)).toEqual(true);

        expect(Cartesian3.UNIT_X.equalsEpsilon(unitSphere.scaleToGeodeticSurface(new Cartesian3(3, 0, 0)), CesiumMath.EPSILON8)).toEqual(true);
    });

    it('equals another ellipsoid', function() {
        var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
        var e1 = new Ellipsoid(new Cartesian3(1, 2, 3));
        expect(e0.equals(e1)).toEqual(true);
    });

    it('does not equal another ellipsoid', function() {
        var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
        var e1 = new Ellipsoid(new Cartesian3(4, 5, 6));
        expect(e0.equals(e1)).toEqual(false);
    });
});