/*global defineSuite*/
defineSuite([
        'Scene/Materials/BrickMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        BrickMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a brick material", function() {
        var context = createContext();
        var pixel = renderMaterial(new BrickMaterial({
            brickColor : {
                red: 0.6,
                green: 0.3,
                blue: 0.1,
                alpha: 1.0
            },
            mortarColor : {
                red : 0.8,
                green : 0.8,
                blue : 0.7,
                alpha : 1.0
            },
            brickSize : {
                x : 0.30,
                y : 0.15
            },
            brickPct : {
                x : 0.90,
                y : 0.85
            },
            brickRoughness : 0.2,
            mortarRoughness : 0.1
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
