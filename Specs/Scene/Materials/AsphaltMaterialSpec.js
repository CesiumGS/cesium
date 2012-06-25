/*global defineSuite*/
defineSuite([
        'Scene/Materials/AsphaltMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        AsphaltMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws an asphalt material", function() {
        var context = createContext();
        var pixel = renderMaterial(new AsphaltMaterial({
            asphaltColor : {
                red : 0.15,
                green : 0.15,
                blue : 0.15,
                alpha : 1.0
            },
            bumpSize : 0.02,
            roughness : 0.2
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
