(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("BoxTessellator", function () {

        var Cartesian3 = Cesium.Cartesian3;
        var BoxTessellator = Cesium.BoxTessellator;

        it("compute0", function () {
            expect(function () {
                return BoxTessellator.compute({ dimensions : new Cartesian3(1, 2, -1) });
            }).toThrow();
        });

        it("compute1", function () {
            var m = BoxTessellator.compute({ dimensions : new Cartesian3(1, 2, 3) });

            expect(m.attributes.position.values.length).toEqual(8 * 3);
            expect(m.indexLists[0].values.length).toEqual(12 * 3);
        });
    });
}());