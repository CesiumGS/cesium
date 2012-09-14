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
        fakeEventSource = jasmine.createSpyObj('EventSource', ['addEventListener', 'removeEventListener', 'close']);
        fakeEventSource.events = {};
        fakeEventSource.addEventListener.andCallFake(function(eventName, f) {
            fakeEventSource.events[eventName] = f;
        });
        fakeEventSourceConstructor = spyOn(window, 'EventSource').andReturn(fakeEventSource);

        dynamicObjectCollection = new DynamicObjectCollection();
        processor = new CzmlProcessor(scene);
    });

    it('throws with empty arguments', function() {
        expect(function() {
            return new EventSourceUpdater();
        }).toThrow();
    });

    it('throws with missing urlProperty', function() {
        expect(function() {
            return new EventSourceUpdater({});
        }).toThrow();
    });

    it('update creates an EventSource and calls addEventListener', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.eventsource = new MockProperty(eventSourceUrl);

        var eventName = 'access';
        testObject.external.eventname = new MockProperty(eventName);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource, testObject.external.eventname);

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(eventSourceUrl);
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith(eventName, jasmine.any(Function));
    });

    it('adds an event listener for events of type message if the eventNameProperty is undefined', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.eventsource = new MockProperty(eventSourceUrl);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource);

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(eventSourceUrl);
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith('message', jasmine.any(Function));
    });

    it('adds an event listener for events of type message if the eventNameProperty has a value of undefined', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.eventsource = new MockProperty(eventSourceUrl);
        testObject.external.eventname = new MockProperty(undefined);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource);

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(eventSourceUrl);
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith('message', jasmine.any(Function));
    });

    it('switches event listeners when the value of eventName changes', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        testObject.external.eventsource = new MockProperty('http://example.com/eventsource');

        var firstEventName = 'access';
        var secondEventName = 'other';
        testObject.external.eventname = new MockProperty(firstEventName);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource, testObject.external.eventname);

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith(firstEventName, jasmine.any(Function));

        testObject.external.eventname.value = secondEventName;

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSource.removeEventListener).toHaveBeenCalledWith(firstEventName);
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith(secondEventName, jasmine.any(Function));
    });

    it('closes and reopens event stream when the value of urlProperty changes', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var firstUrl = 'http://example.com/eventsource';
        var secondUrl = 'http://example.com/othereventsource';
        testObject.external.eventsource = new MockProperty(firstUrl);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource, testObject.external.eventname);

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(firstUrl);

        testObject.external.eventsource.value = secondUrl;

        updater.update(new JulianDate(), dynamicObjectCollection);

        expect(fakeEventSource.close).toHaveBeenCalled();
        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(secondUrl);
    });

    it('calls process on the CZML processor when an event is received', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.eventsource = new MockProperty(eventSourceUrl);

        var eventName = 'access';
        testObject.external.eventname = new MockProperty(eventName);

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource, testObject.external.eventname);

        updater.update(new JulianDate(), dynamicObjectCollection);

        spyOn(processor, 'process');

        var event = fakeEventSource.events[eventName];
        event({
            data : '{"test":"value"}'
        });

        expect(processor.process).toHaveBeenCalledWith({
            test : 'value'
        }, dynamicObjectCollection, eventSourceUrl);
    });

    it('closes the EventSource when abort is called', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.eventsource = new MockProperty('http://example.com/eventsource');

        var updater = new EventSourceUpdater(processor, testObject.external.eventsource, testObject.external.eventname);
        updater.update(new JulianDate(), dynamicObjectCollection);

        updater.abort();

        expect(fakeEventSource.close).toHaveBeenCalled();
    });
});