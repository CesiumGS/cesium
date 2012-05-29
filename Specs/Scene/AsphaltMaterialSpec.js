/*global defineSuite*/
defineSuite([
         'Scene/AsphaltMaterial',
         '../Specs/renderMaterial'
     ], function(
         AsphaltMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a procedural asphalt material", function() {
        var pixel = renderMaterial(new AsphaltMaterial({
            asphaltColor : {
                red : 0.15,
                green : 0.15,
                blue : 0.15,
                alpha : 1.0
            },
            bumpSize : 0.02,
            roughness : 0.2
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
