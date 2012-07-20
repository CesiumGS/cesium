/*global defineSuite*/
defineSuite([
         'Core/MercatorProjection',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
             MercatorProjection,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var projection = new MercatorProjection();
        expect(projection.getEllipsoid()).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var projection = new MercatorProjection(ellipsoid);
        expect(projection.getEllipsoid()).toEqual(ellipsoid);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new MercatorProjection();
        expect(projection.project(cartographic).equals(new Cartesian3(0.0, 0.0, height))).toEqual(true);
    });

    it('project1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);
        var expected = new Cartesian3(Math.PI * ellipsoid.getRadii().x, 0.820329694342107 * ellipsoid.getRadii().z, 0.0);
        var projection = new MercatorProjection(ellipsoid);
        expect(projection.project(cartographic).equalsEpsilon(expected, CesiumMath.EPSILON8)).toEqual(true);
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_FOUR, 0.0);
        var expected = new Cartesian3(-Math.PI, 0.820329694342107, 0.0);
        var projection = new MercatorProjection(ellipsoid);
        expect(projection.project(cartographic).equalsEpsilon(expected, CesiumMath.EPSILON15)).toEqual(true);
    });

    it('unproject', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new MercatorProjection();
        var projected = projection.project(cartographic);
        expect(projection.unproject(projected).equalsEpsilon(cartographic, CesiumMath.EPSILON14)).toEqual(true);
    });
});