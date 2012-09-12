/*global defineSuite*/
defineSuite([
         'DynamicScene/EventSourceUpdater',
         'DynamicScene/CzmlProcessor',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         '../Specs/createScene',
         '../Specs/destroyScene',
         '../Specs/MockProperty'
     ], function(
             EventSourceUpdater,
             CzmlProcessor,
             DynamicObjectCollection,
             DynamicExternalDocument,
             JulianDate,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('EventSourceUpdater throws with empty arguments.', function() {
        expect(function() {
            return new EventSourceUpdater();
        }).toThrow();
    });

    it('EventSourceUpdater throws with out baseUrl and eventName.', function() {
        expect(function() {
            return new EventSourceUpdater({});
        }).toThrow();
    });

    it('update calls addEventListener.', function() {
        var scene = createScene();
        var eventSource = {
                addEventListener:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        testObject.external.eventname = new MockProperty('access');
        var esbu = new EventSourceUpdater(new CzmlProcessor(scene), testObject.external.eventsource, testObject.external.eventname);
        spyOn(eventSource, 'addEventListener');

        esbu.update(new JulianDate(), dynamicObjectCollection);
        expect(eventSource.addEventListener).toHaveBeenCalled();

        destroyScene(scene);
    });

    it('update with no eventName calls incrementalGet.', function(){
        var scene = createScene();
        var eventSource = {
                close:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('localhost');
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, testObject.external.eventsource);
        spyOn(dm, 'process');
        spyOn(eventSource, 'close');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onmessage({data:"{\"test\":\"value\"}"});
        expect(dm.process).toHaveBeenCalled();
        esbu.abort();
        expect(eventSource.close).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('update with different eventName calls removeEventListener.', function(){
        var scene = createScene();
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value}"});
                },
                close:function(){
                },
                addEventListener:function(e, callbackFunction){
                    callbackFunction({data:"{\"test\":\"value\"}"});
                },
                removeEventListener:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var eventsource = new MockProperty('localhost');
        var eventname = new MockProperty('access');
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, eventsource, eventname);
        spyOn(eventSource, 'removeEventListener');
        spyOn(eventSource, 'addEventListener').andCallThrough();
        esbu.update(new JulianDate(), dynamicObjectCollection);
        esbu._eventName = new MockProperty('coverage');
        spyOn(dm, 'process');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        expect(dm.process).toHaveBeenCalled();
        expect(eventSource.removeEventListener).toHaveBeenCalled();
        expect(eventSource.addEventListener).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('update with different eventName and url closes existing EventSource and creates a new one.', function(){
        var scene = createScene();
        var eventSource = {
                close:function(){
                },
                addEventListener:function(e, callbackFunction){
                    callbackFunction({data:"{\"test\":\"value\"}"});
                },
                removeEventListener:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var eventsource = new MockProperty('localhost');
        var eventname = new MockProperty('access');
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, eventsource, eventname);
        spyOn(eventSource, 'close');
        spyOn(eventSource, 'addEventListener');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        esbu._eventName = new MockProperty('coverage');
        esbu._url = new MockProperty('externalhost');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        expect(eventSource.close).toHaveBeenCalled();
        expect(eventSource.addEventListener).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('update with different url closes existing handle and creates a new one.', function(){
        var scene = createScene();
        var eventSource = {
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var eventsource = new MockProperty('localhost');
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, eventsource);
        spyOn(eventSource, 'close');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        esbu._url = new MockProperty('externalhost');
        esbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onmessage({data:"{\"test\":\"value\"}"});
        expect(eventSource.close).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('update calls czmlProcessor process.', function() {
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
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
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
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
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
        var dm = new CzmlProcessor(scene);
        var esbu = new EventSourceUpdater(dm, testObject.external.eventsource, testObject.external.eventname);
        spyOn(eventSource, 'close');

        esbu.abort();
        expect(eventSource.close).wasNotCalled();

        destroyScene(scene);
    });




});