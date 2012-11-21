/*global defineSuite*/
defineSuite([
         'DynamicScene/IterationDrivenUpdater',
         'DynamicScene/CzmlProcessor',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/MockProperty'
     ], function(
             IterationDrivenUpdater,
             CzmlProcessor,
             DynamicObjectCollection,
             DynamicExternalDocument,
             JulianDate,
             createScene,
             destroyScene,
             MockProperty) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    var fakeEventSource;
    var fakeEventSourceConstructor;
    var dynamicObjectCollection;
    var processor;

    beforeEach(function() {
        fakeEventSource = jasmine.createSpyObj('EventSource', ['close','addEventListener']);
        fakeEventSource.events = {};
        fakeEventSource.addEventListener.andCallFake(function(eventName, f) {
            fakeEventSource.events[eventName] = f;
        });
        fakeEventSourceConstructor = spyOn(window, 'EventSource').andReturn(fakeEventSource);

        dynamicObjectCollection = new DynamicObjectCollection();
        processor = new CzmlProcessor(scene);
    });

    it('IterationDrivenUpdater throws with empty arguments.', function() {
        expect(function() {
            return new IterationDrivenUpdater();
        }).toThrow();
    });

    it('IterationDrivenUpdater throws with out dynamicObjectCollection and baseUrl', function() {
        expect(function() {
            return new IterationDrivenUpdater({});
        }).toThrow();
    });

    it('IterationDrivenUpdater throws with out baseUrl', function() {
        expect(function() {
            return new IterationDrivenUpdater({}, {});
        }).toThrow();
    });

    it('update calls the CzmlProcessor process function.', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        var eventSourceUrl = 'localhost/eventsource';
        testObject.external.polling = new MockProperty(eventSourceUrl);
        var updater = new IterationDrivenUpdater(processor, dynamicObjectCollection, testObject.external.polling, 1);

        updater.update(new JulianDate());
        spyOn(processor, 'process');

        var event = fakeEventSource.events.message;
        event({
            data : '{"test":"value"}'
        });

        expect(processor.process).toHaveBeenCalledWith({
            test : 'value'
        }, dynamicObjectCollection, eventSourceUrl);
        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(eventSourceUrl);
    });

    it('closes the handle after the correct number of iterations.', function() {

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');

        var updater  = new IterationDrivenUpdater(processor, dynamicObjectCollection, testObject.external.polling, 2);

        updater.update(new JulianDate());
        fakeEventSource.onerror();
        updater.update(new JulianDate());
        fakeEventSource.onerror();
        updater.update(new JulianDate());
        fakeEventSource.onerror();
        expect(fakeEventSource.close).toHaveBeenCalled();
    });

    it('abort closes handle.', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.polling = new MockProperty('localhost');

        var updater = new IterationDrivenUpdater(processor, dynamicObjectCollection, testObject.external.polling, 1);

        updater.update(new JulianDate());
        var event = fakeEventSource.events.message;
        event({
            data : '{"test":"value"}'
        });
        updater.abort();
        expect(fakeEventSource.close).toHaveBeenCalled();
    });
});