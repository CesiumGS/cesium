/*global defineSuite*/
defineSuite([
        'Scene/Materials/WoodMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        WoodMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a wood material", function() {
        var context = createContext();
        var pixel = renderMaterial(new WoodMaterial({
            lightWoodColor : {
                red : 0.6,
                green : 0.3,
                blue : 0.1,
                alpha : 1.0
            },
            darkWoodColor : {
                red : 0.4,
                green : 0.2,
                blue : 0.07,
                alpha : 1.0
            },
            ringFrequency : 3.0,
            noiseScale : {
                x : 0.7,
                y : 0.5
            },
            grainFrequency : 27.0
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
