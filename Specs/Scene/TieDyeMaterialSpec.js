/*global defineSuite*/
defineSuite([
         'Scene/TieDyeMaterial',
         '../Specs/renderMaterial'
     ], function(
         TieDyeMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a procedural tie-dye material", function() {
        var pixel = renderMaterial(new TieDyeMaterial({
            lightColor: {
                red: 1.0,
                green: 1.0,
                blue: 0.0,
                alpha: 0.75
            },
            darkColor: {
                red: 1.0,
                green: 0.0,
                blue: 0.0,
                alpha: 0.75
            },
            frequency : 5.0
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
