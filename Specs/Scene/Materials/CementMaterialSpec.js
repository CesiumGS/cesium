/*global defineSuite*/
defineSuite([
        'Scene/Materials/CementMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        CementMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a cement material", function() {
        var context = createContext();
        var pixel = renderMaterial(new CementMaterial({
            cementColor : {
                red : 0.95,
                green : 0.95,
                blue : 0.85,
                alpha : 1.0
            },
            grainScale : 0.01,
            roughness : 0.3
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
