/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlBoolean'
            ], function(
              CzmlBoolean) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

    it('getValue', function() {
        expect(CzmlBoolean.getValue(simpleBoolean)).toEqual(simpleBoolean);
        expect(CzmlBoolean.getValue(constantBooleanInterval.boolean)).toEqual(constantBooleanInterval.boolean);
    });
});
