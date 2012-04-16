(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("CubeMapEllipsoidTessellator", function () {

        var Cartesian3 = Cesium.Cartesian3;
        var Ellipsoid = Cesium.Ellipsoid;
        var CubeMapEllipsoidTessellator = Cesium.CubeMapEllipsoidTessellator;

        it("compute0", function () {
            expect(function () {
                return CubeMapEllipsoidTessellator.compute(Ellipsoid.getUnitSphere(), -1);
            }).toThrow();
        });

        it("compute1", function () {
            var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.getUnitSphere(), 1);

            expect(m.attributes.position.values.length).toEqual(3 * 8);
            expect(m.indexLists[0].values.length).toEqual(12 * 3);
        });

        it("compute2", function () {
            var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.getUnitSphere(), 2);

            expect(m.attributes.position.values.length).toEqual(3 * (8 + 6 + 12));
            expect(m.indexLists[0].values.length).toEqual(2 * 3 * 4 * 6);
        });

        it("compute3", function () {
            var m = CubeMapEllipsoidTessellator.compute(Ellipsoid.getUnitSphere(), 3);

            var position = m.attributes.position.values;
            for (var i = 0; i < position.length; i += 3) {
                expect(1.0).toEqualEpsilon(
                    new Cartesian3(position[i], position[i + 1], position[i + 2]).magnitude(),
                    Cesium.Math.EPSILON10);
            }
        });
    });
}());