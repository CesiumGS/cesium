/*global defineSuite*/
defineSuite([
         'DynamicScene/EventSourceBufferUpdater',
         'DynamicScene/DocumentManager',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         '../Specs/createScene',
         '../Specs/destroyScene',
         '../Specs/MockProperty'
     ], function(
             EventSourceBufferUpdater,
             DocumentManager,
             DynamicObjectCollection,
             DynamicExternalDocument,
             JulianDate,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('EventSourceBufferUpdater throws with empty arguments.', function() {
        expect(function() {
            return new EventSourceBufferUpdater();
        }).toThrow();
    });

    it('EventSourceBufferUpdater throws with out baseUrl and eventName.', function() {
        expect(function() {
            return new EventSourceBufferUpdater({});
        }).toThrow();
    });

    it('EventSourceBufferUpdater throws with out eventName.', function() {
        expect(function() {
            return new EventSourceBufferUpdater({}, "localhost");
        }).toThrow();
    });

    it('update calls addEventListener.', function() {
        var scene = createScene();
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value}"});
                },
                close:function(){
                },
                addEventListener:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        testObject.external.eventname = new MockProperty('access');
        var esbu = new EventSourceBufferUpdater(new DocumentManager(scene), testObject.external.eventsource, testObject.external.eventname);
        spyOn(eventSource, 'addEventListener');

        esbu.update(new JulianDate(), dynamicObjectCollection);
        expect(eventSource.addEventListener).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('update calls documentManager process.', function() {
        var scene = createScene();
        var eventSource = {
                addEventListener:function(e, callbackFunction){
                    callbackFunction({data:"{\"test\":\"value\"}"});
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        testObject.external.eventname = new MockProperty('access');
        var dm = new DocumentManager(scene);
        var esbu = new EventSourceBufferUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
        spyOn(dm, 'process');

        esbu.update(new JulianDate(), dynamicObjectCollection);
        expect(dm.process).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('abort closes eventSource.', function() {
        var scene = createScene();
        var eventSource = {
                addEventListener:function(e, callbackFunction){
                    callbackFunction({data:"{\"test\":\"value\"}"});
                },
                close:function(){}
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        testObject.external.eventname = new MockProperty('access');
        var dm = new DocumentManager(scene);
        var esbu = new EventSourceBufferUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
        spyOn(eventSource, 'close');

        esbu.update(new JulianDate(), dynamicObjectCollection);
        esbu.abort();
        expect(eventSource.close).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('abort does not close undefined eventSource.', function() {
        var scene = createScene();
        var eventSource = {
                addEventListener:function(e, callbackFunction){
                    callbackFunction({data:"{\"test\":\"value\"}"});
                },
                close:function(){}
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        testObject.external.eventname = new MockProperty('access');
        var dm = new DocumentManager(scene);
        var esbu = new EventSourceBufferUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
        spyOn(eventSource, 'close');

        esbu.abort();
        expect(eventSource.close).wasNotCalled();

        destroyScene(scene);
    });




});