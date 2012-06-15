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

    it('getValue', function() {
        expect(CzmlHorizontalOrigin.getValue(simpleHorizontalOrigin)).toEqual(HorizontalOrigin.CENTER);
        expect(CzmlHorizontalOrigin.getValue(constantHorizontalOriginInterval.horizontalOrigin)).toEqual(HorizontalOrigin.LEFT);
    });
});
