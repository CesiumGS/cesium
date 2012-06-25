/*global defineSuite*/
defineSuite([
        'Scene/Materials/HorizontalStripeMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        HorizontalStripeMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a horizontal stripe material", function() {
        var context = createContext();
        var pixel = renderMaterial(new HorizontalStripeMaterial({
            repeat : 5.0
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
