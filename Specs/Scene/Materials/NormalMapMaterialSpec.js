/*global defineSuite*/
defineSuite([
        'Scene/Materials/NormalMapMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        NormalMapMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,waitsFor,expect*/

    var whiteImage;

    it("initialize suite", function() {
        whiteImage = new Image();
        whiteImage.src = "./Data/Images/White.png";

        waitsFor(function() {
            return whiteImage.complete;
        }, "Load .png file(s) for texture test.", 3000);
    });

    it("draws a normal map material", function() {
        var context = createContext();
        var pixel = renderMaterial(new NormalMapMaterial({
            texture : context.createTexture2D({
                source : whiteImage,
                pixelFormat : PixelFormat.LUMINANCE
            })
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
