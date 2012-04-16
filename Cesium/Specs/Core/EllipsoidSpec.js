(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("Ellipsoid", function () {

        var Cartesian3 = Cesium.Cartesian3;
        var Cartographic3 = Cesium.Cartographic3;
        var Ellipsoid = Cesium.Ellipsoid;

        it("construct", function () {
            var e = new Ellipsoid(new Cartesian3(1, 2, 3));

            expect(e.getRadii().equals(new Cartesian3(1, 2, 3))).toBeTruthy();
            expect(e.getRadiiSquared().equals(new Cartesian3(1 * 1, 2 * 2, 3 * 3))).toBeTruthy();
            expect(e.getRadiiToTheFourth().equals(new Cartesian3(
                1 * 1 * 1 * 1,
                2 * 2 * 2 * 2,
                3 * 3 * 3 * 3))).toBeTruthy();
            expect(e.getOneOverRadiiSquared().equals(new Cartesian3(
                1 / (1 * 1),
                1 / (2 * 2),
                1 / (3 * 3)))).toBeTruthy();
        });

        it("getMinimumRadius", function () {
            expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMinimumRadius()).toEqual(1);
        });

        it("getMaximumRadius", function () {
            expect(new Ellipsoid(new Cartesian3(1, 2, 3)).getMaximumRadius()).toEqual(3);
        });

        it("geocentricSurfaceNormal", function () {
            var v = new Cartesian3(1, 2, 3);
            expect(v.normalize().equals(Ellipsoid.geocentricSurfaceNormal(v))).toBeTruthy();
        });

        it("geodeticSurfaceNormal", function () {
            expect(Cartesian3.getUnitX().equals(
                Ellipsoid.getUnitSphere().geodeticSurfaceNormal(Cartesian3.getUnitX()))).toBeTruthy();
            expect(Cartesian3.getUnitZ().equals(
                Ellipsoid.getUnitSphere().geodeticSurfaceNormal(Cartesian3.getUnitZ()))).toBeTruthy();
        });

        it("geodeticSurfaceNormalc", function () {
            expect(Cartesian3.getUnitX().equalsEpsilon(
                Ellipsoid.getUnitSphere().geodeticSurfaceNormalc(
                    Cartographic3.getZero()), Cesium.Math.EPSILON10)).toBeTruthy();
            expect(Cartesian3.getUnitZ().equalsEpsilon(
                Ellipsoid.getUnitSphere().geodeticSurfaceNormalc(
                    new Cartographic3(0, Cesium.Math.PI_OVER_TWO, 0)), Cesium.Math.EPSILON10)).toBeTruthy();
        });

        it("toCartesian", function () {
            var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

            expect(Cartesian3.getUnitX().equalsEpsilon(
                ellipsoid.toCartesian(new Cesium.Cartographic2(0, 0)),
                Cesium.Math.EPSILON10)).toBeTruthy();

            expect(Cartesian3.getUnitY().equalsEpsilon(
                ellipsoid.toCartesian(new Cesium.Cartographic2(Cesium.Math.toRadians(90), 0)),
                Cesium.Math.EPSILON10)).toBeTruthy();

            expect(new Cartesian3(0, 0, 0.7).equalsEpsilon(
                ellipsoid.toCartesian(new Cesium.Cartographic2(0, Cesium.Math.toRadians(90))),
                Cesium.Math.EPSILON10)).toBeTruthy();
        });

        it("toCartesian", function () {
            var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));

            expect(new Cartesian3(2, 0, 0).equalsEpsilon(
                ellipsoid.toCartesian(new Cartographic3(0, 0, 1)),
                Cesium.Math.EPSILON10)).toBeTruthy();

            expect(new Cartesian3(0, 2, 0).equalsEpsilon(
                ellipsoid.toCartesian(new Cartographic3(Cesium.Math.toRadians(90), 0, 1)),
                Cesium.Math.EPSILON10)).toBeTruthy();

            expect(new Cartesian3(0, 0, 1.7).equalsEpsilon(
                ellipsoid.toCartesian(new Cartographic3(0, Cesium.Math.toRadians(90), 1)),
                Cesium.Math.EPSILON10)).toBeTruthy();
        });

        it("toCartographic3", function () {
            var ellipsoid = Ellipsoid.getWgs84();

            expect(Cartographic3.getZero().equalsEpsilon(
                ellipsoid.toCartographic3(ellipsoid.toCartesian(Cartographic3.getZero())),
                Cesium.Math.EPSILON8)).toBeTruthy();

            var p = new Cartographic3(Cesium.Math.toRadians(45), Cesium.Math.toRadians(-60), -123.4);
            expect(p.equalsEpsilon(
                ellipsoid.toCartographic3(ellipsoid.toCartesian(p)),
                Cesium.Math.EPSILON3)).toBeTruthy();

            var p2 = new Cartographic3(Cesium.Math.toRadians(-97.3), Cesium.Math.toRadians(71.2), 1188.7);
            expect(p2.equalsEpsilon(
                ellipsoid.toCartographic3(ellipsoid.toCartesian(p2)),
                Cesium.Math.EPSILON3)).toBeTruthy();
        });

        it("toCartographic2", function () {
            var unitSphere = Ellipsoid.getUnitSphere();

            expect(Cesium.Cartographic2.getZero().equalsEpsilon(
                unitSphere.toCartographic2(Cartesian3.getUnitX()),
                Cesium.Math.EPSILON8
            )).toBeTruthy();

            expect(new Cesium.Cartographic2(0, Cesium.Math.PI_OVER_TWO).equalsEpsilon(
                unitSphere.toCartographic2(Cartesian3.getUnitZ()),
                Cesium.Math.EPSILON8
            )).toBeTruthy();
        });

        it("can convert cartographicDegrees to Cartesian", function() {
            var ellipsoid = Ellipsoid.getWgs84();

            var lon = 45, lat = -60, height = 123.4;
            var expected = ellipsoid.toCartesian(new Cartographic3(Cesium.Math.toRadians(lon), Cesium.Math.toRadians(lat), height));
            var actual = ellipsoid.cartographicDegreesToCartesian(new Cartographic3(lon, lat, height));
            expect(expected.equalsEpsilon(actual, Cesium.Math.EPSILON8)).toBeTruthy();

            expected = [expected];
            actual = ellipsoid.cartographicDegreesToCartesians([new Cartographic3(lon, lat, height)]);
            expect(expected.length).toEqual(actual.length);
            expect(expected[0].equalsEpsilon(actual[0], Cesium.Math.EPSILON8)).toBeTruthy();
        });

        it("scaleToGeocentricSurface", function () {
            var unitSphere = Ellipsoid.getUnitSphere();

            expect(Cartesian3.getUnitX().equalsEpsilon(
                unitSphere.scaleToGeocentricSurface(new Cartesian3(0.5, 0, 0)),
                Cesium.Math.EPSILON8
            )).toBeTruthy();
        });

        it("scaleToGeodeticSurface", function () {
            var unitSphere = Ellipsoid.getUnitSphere();

            expect(Cartesian3.getUnitX().equalsEpsilon(
                unitSphere.scaleToGeodeticSurface(new Cartesian3(0.5, 0, 0)),
                Cesium.Math.EPSILON8
            )).toBeTruthy();

            expect(Cartesian3.getUnitX().equalsEpsilon(
                unitSphere.scaleToGeodeticSurface(new Cartesian3(3, 0, 0)),
                Cesium.Math.EPSILON8
            )).toBeTruthy();
        });

        it("equals another ellipsoid", function () {
            var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
            var e1 = new Ellipsoid(new Cartesian3(1, 2, 3));
            expect(e0.equals(e1)).toBeTruthy();
        });

        it("doesn't equal another ellipsoid", function () {
            var e0 = new Ellipsoid(new Cartesian3(1, 2, 3));
            var e1 = new Ellipsoid(new Cartesian3(4, 5, 6));
            expect(e0.equals(e1)).toBeFalsy();
        });
    });
}());