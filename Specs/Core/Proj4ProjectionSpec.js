defineSuite([
    'Core/Proj4Projection',
    'Core/Cartesian3',
    'Core/Cartographic',
    'Core/Ellipsoid',
    'Core/Math'
], function(
    Proj4Projection,
    Cartesian3,
    Cartographic,
    Ellipsoid,
    CesiumMath) {
    'use strict';

    var mollweideWellKnownText = '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs';

    it('construct0', function() {
        var projection = new Proj4Projection();
        expect(projection.wellKnownText).toEqual('EPSG:3857');
        expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var projection = new Proj4Projection(mollweideWellKnownText);
        expect(projection.wellKnownText).toEqual(mollweideWellKnownText);
        expect(projection.ellipsoid).toEqual(Ellipsoid.WGS84);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new Proj4Projection(mollweideWellKnownText);
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

        var projection = new Proj4Projection('EPSG:3857');
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);

        // expected equations from Wolfram MathWorld:
        // http://mathworld.wolfram.com/MercatorProjection.html
        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.0);

        var projection = new Proj4Projection('EPSG:3857');
        expect(projection.project(cartographic)).toEqualEpsilon(expected, CesiumMath.EPSILON8);
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

        var projection = new Proj4Projection('EPSG:3857');
        var result = new Cartesian3(0.0, 0.0, 0.0);
        var returnValue = projection.project(cartographic, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON8);
    });

    it('unproject0', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new Proj4Projection('EPSG:3857');
        var projected = projection.project(cartographic);
        expect(projection.unproject(projected)).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('unproject1', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new Proj4Projection('EPSG:3857');
        var projected = projection.project(cartographic);
        var result = new Cartographic(0.0, 0.0, 0.0);
        var returnValue = projection.unproject(projected, result);
        expect(result).toEqual(returnValue);
        expect(result).toEqualEpsilon(cartographic, CesiumMath.EPSILON14);
    });

    it('scales height', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 1.0);

        // expected equations from Wolfram MathWorld:
        // http://mathworld.wolfram.com/MercatorProjection.html
        var expected = new Cartesian3(
                ellipsoid.maximumRadius * cartographic.longitude,
                ellipsoid.maximumRadius * Math.log(Math.tan(Math.PI / 4.0 + cartographic.latitude / 2.0)),
                0.5);

        var projection = new Proj4Projection('EPSG:3857', 0.5);
        var returnValue = projection.project(cartographic);
        expect(returnValue).toEqualEpsilon(expected, CesiumMath.EPSILON8);

        var unprojected = projection.unproject(returnValue);
        expect(unprojected).toEqualEpsilon(cartographic, CesiumMath.EPSILON8);
    });

    it('project throws without cartesian', function() {
        var projection = new Proj4Projection();
        expect(function() {
            return projection.unproject();
        }).toThrowDeveloperError();
    });
});
