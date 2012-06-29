/*global defineSuite*/
defineSuite([
         'Core/CubeMapEllipsoidTessellator',
         'Core/Cartesian3',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         CubeMapEllipsoidTessellator,
         Cartesian3,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global it,expect*/

    it('compute0', function() {
        expect(function() {
            return CubeMapEllipsoidTessellator.compute(Ellipsoid.UNIT_SPHERE, -1);
        }).toThrow();
    });

    it('compute1', function() {
        var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.UNIT_SPHERE, 1);

        expect(m.attributes.position.values.length).toEqual(3 * 8);
        expect(m.indexLists[0].values.length).toEqual(12 * 3);
    });

    it('compute2', function() {
        var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.UNIT_SPHERE, 2);

        expect(m.attributes.position.values.length).toEqual(3 * (8 + 6 + 12));
        expect(m.indexLists[0].values.length).toEqual(2 * 3 * 4 * 6);
    });

    it('compute3', function() {
        var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.UNIT_SPHERE, 3);

        var position = m.attributes.position.values;
        for ( var i = 0; i < position.length; i += 3) {
            expect(1.0).toEqualEpsilon(new Cartesian3(position[i], position[i + 1], position[i + 2]).magnitude(), CesiumMath.EPSILON10);
        }
    });
});