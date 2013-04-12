/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPollingUpdate',
             'DynamicScene/DynamicObject',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicPollingUpdate,
              DynamicObject,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds data for infinite pollingUpdate.', function() {
        var pollingUpdatePacket = {
            refreshInterval : 30
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicPollingUpdate = new DynamicPollingUpdate();
        expect(dynamicPollingUpdate.processCzmlPacket(dynamicObject, pollingUpdatePacket)).toEqual(true);

        expect(dynamicObject.refreshInterval).toBeDefined();
        expect(dynamicObject.refreshInterval.getValue(Iso8601.MINIMUM_VALUE)).toEqual(30);
        expect(dynamicObject.refreshInterval.getValue(Iso8601.MAXIMUM_VALUE)).toEqual(30);
    });

    it('processCzmlPacket adds data for constrained pollingUpdate.', function() {
        var pollingUpdatePacket = {
            refreshInterval : 30
        };

        var timeInterval = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        var validTime = timeInterval.start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicPollingUpdate = new DynamicPollingUpdate();
        expect(dynamicPollingUpdate.processCzmlPacket(dynamicObject, pollingUpdatePacket, timeInterval)).toEqual(true);

        expect(dynamicObject.refreshInterval).toBeDefined();
        expect(dynamicObject.refreshInterval.getValue(validTime)).toEqual(30);
        expect(dynamicObject.refreshInterval.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        var dynamicPollingUpdate = new DynamicPollingUpdate();
        expect(dynamicPollingUpdate.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.refreshInterval).toBeUndefined();
    });
});