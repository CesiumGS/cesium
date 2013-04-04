/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicSimulationDrivenUpdate',
             'DynamicScene/DynamicObject',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicSimulationDrivenUpdate,
              DynamicObject,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite simulationDrivenUpdate.', function() {
        var simulationDrivenPacket = {
            duration : 400,
            stepsize: 50
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicSimulationDrivenUpdate = new DynamicSimulationDrivenUpdate();
        expect(dynamicSimulationDrivenUpdate.processCzmlPacket(dynamicObject, simulationDrivenPacket)).toEqual(true);

        expect(dynamicObject.duration).toBeDefined();
        expect(dynamicObject.duration.getValue(Iso8601.MINIMUM_VALUE)).toEqual(400);
        expect(dynamicObject.duration.getValue(Iso8601.MAXIMUM_VALUE)).toEqual(400);
        expect(dynamicObject.stepsize.getValue(Iso8601.MINIMUM_VALUE)).toEqual(50);
        expect(dynamicObject.stepsize.getValue(Iso8601.MAXIMUM_VALUE)).toEqual(50);
    });

    it('processCzmlPacket adds data for constrained simulationDrivenUpdate.', function() {
        var simulationDrivenPacket = {
            duration : 4500,
            stepsize: 501
        };

        var timeInterval = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        var validTime = timeInterval.start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicSimulationDrivenUpdate = new DynamicSimulationDrivenUpdate();
        expect(dynamicSimulationDrivenUpdate.processCzmlPacket(dynamicObject, simulationDrivenPacket, timeInterval)).toEqual(true);

        expect(dynamicObject.duration).toBeDefined();
        expect(dynamicObject.duration.getValue(validTime)).toEqual(4500);
        expect(dynamicObject.stepsize.getValue(validTime)).toEqual(501);
        expect(dynamicObject.duration.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.stepsize.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicSimulationDrivenUpdate = new DynamicSimulationDrivenUpdate();
        expect(dynamicSimulationDrivenUpdate.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.duration).toBeUndefined();
    });
});