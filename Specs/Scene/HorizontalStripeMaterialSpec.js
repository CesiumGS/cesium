/*global defineSuite*/
defineSuite([
         'Scene/HorizontalStripeMaterial',
         '../Specs/renderMaterial'
     ], function(
         HorizontalStripeMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a horizontal stripe", function() {
        var pixel = renderMaterial(new HorizontalStripeMaterial({
            lightColor : {
                red : 1.0,
                green : 0.0,
                blue : 0.0,
                alpha : 1.0
            },
            darkColor : {
                red : 0.0,
                green : 1.0,
                blue : 0.0,
                alpha : 1.0
            },
            offset : 0.0,
            repeat : 2.0
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
