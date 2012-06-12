/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlVerticalOrigin',
             'Scene/VerticalOrigin'
            ], function(
              CzmlVerticalOrigin,
              VerticalOrigin) {
    "use strict";
    /*global it,expect*/

    var simpleVerticalOrigin = VerticalOrigin.CENTER;

    var constantVerticalOriginInterval = {
        verticalOrigin : VerticalOrigin.TOP
    };

    it('unwrapInterval', function() {
        expect(CzmlVerticalOrigin.unwrapInterval(simpleVerticalOrigin)).toEqual(simpleVerticalOrigin);
        expect(CzmlVerticalOrigin.unwrapInterval(constantVerticalOriginInterval)).toEqual(constantVerticalOriginInterval.verticalOrigin);
    });

    it('isSampled', function() {
        expect(CzmlVerticalOrigin.isSampled()).toEqual(false);
    });

    it('createValue', function() {
        expect(CzmlVerticalOrigin.createValue(CzmlVerticalOrigin.unwrapInterval(simpleVerticalOrigin))).toEqual(VerticalOrigin.CENTER);
        expect(CzmlVerticalOrigin.createValue(CzmlVerticalOrigin.unwrapInterval(constantVerticalOriginInterval))).toEqual(VerticalOrigin.TOP);
    });
});
