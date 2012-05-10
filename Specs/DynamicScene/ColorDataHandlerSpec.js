/*global defineSuite*/
defineSuite(['DynamicScene/ColorDataHandler'], function(ColorDataHandler) {
    "use strict";
    /*global it,expect*/

    it("isSampled works.", function() {
        var constantRgba = [0, 0, 0, 0];
        expect(ColorDataHandler.isSampled(constantRgba)).toEqual(false);

        var sampledRgba = [0, 0, 0, 0, 1, 255, 255, 255];
        expect(ColorDataHandler.isSampled(sampledRgba)).toEqual(true);
    });
});
