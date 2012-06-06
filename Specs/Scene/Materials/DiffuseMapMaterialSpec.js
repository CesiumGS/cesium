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
    /*global xit,expect*/

    xit("draws a diffuse map material", function() {
        var image = new Image();
        image.onload = function() {
            var context = createContext();
            var pixel = renderMaterial(new DiffuseMapMaterial({
                texture : context.createTexture2D({
                    source : image,
                    pixelFormat : PixelFormat.RGBA
                })
            }), context);
            expect(pixel).not.toEqualArray([1, 1, 1, 1]);
            destroyContext(context);
        };
        image.src = "../../../Images/Cesium_Logo_Color.jpg";
    });
});
