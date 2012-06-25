/*global defineSuite*/
defineSuite([
        'Scene/Materials/TieDyeMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        TieDyeMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a tie-dye material", function() {
        var context = createContext();
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
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
