/*global defineSuite*/
defineSuite([
             'DynamicScene/SampledProperty',
             'DynamicScene/CzmlNumber',
             'Core/JulianDate'
     ], function(
             SampledProperty,
             CzmlNumber,
             JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('works with non-clonable objects', function() {
        var data = [0, 7, 1, 8, 2, 9];
        var epoch = new JulianDate();

        var property = new SampledProperty(CzmlNumber);
        property.addSamplesFlatArray(data, epoch);
        expect(property.getIsTimeVarying()).toEqual(true);
        expect(property.getValue(epoch)).toEqual(7);
    });
});