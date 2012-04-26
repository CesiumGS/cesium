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

    it("construct", function() {
        var e = new Ellipsoid(new Cartesian3(1, 2, 3));

        expect(e.getRadii().equals(new Cartesian3(1, 2, 3))).toBeTruthy();
        expect(e.getRadiiSquared().equals(new Cartesian3(1 * 1, 2 * 2, 3 * 3))).toBeTruthy();
        expect(e.getRadiiToTheFourth().equals(new Cartesian3(1 * 1 * 1 * 1, 2 * 2 * 2 * 2, 3 * 3 * 3 * 3))).toBeTruthy();
        expect(e.getOneOverRadiiSquared().equals(new Cartesian3(1 / (1 * 1), 1 / (2 * 2), 1 / (3 * 3)))).toBeTruthy();
    });

    it("getMinimumRadius", function() {
        expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMinimumRadius()).toEqual(1);
    });

    it("getMaximumRadius", function() {
        expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMaximumRadius()).toEqual(3);
    });

    it("geocentricSurfaceNormal", function() {
        var v = new Cartesian3(1, 2, 3);
        expect(v.normalize().equals(Ellipsoid.geocentricSurfaceNormal(v))).toBeTruthy();
    });

    it("geodeticSurfaceNormal", function() {
        expect(Cartesian3.getUnitX().equals(Ellipsoid.getUnitSphere().geodeticSurfaceNormal(Cartesian3.getUnitX()))).toBeTruthy();
        expect(Cartesian3.getUnitZ().equals(Ellipsoid.getUnitSphere().geodeticSurfaceNormal(Cartesian3.getUnitZ()))).toBeTruthy();
    });

    it("geodeticSurfaceNormalc", function() {
        expect(Cartesian3.getUnitX().equalsEpsilon(Ellipsoid.getUnitSphere().geodeticSurfaceNormalc(Cartographic3.getZero()), CesiumMath.EPSILON10)).toBeTruthy();
        expect(Cartesian3.getUnitZ().equalsEpsilon(Ellipsoid.getUnitSphere().geodeticSurfaceNormalc(new Cartographic3(0, CesiumMath.PI_OVER_TWO, 0)), CesiumMath.EPSILON10)).toBeTruthy();
    });

    it("toCartesian", function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

        expect(Cartesian3.getUnitX().equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(0, 0)), CesiumMath.EPSILON10)).toBeTruthy();

        expect(Cartesian3.getUnitY().equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(CesiumMath.toRadians(90), 0)), CesiumMath.EPSILON10)).toBeTruthy();

        expect(new Cartesian3(0, 0, 0.7).equalsEpsilon(ellipsoid.toCartesian(new Cartographic2(0, CesiumMath.toRadians(90))), CesiumMath.EPSILON10)).toBeTruthy();
    });

    it("toCartesian", function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

        expect(new Cartesian3(2, 0, 0).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(0, 0, 1)), CesiumMath.EPSILON10)).toBeTruthy();

        expect(new Cartesian3(0, 2, 0).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(CesiumMath.toRadians(90), 0, 1)), CesiumMath.EPSILON10)).toBeTruthy();

        expect(new Cartesian3(0, 0, 1.7).equalsEpsilon(ellipsoid.toCartesian(new Cartographic3(0, CesiumMath.toRadians(90), 1)), CesiumMath.EPSILON10)).toBeTruthy();
    });

    it("toCartographic3", function() {
        var ellipsoid = Ellipsoid.getWgs84();

        expect(Cartographic3.getZero().equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(Cartographic3.getZero())), CesiumMath.EPSILON8)).toBeTruthy();

        var p = new Cartographic3(CesiumMath.toRadians(45), CesiumMath.toRadians(-60), -123.4);
        expect(p.equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(p)), CesiumMath.EPSILON3)).toBeTruthy();

        var p2 = new Cartographic3(CesiumMath.toRadians(-97.3), CesiumMath.toRadians(71.2), 1188.7);
        expect(p2.equalsEpsilon(ellipsoid.toCartographic3(ellipsoid.toCartesian(p2)), CesiumMath.EPSILON3)).toBeTruthy();
    });

    it("toCartographic2", function() {
        var unitSphere = Ellipsoid.getUnitSphere();

        expect(Cartographic2.getZero().equalsEpsilon(unitSphere.toCartographic2(Cartesian3.getUnitX()), CesiumMath.EPSILON8)).toBeTruthy();

        expect(new Cartographic2(0, CesiumMath.PI_OVER_TWO).equalsEpsilon(unitSphere.toCartographic2(Cartesian3.getUnitZ()), CesiumMath.EPSILON8)).toBeTruthy();
    });

    it("can convert cartographicDegrees to Cartesian", function() {
        var ellipsoid = Ellipsoid.getWgs84();

        var lon = 45, lat = -60, height = 123.4;
        var expected = ellipsoid.toCartesian(new Cartographic3(CesiumMath.toRadians(lon), CesiumMath.toRadians(lat), height));
        var actual = ellipsoid.cartographicDegreesToCartesian(new Cartographic3(lon, lat, height));
        expect(expected.equalsEpsilon(actual, CesiumMath.EPSILON8)).toBeTruthy();

        expected = [expected];
        actual = ellipsoid.cartographicDegreesToCartesians([new Cartographic3(lon, lat, height)]);
        expect(expected.length).toEqual(actual.length);
        expect(expected[0].equalsEpsilon(actual[0], CesiumMath.EPSILON8)).toBeTruthy();
    });

    it("scaleToGeocentricSurface", function() {
        var unitSphere = Ellipsoid.getUnitSphere();

        expect(Cartesian3.getUnitX().equalsEpsilon(unitSphere.scaleToGeocentricSurface(new Cartesian3(0.5, 0, 0)), CesiumMath.EPSILON8)).toBeTruthy();
    });

    it("scaleToGeodeticSurface", function() {
        var unitSphere = Ellipsoid.getUnitSphere();

        expect(Cartesian3.getUnitX().equalsEpsilon(unitSphere.scaleToGeodeticSurface(new Cartesian3(0.5, 0, 0)), CesiumMath.EPSILON8)).toBeTruthy();

        expect(Cartesian3.getUnitX().equalsEpsilon(unitSphere.scaleToGeodeticSurface(new Cartesian3(3, 0, 0)), CesiumMath.EPSILON8)).toBeTruthy();
    });

    it("equals another ellipsoid", function() {
        var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
        var e1 = new Ellipsoid(new Cartesian3(1, 2, 3));
        expect(e0.equals(e1)).toBeTruthy();
    });

    it("doesn't equal another ellipsoid", function() {
        var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
        var e1 = new Ellipsoid(new Cartesian3(4, 5, 6));
        expect(e0.equals(e1)).toBeFalsy();
    });
});