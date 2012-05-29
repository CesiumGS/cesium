/*global defineSuite*/
defineSuite([
         'Scene/ColorMaterial',
         '../Specs/renderMaterial'
     ], function(
         ColorMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a flat color material", function() {
        var pixel = renderMaterial(new ColorMaterial({
            color: {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            }
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
