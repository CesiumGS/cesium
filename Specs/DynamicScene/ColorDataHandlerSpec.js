/*global defineSuite*/
defineSuite(['DynamicScene/CzmlColor'], function(CzmlColor) {
    "use strict";
    /*global it,expect*/

    it('isSampled works.', function() {
        var constantRgba = [0, 0, 0, 0];
        expect(CzmlColor.isSampled(constantRgba)).toEqual(false);

        var sampledRgba = [0, 0, 0, 0, 1, 255, 255, 255];
        expect(CzmlColor.isSampled(sampledRgba)).toEqual(true);
    });
});
