/*global defineSuite*/
defineSuite([
         'Scene/FacetMaterial',
         '../Specs/renderMaterial'
     ], function(
         FacetMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a facet material using cellular noise", function() {
        var pixel = renderMaterial(new FacetMaterial({
            lightColor: {
                red: 0.25,
                green: 0.25,
                blue: 0.25,
                alpha: 0.75
            },
            darkColor: {
                red: 0.75,
                green: 0.75,
                blue: 0.75,
                alpha: 0.75
            },
            repeat : 10.0
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
