defineSuite([
        'Core/Cartographic',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        Cartographic,
        Cartesian3,
        Ellipsoid,
        CesiumMath) {
    'use strict';

    var surfaceCartesian = new Cartesian3(4094327.7921465295, 1909216.4044747739, 4487348.4088659193);
    var surfaceCartographic = new Cartographic(CesiumMath.toRadians(25.0), CesiumMath.toRadians(45.0), 0.0);

    it('default constructor sets expected properties', function() {
        var c = new Cartographic();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
        expect(c.height).toEqual(0);
    });

    it('constructor sets expected properties from parameters', function() {
        var c = new Cartographic(1.0, 2.0, 3.0);
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
        expect(c.height).toEqual(3);
    });

    it('toCartesian conversion from Cartographic input to Cartesian3 output', function(){
        var lon = CesiumMath.toRadians(150);
        var lat = CesiumMath.toRadians(-40);
        var height = 100000;
        var ellipsoid = Ellipsoid.WGS84;
        var actual = Cartographic.toCartesian(new Cartographic(lon, lat, height));
        var expected = ellipsoid.cartographicToCartesian(new Cartographic(lon, lat, height));
        expect(actual).toEqual(expected);
    });

    it('fromRadians works without a result parameter', function() {
        var c = Cartographic.fromRadians(Math.PI/2, Math.PI/4, 100.0);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100.0);
    });

    it('fromRadians works with a result parameter', function() {
        var result = new Cartographic();
        var c = Cartographic.fromRadians(Math.PI/2, Math.PI/4, 100.0, result);
        expect(result).toBe(c);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100.0);
    });

    it('fromRadians throws without longitude or latitude parameter but defaults altitude', function() {
        expect(function() {
            Cartographic.fromRadians(undefined, 0.0);
        }).toThrowDeveloperError();
        expect(function() {
            Cartographic.fromRadians(0.0, undefined);
        }).toThrowDeveloperError();
        var c = Cartographic.fromRadians(Math.PI/2, Math.PI/4);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(0.0);
    });

    it('fromDegrees works without a result parameter', function() {
        var c = Cartographic.fromDegrees(90.0, 45.0, 100.0);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100);
    });

    it('fromDegrees works with a result parameter', function() {
        var result = new Cartographic();
        var c = Cartographic.fromDegrees(90.0, 45.0, 100.0, result);
        expect(result).toBe(c);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(100);
    });

    it('fromDegrees throws without longitude or latitude parameter but defaults altitude', function() {
        expect(function() {
            Cartographic.fromDegrees(undefined, 0.0);
        }).toThrowDeveloperError();
        expect(function() {
            Cartographic.fromDegrees(0.0, undefined);
        }).toThrowDeveloperError();
        var c = Cartographic.fromDegrees(90.0, 45.0);
        expect(c.longitude).toEqual(Math.PI/2);
        expect(c.latitude).toEqual(Math.PI/4);
        expect(c.height).toEqual(0.0);
    });

    it('fromCartesian works without a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var c = Cartographic.fromCartesian(surfaceCartesian, ellipsoid);
        expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
    });

    it('fromCartesian works with a result parameter', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var result = new Cartographic();
        var c = Cartographic.fromCartesian(surfaceCartesian, ellipsoid, result);
        expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
        expect(result).toBe(c);
    });

    it('fromCartesian works without an ellipsoid', function() {
        var c = Cartographic.fromCartesian(surfaceCartesian);
        expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
    });

    it('fromCartesian throws when there is no cartesian', function() {
        expect(function() {
            Cartographic.fromCartesian();
        }).toThrowDeveloperError();
    });

    it('fromCartesian works with a value that is above the ellipsoid surface', function() {
        var cartographic1 = Cartographic.fromDegrees(35.766989, 33.333602, 3000);
        var cartesian1 = Cartesian3.fromRadians(cartographic1.longitude, cartographic1.latitude, cartographic1.height);
        var cartographic2 = Cartographic.fromCartesian(cartesian1);

        expect(cartographic2).toEqualEpsilon(cartographic1, CesiumMath.EPSILON8);
    });

    it('fromCartesian works with a value that is bellow the ellipsoid surface', function() {
        var cartographic1 = Cartographic.fromDegrees(35.766989, 33.333602, -3000);
        var cartesian1 = Cartesian3.fromRadians(cartographic1.longitude, cartographic1.latitude, cartographic1.height);
        var cartographic2 = Cartographic.fromCartesian(cartesian1);

        expect(cartographic2).toEqualEpsilon(cartographic1, CesiumMath.EPSILON8);
    });

    it('clone without a result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var result = cartographic.clone();
        expect(cartographic).not.toBe(result);
        expect(cartographic).toEqual(result);
    });

    it('clone with a result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var result = new Cartographic();
        var returnedResult = cartographic.clone(result);
        expect(cartographic).not.toBe(result);
        expect(result).toBe(returnedResult);
        expect(cartographic).toEqual(result);
    });

    it('clone works with "this" result parameter', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        var returnedResult = cartographic.clone(cartographic);
        expect(cartographic).toBe(returnedResult);
    });

    it('equals', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        expect(cartographic.equals(new Cartographic(1.0, 2.0, 3.0))).toEqual(true);
        expect(cartographic.equals(new Cartographic(2.0, 2.0, 3.0))).toEqual(false);
        expect(cartographic.equals(new Cartographic(2.0, 1.0, 3.0))).toEqual(false);
        expect(cartographic.equals(new Cartographic(1.0, 2.0, 4.0))).toEqual(false);
        expect(cartographic.equals(undefined)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        var cartographic = new Cartographic(1.0, 2.0, 3.0);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 0.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 1.0)).toEqual(true);
        expect(cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 0.99999)).toEqual(false);
        expect(cartographic.equalsEpsilon(undefined, 1)).toEqual(false);
    });

    it('toString', function() {
        var cartographic = new Cartographic(1.123, 2.345, 6.789);
        expect(cartographic.toString()).toEqual('(1.123, 2.345, 6.789)');
    });

    it('clone returns undefined without cartographic parameter', function() {
        expect(Cartographic.clone(undefined)).toBeUndefined();
    });

    it('equalsEpsilon throws without numeric epsilon', function() {
        expect(function() {
            Cartographic.equalsEpsilon(new Cartographic(), new Cartographic(), {});
        }).toThrowDeveloperError();
    });
});
