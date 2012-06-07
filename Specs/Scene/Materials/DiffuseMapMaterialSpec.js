/*global defineSuite*/
defineSuite([
        'Scene/Materials/DiffuseMapMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        DiffuseMapMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,waitsFor,expect*/

    var greenImage;

    it("initializem suite", function() {
        greenImage = new Image();
        greenImage.src = "./Data/Images/Green.png";

        waitsFor(function() {
            return greenImage.complete;
        }, "Load .png file(s) for texture test.", 3000);
    });

    it("draws a diffuse map material", function() {
        var context = createContext();
        var pixel = renderMaterial(new DiffuseMapMaterial({
            texture : context.createTexture2D({
                source : greenImage,
                pixelFormat : PixelFormat.RGBA
            })
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
