/*global defineSuite*/
defineSuite([
        'Scene/Materials/VerticalStripeMaterial',
        '../Specs/renderMaterial'
    ], function(
        VerticalStripeMaterial,
        renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a vertical stripe material", function() {
        var pixel = renderMaterial(new VerticalStripeMaterial({
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
