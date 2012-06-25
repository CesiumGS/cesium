/*global defineSuite*/
defineSuite([
        'Scene/Materials/BlobMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        BlobMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a blob material", function() {
        var context = createContext();
        var pixel = renderMaterial(new BlobMaterial({
            repeat : 10.0
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
