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
        expect(CzmlString.createValue(simpleString)).toEqual(simpleString);
        expect(CzmlString.createValue(constantStringInterval.string)).toEqual(constantStringInterval.string);
    });
});
