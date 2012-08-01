/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlString'
            ], function(
              CzmlString) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var simpleString = 'some Value';

    var constantStringInterval = {
        string : 'some other value'
    };

    it('unwrapInterval', function() {
        expect(CzmlString.unwrapInterval(simpleString)).toEqual(simpleString);
        expect(CzmlString.unwrapInterval(constantStringInterval)).toEqual(constantStringInterval.string);
    });

    it('isSampled', function() {
        expect(CzmlString.isSampled()).toEqual(false);
    });

    it('getValue', function() {
        expect(CzmlString.getValue(simpleString)).toEqual(simpleString);
        expect(CzmlString.getValue(constantStringInterval.string)).toEqual(constantStringInterval.string);
    });
});
