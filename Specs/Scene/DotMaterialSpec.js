/*global defineSuite*/
defineSuite([
         'Scene/DotMaterial',
         '../Specs/renderMaterial'
     ], function(
         DotMaterial,
         renderMaterial) {
    "use strict";
    /*global it,expect*/

    it("draws a dot pattern material", function() {
        var pixel = renderMaterial(new DotMaterial({
            lightColor: {
                red: 1.0,
                green: 1.0,
                blue: 0.0,
                alpha: 0.75
            },
            darkColor: {
                red: 0.0,
                green: 1.0,
                blue: 1.0,
                alpha: 0.75
            },
            sRepeat : 5,
            tRepeat : 5
        }));
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
    });
});
