defineSuite([
        'Core/MercatorProjection',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        MercatorProjection,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath) {
    'use strict';

    it('construct0', function() {
        var projection = new MercatorProjection();
        expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var projection = new MercatorProjection(ellipsoid);
        expect(projection.ellipsoid).toEqual(ellipsoid);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new MercatorProjection();
        expect(projection.project(cartographic)).toEqualEpsilon(new Cartesian3(0.0, 0.0, height), CesiumMath.EPSILON8);
    });

    it('project1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // Verified using https://epsg.io/transform#s_srs=4326&t_srs=3395 which uses proj
        var expected = new Cartesian3(
                20037508.3427892,
                5591295.91855339,
                0.0);

        var projection = new MercatorProjection(ellipsoid);
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('project1 with result', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // Verified using https://epsg.io/transform#s_srs=4326&t_srs=3395 which uses proj
        var expected = new Cartesian3(
                20037508.3427892,
                5591295.91855339,
                0.0);

        var projection = new MercatorProjection(ellipsoid);
        var result = new Cartesian3(0.0, 0.0, 0.0);
        var returnValue = projection.project(cartographic, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.0);

        var projection = new MercatorProjection(ellipsoid);
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('unproject0', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new MercatorProjection();
        var projected = projection.project(cartographic);
        expect(projection.unproject(projected)).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('unproject0 with result', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new MercatorProjection();
        var projected = projection.project(cartographic);
        var result = new Cartographic(0.0, 0.0, 0.0);
        var returnValue = projection.unproject(projected, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('unproject1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartesian = new Cartesian3(
                20037508.3427892,
                5591295.91855339,
                0.0);

        // Verified using https://epsg.io/transform#s_srs=3395&t_srs=4326 which uses proj
        var expected = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        var projection = new MercatorProjection(ellipsoid);
        expect(projection.unproject(cartesian)).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('unproject2', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        var projection = new MercatorProjection(ellipsoid);
        var projected = projection.project(cartographic);
        var unprojected = projection.unproject(projected);

        expect(unprojected).toEqualEpsilon(cartographic, CesiumMath.EPSILON15);
    });

    it('unproject is correct at corners', function() {
        var projection = new MercatorProjection();
        var southwest = projection.unproject(new Cartesian2(-20037508.342787, -34619289.37));
        expect(southwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
        expect(southwest.latitude).toEqualEpsilon(CesiumMath.toRadians(-89.5), CesiumMath.EPSILON11);

        var southeast = projection.unproject(new Cartesian2(20037508.342787, -34619289.37));
        expect(southeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
        expect(southeast.latitude).toEqualEpsilon(CesiumMath.toRadians(-89.5), CesiumMath.EPSILON11);

        var northeast = projection.unproject(new Cartesian2(20037508.342787, 34619289.37));
        expect(northeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
        expect(northeast.latitude).toEqualEpsilon(CesiumMath.toRadians(89.5), CesiumMath.EPSILON11);

        var northwest = projection.unproject(new Cartesian2(-20037508.342787, 34619289.37));
        expect(northwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
        expect(northwest.latitude).toEqualEpsilon(CesiumMath.toRadians(89.5), CesiumMath.EPSILON11);
    });

    it('project is correct at corners.', function() {
        var maxLatitude = MercatorProjection.MaximumLatitude;

        var projection = new MercatorProjection();

        var southwest = projection.project(new Cartographic(-Math.PI, -maxLatitude));
        expect(southwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
        expect(southwest.y).toEqualEpsilon(-34619289.371946, CesiumMath.EPSILON3);

        var southeast = projection.project(new Cartographic(Math.PI, -maxLatitude));
        expect(southeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
        expect(southeast.y).toEqualEpsilon(-34619289.371946, CesiumMath.EPSILON3);

        var northeast = projection.project(new Cartographic(Math.PI, maxLatitude));
        expect(northeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
        expect(northeast.y).toEqualEpsilon(34619289.371946, CesiumMath.EPSILON3);

        var northwest = projection.project(new Cartographic(-Math.PI, maxLatitude));
        expect(northwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
        expect(northwest.y).toEqualEpsilon(34619289.371946, CesiumMath.EPSILON3);
    });

    it('projected y is clamped to valid latitude range.', function() {
        var projection = new MercatorProjection();
        var southPole = projection.project(new Cartographic(0.0, -CesiumMath.PI_OVER_TWO));
        var southLimit = projection.project(new Cartographic(0.0, -MercatorProjection.MaximumLatitude));
        expect(southPole.y).toEqual(southLimit.y);

        var northPole = projection.project(new Cartographic(0.0, CesiumMath.PI_OVER_TWO));
        var northLimit = projection.project(new Cartographic(0.0, MercatorProjection.MaximumLatitude));
        expect(northPole.y).toEqual(northLimit.y);
    });

    it('project throws without cartesian', function() {
        var projection = new MercatorProjection();
        expect(function() {
            return projection.unproject();
        }).toThrowDeveloperError();
    });
});
