/*global defineSuite*/
defineSuite([
             'DynamicScene/SampledProperty',
             'Core/JulianDate'
     ], function(
             SampledProperty,
             JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('addSamplesFlatArray works', function() {
        var data = [0, 7, 1, 8, 2, 9];
        var epoch = new JulianDate(0, 0);

        var property = new SampledProperty();
        property.addSamplesFlatArray(data, epoch);
        expect(property.getIsTimeVarying()).toEqual(true);
        expect(property.getValue(epoch)).toEqual(7);
        expect(property.getValue(new JulianDate(0, 0.5))).toEqual(7.5);
    });

    it('addSample works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty();
        property.addSample(times[0], values[0]);
        property.addSample(times[1], values[1]);
        property.addSample(times[2], values[2]);

        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });

    it('addSamples works', function() {
        var values = [7, 8, 9];
        var times = [new JulianDate(0, 0), new JulianDate(1, 0), new JulianDate(2, 0)];

        var property = new SampledProperty();
        property.addSamples(times, values);
        expect(property.getValue(times[0])).toEqual(values[0]);
        expect(property.getValue(times[1])).toEqual(values[1]);
        expect(property.getValue(times[2])).toEqual(values[2]);
        expect(property.getValue(new JulianDate(0.5, 0))).toEqual(7.5);
    });
});