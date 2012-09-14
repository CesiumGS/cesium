/*global defineSuite*/
defineSuite([
         'DynamicScene/SystemClockUpdater',
         'DynamicScene/CzmlProcessor',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         '../Specs/createScene',
         '../Specs/destroyScene',
         '../Specs/MockProperty'
     ], function(
             SystemClockUpdater,
             CzmlProcessor,
             DynamicObjectCollection,
             DynamicExternalDocument,
             JulianDate,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('SystemClockUpdater throws with empty arguments.', function() {
        expect(function() {
            return new SystemClockUpdater();
        }).toThrow();
    });

    it('SystemClockUpdater throws with out baseUrl', function() {
        expect(function() {
            return new SystemClockUpdater({});
        }).toThrow();
    });

    it('update calls document manager process function.', function() {
        var scene = createScene();
        var eventSource = {
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');
        testObject.external.refreshInterval = new MockProperty(0.0001);
        var dm = new CzmlProcessor(scene);
        var scdbu = new SystemClockUpdater(dm, testObject.external.polling, testObject.external.refreshInterval);
        var date = new Date();
        var curDate = null;

        do { curDate = new Date(); }
        while(curDate-date < 20);
        spyOn(dm, 'process');
        scdbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onmessage({data:"{\"test\":\"value\"}"});
        expect(dm.process).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('eventsource closing causes handle to be undefined.', function() {
        var scene = createScene();
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                    this.onerror();
                },
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');
        testObject.external.refreshInterval = new MockProperty(0.0001);
        var dm = new CzmlProcessor(scene);
        var scdbu = new SystemClockUpdater(dm, testObject.external.polling, testObject.external.refreshInterval);
        var date = new Date();
        var curDate = null;

        do { curDate = new Date(); }
        while(curDate-date < 20);

        scdbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.test();
        expect(scdbu._handle).toBeUndefined();
        destroyScene(scene);
    });

    it('abort closes handle.', function() {
        var scene = createScene();
        var eventSource = {
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');
        testObject.external.refreshInterval = new MockProperty(0.0001);
        var dm = new CzmlProcessor(scene);
        var scdbu = new SystemClockUpdater(dm, testObject.external.polling, testObject.external.refreshInterval);
        var date = new Date();
        var curDate = null;

        do { curDate = new Date(); }
        while(curDate-date < 20);

        scdbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onmessage({data:"{\"test\":\"value\"}"});
        scdbu.abort();
        expect(scdbu._handle).toBeUndefined();
        destroyScene(scene);
    });
});