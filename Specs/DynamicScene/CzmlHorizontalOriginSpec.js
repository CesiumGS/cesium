/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlHorizontalOrigin',
             'Scene/HorizontalOrigin'
            ], function(
              CzmlHorizontalOrigin,
              HorizontalOrigin) {
    "use strict";
    /*global it,expect*/

    var simpleHorizontalOrigin = HorizontalOrigin.CENTER;

    var constantHorizontalOriginInterval = {
        horizontalOrigin : HorizontalOrigin.LEFT
    };

    it('unwrapInterval', function() {
        expect(CzmlHorizontalOrigin.unwrapInterval(simpleHorizontalOrigin)).toEqual(simpleHorizontalOrigin);
        expect(CzmlHorizontalOrigin.unwrapInterval(constantHorizontalOriginInterval)).toEqual(constantHorizontalOriginInterval.horizontalOrigin);
    });

    it('isSampled', function() {
        expect(CzmlHorizontalOrigin.isSampled()).toEqual(false);
    });

    it('createValue', function() {
        expect(CzmlHorizontalOrigin.createValue(CzmlHorizontalOrigin.unwrapInterval(simpleHorizontalOrigin))).toEqual(HorizontalOrigin.CENTER);
        expect(CzmlHorizontalOrigin.createValue(CzmlHorizontalOrigin.unwrapInterval(constantHorizontalOriginInterval))).toEqual(HorizontalOrigin.LEFT);
    });
});
