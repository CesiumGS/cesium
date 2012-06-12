/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlString'
            ], function(
              CzmlString) {
    "use strict";
    /*global it,expect*/

    var simpleString = "some Value";

    var constantStringInterval = {
        string : "some other value"
    };

    it('unwrapInterval', function() {
        expect(CzmlString.unwrapInterval(simpleString)).toEqual(simpleString);
        expect(CzmlString.unwrapInterval(constantStringInterval)).toEqual(constantStringInterval.string);
    });

    it('isSampled', function() {
        expect(CzmlString.isSampled()).toEqual(false);
    });

    it('createValue', function() {
        expect(CzmlString.createValue(CzmlString.unwrapInterval(simpleString))).toEqual(simpleString);
        expect(CzmlString.createValue(CzmlString.unwrapInterval(constantStringInterval))).toEqual(constantStringInterval.string);
    });
});
