/*global defineSuite*/
defineSuite([
         'Core/EllipsoidTangentPlane',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Math'
     ], function(
         EllipsoidTangentPlane,
         Ellipsoid,
         Cartesian3,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('projectPointsOntoEllipsoid', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var tangentPlane = new EllipsoidTangentPlane(ellipsoid, new Cartesian3(1, 0, 0));
        var positions = [new Cartesian3(2, -2, 0),
                         new Cartesian3(2, 2, 0)];
        var results = tangentPlane.projectPointsOntoEllipsoid(positions);
        expect(results[0].equalsEpsilon(new Cartesian3(1/3, 2/3, -2/3), CesiumMath.EPSILON10)).toEqual(true);
        expect(results[1].equalsEpsilon(new Cartesian3(1/3, 2/3,  2/3), CesiumMath.EPSILON10)).toEqual(true);
    });

    it('projectPointsOntoEllipsoid throws without positions', function () {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var tangentPlane = new EllipsoidTangentPlane(ellipsoid, new Cartesian3(1, 0, 0));
        expect(function() {
            tangentPlane.projectPointsOntoEllipsoid();
        }).toThrow();
    });
});
