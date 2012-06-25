/*global defineSuite*/
defineSuite([
        'Scene/Materials/ColorMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        ColorMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a color material", function() {
        var context = createContext();
        var pixel = renderMaterial(new ColorMaterial({
            color: {
                red: 1.0,
                green: 1.0,
                blue: 0.0,
                alpha: 0.75
            }
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
