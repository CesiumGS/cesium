/*global defineSuite*/
defineSuite([
         'Core/EquidistantCylindricalProjection',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         EquidistantCylindricalProjection,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var projection = new EquidistantCylindricalProjection();
        expect(projection.getEllipsoid()).toEqual(Ellipsoid.WGS84);
    });

    it('construct1', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var projection = new EquidistantCylindricalProjection(ellipsoid);
        expect(projection.getEllipsoid()).toEqual(ellipsoid);
    });

    it('project0', function() {
        var height = 10.0;
        var cartographic = new Cartographic(0.0, 0.0, height);
        var projection = new EquidistantCylindricalProjection();
        expect(projection.project(cartographic).equals(new Cartesian3(0.0, 0.0, height))).toEqual(true);
    });

    it('project1', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var cartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var expected = new Cartesian3(Math.PI * ellipsoid.getRadii().x, CesiumMath.PI_OVER_TWO * ellipsoid.getRadii().z, 0.0);
        var projection = new EquidistantCylindricalProjection(ellipsoid);
        expect(projection.project(cartographic).equals(expected)).toEqual(true);
    });

    it('project2', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var cartographic = new Cartographic(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var expected = new Cartesian3(-Math.PI, CesiumMath.PI_OVER_TWO, 0.0);
        var projection = new EquidistantCylindricalProjection(ellipsoid);
        expect(projection.project(cartographic).equals(expected)).toEqual(true);
    });

    it('unproject', function() {
        var cartographic = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_FOUR, 12.0);
        var projection = new EquidistantCylindricalProjection();
        var projected = projection.project(cartographic);
        expect(projection.unproject(projected).equals(cartographic)).toEqual(true);
    });
});