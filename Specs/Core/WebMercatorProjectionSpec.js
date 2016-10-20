/*global defineSuite*/
defineSuite([
        'Core/WebMercatorProjection',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        WebMercatorProjection,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath) {
    'use strict';

    it('construct0', function() {
        var projection = new WebMercatorProjection();
        expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var projection = new WebMercatorProjection(ellipsoid);
        expect(projection.ellipsoid).toEqual(ellipsoid);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new WebMercatorProjection();
        expect(projection.project(cartographic)).toEqual(new Cartesian3(0.0, 0.0, height));
    });

    it('project1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // expected equations from Wolfram MathWorld:
        // http://mathworld.wolfram.com/MercatorProjection.html
        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.0);

        var projection = new WebMercatorProjection(ellipsoid);
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // expected equations from Wolfram MathWorld:
        // http://mathworld.wolfram.com/MercatorProjection.html
        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.0);

        var projection = new WebMercatorProjection(ellipsoid);
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON15);
    });

    it('project3', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // expected equations from Wolfram MathWorld:
        // http://mathworld.wolfram.com/MercatorProjection.html
        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.0);

        var projection = new WebMercatorProjection(ellipsoid);
        var result = new Cartesian3(0.0, 0.0, 0.0);
        var returnValue = projection.project(cartographic, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('unproject0', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new WebMercatorProjection();
        var projected = projection.project(cartographic);
        expect(projection.unproject(projected)).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('unproject1', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new WebMercatorProjection();
        var projected = projection.project(cartographic);
        var result = new Cartographic(0.0, 0.0, 0.0);
        var returnValue = projection.unproject(projected, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('unproject is correct at corners', function() {
        var projection = new WebMercatorProjection();
        var southwest = projection.unproject(new Cartesian2(-20037508.342787, -20037508.342787));
        expect(southwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
        expect(southwest.latitude).toEqualEpsilon(CesiumMath.toRadians(-85.05112878), CesiumMath.EPSILON11);

        var southeast = projection.unproject(new Cartesian2(20037508.342787, -20037508.342787));
        expect(southeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
        expect(southeast.latitude).toEqualEpsilon(CesiumMath.toRadians(-85.05112878), CesiumMath.EPSILON11);

        var northeast = projection.unproject(new Cartesian2(20037508.342787, 20037508.342787));
        expect(northeast.longitude).toEqualEpsilon(Math.PI, CesiumMath.EPSILON12);
        expect(northeast.latitude).toEqualEpsilon(CesiumMath.toRadians(85.05112878), CesiumMath.EPSILON11);

        var northwest = projection.unproject(new Cartesian2(-20037508.342787, 20037508.342787));
        expect(northwest.longitude).toEqualEpsilon(-Math.PI, CesiumMath.EPSILON12);
        expect(northwest.latitude).toEqualEpsilon(CesiumMath.toRadians(85.05112878), CesiumMath.EPSILON11);
    });

    it('project is correct at corners.', function() {
        var maxLatitude = WebMercatorProjection.MaximumLatitude;

        var projection = new WebMercatorProjection();

        var southwest = projection.project(new Cartographic(-Math.PI, -maxLatitude));
        expect(southwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
        expect(southwest.y).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);

        var southeast = projection.project(new Cartographic(Math.PI, -maxLatitude));
        expect(southeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
        expect(southeast.y).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);

        var northeast = projection.project(new Cartographic(Math.PI, maxLatitude));
        expect(northeast.x).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
        expect(northeast.y).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);

        var northwest = projection.project(new Cartographic(-Math.PI, maxLatitude));
        expect(northwest.x).toEqualEpsilon(-20037508.342787, CesiumMath.EPSILON3);
        expect(northwest.y).toEqualEpsilon(20037508.342787, CesiumMath.EPSILON3);
    });

    it('projected y is clamped to valid latitude range.', function() {
        var projection = new WebMercatorProjection();
        var southPole = projection.project(new Cartographic(0.0, -CesiumMath.PI_OVER_TWO));
        var southLimit = projection.project(new Cartographic(0.0, -WebMercatorProjection.MaximumLatitude));
        expect(southPole.y).toEqual(southLimit.y);

        var northPole = projection.project(new Cartographic(0.0, CesiumMath.PI_OVER_TWO));
        var northLimit = projection.project(new Cartographic(0.0, WebMercatorProjection.MaximumLatitude));
        expect(northPole.y).toEqual(northLimit.y);
    });

    it('project throws without cartesian', function() {
        var projection = new WebMercatorProjection();
        expect(function() {
            return projection.unproject();
        }).toThrowDeveloperError();
    });
});
