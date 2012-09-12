/*global defineSuite*/
defineSuite([
         'DynamicScene/IterationDrivenUpdater',
         'DynamicScene/DocumentManager',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         '../Specs/createScene',
         '../Specs/destroyScene',
         '../Specs/MockProperty'
     ], function(
             IterationDrivenUpdater,
             DocumentManager,
             DynamicObjectCollection,
             DynamicExternalDocument,
             JulianDate,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('IterationDrivenUpdater throws with empty arguments.', function() {
        expect(function() {
            return new IterationDrivenUpdater();
        }).toThrow();
    });

    it('IterationDrivenUpdater throws with out baseUrl', function() {
        expect(function() {
            return new IterationDrivenUpdater({});
        }).toThrow();
    });

    it('update calls document manager process function.', function() {
        var scene = createScene();
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                },
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');
        var dm = new DocumentManager(scene);
        var idbu = new IterationDrivenUpdater(dm, testObject.external.polling, 1);

        spyOn(dm, 'process');
        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.test();
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
        var dm = new DocumentManager(scene);
        var idbu = new IterationDrivenUpdater(dm, testObject.external.polling, 1);


        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.test();
        expect(idbu._handle).toBeUndefined();
        destroyScene(scene);
    });

    it('closes the handle after the correct number of iterations.', function() {
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
        var dm = new DocumentManager(scene);
        var idbu = new IterationDrivenUpdater(dm, testObject.external.polling, 2);

        spyOn(eventSource, 'close');
        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onerror();
        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onerror();
        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.onerror();
        expect(eventSource.close).toHaveBeenCalled();
        destroyScene(scene);
    });

    it('abort closes handle.', function() {
        var scene = createScene();
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                },
                close:function(){
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');
        var dm = new DocumentManager(scene);
        var idbu = new IterationDrivenUpdater(dm, testObject.external.polling, 1);


        idbu.update(new JulianDate(), dynamicObjectCollection);
        eventSource.test();
        idbu.abort();
        expect(idbu._handle).toBeUndefined();
        destroyScene(scene);
    });
});