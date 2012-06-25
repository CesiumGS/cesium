/*global defineSuite*/
defineSuite([
        'Scene/Materials/FacetMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        FacetMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a facet material", function() {
        var context = createContext();
        var pixel = renderMaterial(new FacetMaterial({
            lightColor: {
                red: 0.25,
                green: 0.25,
                blue: 0.25,
                alpha: 0.75
            },
            darkColor: {
                red: 0.75,
                green: 0.75,
                blue: 0.75,
                alpha: 0.75
            },
            repeat : 10.0
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});
