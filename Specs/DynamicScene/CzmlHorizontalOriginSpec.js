/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlHorizontalOrigin',
             'Scene/HorizontalOrigin'
            ], function(
              CzmlHorizontalOrigin,
              HorizontalOrigin) {
    "use strict";
    /*global it,expect*/

    var simpleHorizontalOrigin = "CENTER";

    var constantHorizontalOriginInterval = {
        horizontalOrigin : "LEFT"
    };

    it('unwrapInterval', function() {
        expect(CzmlHorizontalOrigin.unwrapInterval(simpleHorizontalOrigin)).toEqual(simpleHorizontalOrigin);
        expect(CzmlHorizontalOrigin.unwrapInterval(constantHorizontalOriginInterval)).toEqual(constantHorizontalOriginInterval.horizontalOrigin);
    });

    it('isSampled', function() {
        expect(CzmlHorizontalOrigin.isSampled()).toEqual(false);
    });

    it('createValue', function() {
        expect(CzmlHorizontalOrigin.createValue(simpleHorizontalOrigin)).toEqual(HorizontalOrigin.CENTER);
        expect(CzmlHorizontalOrigin.createValue(constantHorizontalOriginInterval.horizontalOrigin)).toEqual(HorizontalOrigin.LEFT);
    });
});
