/*global defineSuite*/
defineSuite([
        'Scene/Materials/CementMaterial',
        '../Specs/renderMaterial'
    ], function(
        CementMaterial,
        renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a procedural cement material", function() {
        var pixel = renderMaterial(new CementMaterial({
            cementColor : {
                red : 0.95,
                green : 0.95,
                blue : 0.85,
                alpha : 1.0
            },
            grainScale : 0.01,
            roughness : 0.3
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
