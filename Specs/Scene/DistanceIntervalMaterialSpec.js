/*global defineSuite*/
defineSuite([
        'Scene/DistanceIntervalMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        DistanceIntervalMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,expect*/

    it("draws a distance interval material", function() {
        var context = createContext();
        var pixel = renderMaterial(new DistanceIntervalMaterial({
            intervals : [
            {
                distance : 1000000.0,
                color : {
                    red   : 1.0,
                    green : 0.0,
                    blue  : 0.0,
                    alpha : 0.5
                }
            },
            {
                distance : 10000000.0,
                color : {
                    red   : 0.0,
                    green : 1.0,
                    blue  : 0.0,
                    alpha : 0.5
                }
            },
            {
                distance : 20000000.0,
                color : {
                    red   : 0.0,
                    green : 0.0,
                    blue  : 1.0,
                    alpha : 0.5
                }
            }]
        }), context);
        expect(pixel).not.toEqualArray([0, 0, 0, 0]);
        destroyContext(context);
    });
});