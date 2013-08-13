/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlNumber'
            ], function(
              CzmlNumber) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var simpleNumber = 0.5;

    var sampledNumberInterval = {
        number : [1, 2, 3, 4]
    };

    it('unwrapInterval', function() {
        expect(CzmlNumber.unwrapInterval(simpleNumber)).toEqual(simpleNumber);
        expect(CzmlNumber.unwrapInterval(sampledNumberInterval)).toEqual(sampledNumberInterval.number);
    });

    it('isSampled', function() {
        expect(CzmlNumber.isSampled(simpleNumber)).toEqual(false);
        expect(CzmlNumber.isSampled(sampledNumberInterval.number)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlNumber.getValue(simpleNumber)).toEqual(simpleNumber);
    });
});
