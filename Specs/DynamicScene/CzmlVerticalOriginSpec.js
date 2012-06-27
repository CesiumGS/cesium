/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlVerticalOrigin',
             'Scene/VerticalOrigin'
            ], function(
              CzmlVerticalOrigin,
              VerticalOrigin) {
    "use strict";
    /*global it,expect*/

    var simpleVerticalOrigin = 'CENTER';

    var constantVerticalOriginInterval = {
        verticalOrigin : 'LEFT'
    };

    it('unwrapInterval', function() {
        expect(CzmlVerticalOrigin.unwrapInterval(simpleVerticalOrigin)).toEqual(simpleVerticalOrigin);
        expect(CzmlVerticalOrigin.unwrapInterval(constantVerticalOriginInterval)).toEqual(constantVerticalOriginInterval.verticalOrigin);
    });

    it('isSampled', function() {
        expect(CzmlVerticalOrigin.isSampled()).toEqual(false);
    });

    it('getValue', function() {
        expect(CzmlVerticalOrigin.getValue(simpleVerticalOrigin)).toEqual(VerticalOrigin.CENTER);
        expect(CzmlVerticalOrigin.getValue(constantVerticalOriginInterval.verticalOrigin)).toEqual(VerticalOrigin.LEFT);
    });
});
