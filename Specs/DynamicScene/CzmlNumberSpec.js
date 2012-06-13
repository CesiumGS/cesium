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

    it('packValuesForInterpolation', function() {
        var sourceArray = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
        var destinationArray = [];
        var firstIndex = 3;
        var lastIndex = 5;
        CzmlNumber.packValuesForInterpolation(sourceArray, destinationArray, firstIndex, lastIndex);
        expect(destinationArray).toEqualArray([0.4, 0.5, 0.6]);
    });
});
