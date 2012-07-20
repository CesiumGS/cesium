/*global defineSuite*/
defineSuite([
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Math'
     ], function(
         Ellipsoid,
         Cartesian3,
         Cartographic,
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
        expect(Cartesian3.UNIT_X.equalsEpsilon(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormalc(Cartographic.ZERO), CesiumMath.EPSILON10)).toEqual(true);
        expect(Cartesian3.UNIT_Z.equalsEpsilon(Ellipsoid.UNIT_SPHERE.geodeticSurfaceNormalc(new Cartographic(0, CesiumMath.PI_OVER_TWO, 0)), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('cartographicToCartesian', function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));
        expect(new Cartesian3(2, 0, 0).equalsEpsilon(ellipsoid.cartographicToCartesian(new Cartographic(0, 0, 1)), CesiumMath.EPSILON10)).toEqual(true);
        expect(new Cartesian3(0, 2, 0).equalsEpsilon(ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(90, 0, 1)), CesiumMath.EPSILON10)).toEqual(true);
        expect(new Cartesian3(0, 0, 1.7).equalsEpsilon(ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0, 90, 1)), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('cartographicArrayToCartesianArray', function() {
        var ellipsoid = new Ellipsoid(new Cartesian3(1, 1, 0.7));
        var cartographics = [new Cartographic(0, 0, 1),
                             Cartographic.fromDegrees(90, 0, 1),
                             Cartographic.fromDegrees(0, 90, 1)];
        var cartesians = ellipsoid.cartographicArrayToCartesianArray(cartographics);
        expect(cartesians[0].equalsEpsilon(new Cartesian3(2, 0, 0), CesiumMath.EPSILON10)).toEqual(true);
        expect(cartesians[1].equalsEpsilon(new Cartesian3(0, 2, 0), CesiumMath.EPSILON10)).toEqual(true);
        expect(cartesians[2].equalsEpsilon(new Cartesian3(0, 0, 1.7), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('cartesianToCartographic', function() {
        var ellipsoid = Ellipsoid.WGS84;

        expect(Cartographic.ZERO.equalsEpsilon(ellipsoid.cartesianToCartographic(ellipsoid.cartographicToCartesian(Cartographic.ZERO)), CesiumMath.EPSILON8)).toEqual(true);

        var p = Cartographic.fromDegrees(45, -60, -123.4);
        expect(p.equalsEpsilon(ellipsoid.cartesianToCartographic(ellipsoid.cartographicToCartesian(p)), CesiumMath.EPSILON3)).toEqual(true);

        var p2 = Cartographic.fromDegrees(-97.3, 71.2, 1188.7);
        expect(p2.equalsEpsilon(ellipsoid.cartesianToCartographic(ellipsoid.cartographicToCartesian(p2)), CesiumMath.EPSILON3)).toEqual(true);
    });

    it('cartesianArrayToCartographicArray', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = Cartographic.ZERO;
        var p2 = Cartographic.fromDegrees(45, -60, -123.4);
        var p3 = Cartographic.fromDegrees(-97.3, 71.2, 1188.7);
        var cartesians = [ellipsoid.cartographicToCartesian(p1),
                          ellipsoid.cartographicToCartesian(p2),
                          ellipsoid.cartographicToCartesian(p3)];
        var cartographics = ellipsoid.cartesianArrayToCartographicArray(cartesians);
        expect(cartographics[0]).toEqualEpsilon(p1, CesiumMath.EPSILON6);
        expect(cartographics[1]).toEqualEpsilon(p2, CesiumMath.EPSILON6);
        expect(cartographics[2]).toEqualEpsilon(p3, CesiumMath.EPSILON6);
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