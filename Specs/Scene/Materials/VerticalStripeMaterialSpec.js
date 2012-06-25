/*global defineSuite*/
defineSuite([
        'Scene/Materials/VerticalStripeMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        VerticalStripeMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a vertical stripe material", function() {
        var context = createContext();
        var pixel = renderMaterial(new VerticalStripeMaterial({
            repeat : 5.0
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
