/*global defineSuite*/
defineSuite([
             'Core/TimeStandard'
            ], function(
              TimeStandard) {
    "use strict";
    /*global it,expect*/

    it('isKnownStandard works', function() {
        expect(TimeStandard.isKnownStandard(TimeStandard.UTC)).toEqual(true);
        expect(TimeStandard.isKnownStandard(TimeStandard.TAI)).toEqual(true);
        expect(TimeStandard.isKnownStandard(4)).toEqual(false);
        expect(TimeStandard.isKnownStandard("as")).toEqual(false);
        expect(TimeStandard.isKnownStandard(null)).toEqual(false);
        expect(TimeStandard.isKnownStandard(undefined)).toEqual(false);
    });
});
