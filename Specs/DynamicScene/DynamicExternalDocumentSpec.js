/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicExternalDocument',
         'DynamicScene/DynamicObject',
         'Core/Iso8601',
         'Core/TimeInterval'
     ], function(
             DynamicExternalDocument,
             DynamicObject,
             Iso8601,
             TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('processCzmlPacket adds polling data for infinite document.', function() {
        var documentPacket = {
            external : {
                url : 'http://localhost/test',
                sourceType:"json",
                pollingUpdate:{
                    refreshInterval : '30'
                }
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicExternalDocument.processCzmlPacket(dynamicObject, documentPacket)).toEqual(true);
        expect(dynamicObject.external).toBeDefined();
        expect(dynamicObject.external.url.getValue(Iso8601.MINIMUM_VALUE)).toEqual(documentPacket.external.url);
        expect(dynamicObject.external.pollingUpdate.refreshInterval.getValue(Iso8601.MINIMUM_VALUE)).toEqual(documentPacket.external.pollingUpdate.refreshInterval);
    });

    it('processCzmlPacket adds eventsource data for infinite document.', function() {
        var documentPacket = {
            external : {
                url : 'http://localhost/test',
                eventname : 'access',
                sourceType: 'eventstream'
            }
        };

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicExternalDocument.processCzmlPacket(dynamicObject, documentPacket)).toEqual(true);
        expect(dynamicObject.external).toBeDefined();
        expect(dynamicObject.external.url.getValue(Iso8601.MINIMUM_VALUE)).toEqual(documentPacket.external.url);
        expect(dynamicObject.external.eventname.getValue(Iso8601.MINIMUM_VALUE)).toEqual(documentPacket.external.eventname);
    });

    it('processCzmlPacket adds data for constrained polling document.', function() {
        var documentPacket = {
                external : {
                    interval : '2000-01-01/2001-01-01',
                    url : 'http://localhost/test',
                    pollingUpdate:{
                        refreshInterval : '30'
                    }
                }
        };

        var validTime = TimeInterval.fromIso8601(documentPacket.external.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicExternalDocument.processCzmlPacket(dynamicObject, documentPacket)).toEqual(true);
        expect(dynamicObject.external).toBeDefined();
        expect(dynamicObject.external.url.getValue(validTime)).toEqual(documentPacket.external.url);
        expect(dynamicObject.external.pollingUpdate.refreshInterval.getValue(validTime)).toEqual(documentPacket.external.pollingUpdate.refreshInterval);

        expect(dynamicObject.external.url.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.external.pollingUpdate.refreshInterval.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket adds data for constrained eventsource document.', function() {
        var documentPacket = {
                external : {
                    interval : '2000-01-01/2001-01-01',
                    url : 'http://localhost/test',
                    eventname : '30',
                    sourceType: 'eventstream'
                }
        };

        var validTime = TimeInterval.fromIso8601(documentPacket.external.interval).start;
        var invalidTime = validTime.addSeconds(-1);

        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicExternalDocument.processCzmlPacket(dynamicObject, documentPacket)).toEqual(true);
        expect(dynamicObject.external).toBeDefined();
        expect(dynamicObject.external.url.getValue(validTime)).toEqual(documentPacket.external.url);
        expect(dynamicObject.external.eventname.getValue(validTime)).toEqual(documentPacket.external.eventname);

        expect(dynamicObject.external.url.getValue(invalidTime)).toBeUndefined();
        expect(dynamicObject.external.eventname.getValue(invalidTime)).toBeUndefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('dynamicObject');
        expect(DynamicExternalDocument.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.external).toBeUndefined();
    });

    it('mergeProperties does not change a fully configured external document', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.external = new DynamicExternalDocument();
        objectToMerge.polling = 'localhost';
        objectToMerge.refreshInterval = 1;

        var targetObject = new DynamicObject('targetObject');
        targetObject.external = new DynamicExternalDocument();
        targetObject.polling = 'remotehost';
        targetObject.refreshInterval = 2;

        DynamicExternalDocument.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.external.polling).toEqual(targetObject.external.polling);
        expect(targetObject.external.refreshInterval).toEqual(targetObject.external.refreshInterval);
    });

    it('mergeProperties creates and configures an undefined external document', function() {
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.external = new DynamicExternalDocument();
        objectToMerge.eventsource = 'localhost';
        objectToMerge.eventname = 'access';

        var targetObject = new DynamicObject('targetObject');

        DynamicExternalDocument.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.external.eventsource).toEqual(objectToMerge.external.eventsource);
        expect(targetObject.external.eventname).toEqual(objectToMerge.external.eventname);
    });

    it('mergeProperties does not change when used with an undefined external document', function() {
        var objectToMerge = new DynamicObject('objectToMerge');

        var targetObject = new DynamicObject('targetObject');
        targetObject.external = new DynamicExternalDocument();
        targetObject.eventsource = 'localhost';
        targetObject.eventname = 'access';

        DynamicExternalDocument.mergeProperties(targetObject, objectToMerge);

        expect(targetObject.external.eventsource).toEqual(targetObject.external.eventsource);
        expect(targetObject.external.eventname).toEqual(targetObject.external.eventname);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.external = new DynamicExternalDocument();
        DynamicExternalDocument.undefineProperties(testObject);
        expect(testObject.external).toBeUndefined();
    });


});