/*global defineSuite*/
defineSuite([
        'Scene/Materials/GrassMaterial',
        '../Specs/renderMaterial'
    ], function(
        GrassMaterial,
        renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a procedural grass material", function() {
        var pixel = renderMaterial(new GrassMaterial({
            grassColor : {
                red : 0.25,
                green : 0.4,
                blue : 0.1,
                alpha : 1.0
            },
            dirtColor : {
                red : 0.1,
                green : 0.1,
                blue : 0.1,
                alpha : 1.0
            },
            patchiness : 1.5
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
