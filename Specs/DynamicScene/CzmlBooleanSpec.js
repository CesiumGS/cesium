/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlBoolean'
            ], function(
              CzmlBoolean) {
    "use strict";
    /*global it,expect*/

    var simpleBoolean = true;

    var constantBooleanInterval = {
        boolean : false
    };

    it('unwrapInterval', function() {
        expect(CzmlBoolean.unwrapInterval(simpleBoolean)).toEqual(simpleBoolean);
        expect(CzmlBoolean.unwrapInterval(constantBooleanInterval)).toEqual(constantBooleanInterval.boolean);
    });

    it('isSampled', function() {
        expect(CzmlBoolean.isSampled()).toEqual(false);
    });

    it('createValue', function() {
        expect(CzmlBoolean.createValue(CzmlBoolean.unwrapInterval(simpleBoolean))).toEqual(true);
        expect(CzmlBoolean.createValue(CzmlBoolean.unwrapInterval(constantBooleanInterval))).toEqual(false);
    });
});
