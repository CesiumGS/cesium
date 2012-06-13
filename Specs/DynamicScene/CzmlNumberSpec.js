/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlNumber'
            ], function(
              CzmlNumber) {
    "use strict";
    /*global it,expect*/

    var simpleNumber = 0.5;

    var sampledNumberInterval = {
        number : [1, 2, 3, 4]
    };

    it('unwrapInterval', function() {
        expect(CzmlNumber.unwrapInterval(simpleNumber)).toEqualArray(simpleNumber);
        expect(CzmlNumber.unwrapInterval(sampledNumberInterval)).toEqualArray(sampledNumberInterval.number);
    });

    it('isSampled', function() {
        expect(CzmlNumber.isSampled(simpleNumber)).toEqual(false);
        expect(CzmlNumber.isSampled(sampledNumberInterval.number)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlNumber.createValue(simpleNumber)).toEqual(simpleNumber);
    });

    it('createValueFromArray', function() {
        expect(CzmlNumber.createValueFromArray(sampledNumberInterval.number, 2)).toEqual(sampledNumberInterval.number[2]);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlNumber.createValueFromInterpolationResult([simpleNumber])).toEqual(simpleNumber);
    });
});
