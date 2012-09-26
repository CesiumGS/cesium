/*global defineSuite*/
defineSuite([
         'DynamicScene/TimeIntervalUpdater',
         'DynamicScene/CzmlProcessor',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicExternalDocument',
         'Core/JulianDate',
         'Specs/createScene',
         'Specs/destroyScene',
         'Specs/MockProperty'
     ], function(
             TimeIntervalUpdater,
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
            return new TimeIntervalUpdater();
        }).toThrow();
    });

    it('throws with missing dynamicObjectCollectionProperty and dynamicExternalDocument', function() {
        expect(function() {
            return new TimeIntervalUpdater({});
        }).toThrow();
    });

    it('throws with missing dynamicExternalDocument', function() {
        expect(function() {
            return new TimeIntervalUpdater({}, {});
        }).toThrow();
    });

    it('update creates an EventSource and calls addEventListener', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.url = new MockProperty(eventSourceUrl);

        var eventName = 'access';
        testObject.external.eventname = new MockProperty(eventName);

        var updater = new TimeIntervalUpdater(processor, dynamicObjectCollection, testObject.external);
        var startTime = new JulianDate();
        var stopTime = startTime.addSeconds(900);
        updater.update(startTime);
        var expectedUrl = eventSourceUrl + '?start=%7B%22day%22%3A' + startTime.getJulianDayNumber() +
                          '%2C%22secondsOfDay%22%3A' + startTime.getSecondsOfDay() + '%7D&stop=%7B%22day%22%3A' +
                          stopTime.getJulianDayNumber() + '%2C%22secondsOfDay%22%3A' + stopTime.getSecondsOfDay() +
                          '%7D&step=60';
        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(expectedUrl);
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith(eventName, jasmine.any(Function));
    });

    it('calls process on the CZML processor when an event is received', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();

        var eventSourceUrl = 'http://example.com/eventsource';
        testObject.external.url = new MockProperty(eventSourceUrl);

        var eventName = 'access';
        testObject.external.eventname = new MockProperty(eventName);

        var updater = new TimeIntervalUpdater(processor, dynamicObjectCollection, testObject.external);

        var startTime = new JulianDate();
        var stopTime = startTime.addSeconds(900);
        updater.update(startTime);

        spyOn(processor, 'process');

        var event = fakeEventSource.events[eventName];
        event({
            data : '{"test":"value"}'
        });

        var expectedUrl = eventSourceUrl + '?start=%7B%22day%22%3A' + startTime.getJulianDayNumber() +
        '%2C%22secondsOfDay%22%3A' + startTime.getSecondsOfDay() + '%7D&stop=%7B%22day%22%3A' +
        stopTime.getJulianDayNumber() + '%2C%22secondsOfDay%22%3A' + stopTime.getSecondsOfDay() +
        '%7D&step=60';

        expect(processor.process).toHaveBeenCalledWith({
            test : 'value'
        }, dynamicObjectCollection, expectedUrl);
    });

    it('closes the connection and starts a new one when the current time is outside the duration', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.url = new MockProperty('http://example.com/eventsource');

        var updater = new TimeIntervalUpdater(processor, dynamicObjectCollection, testObject.external);
        var date = new JulianDate();
        updater.update(date);

        var newDate = date.addSeconds(901);
        updater.update(newDate);

        expect(fakeEventSource.close).toHaveBeenCalled();
    });

    it('closes the EventSource when abort is called', function() {
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.external = new DynamicExternalDocument();
        testObject.external.url = new MockProperty('http://example.com/eventsource');

        var updater = new TimeIntervalUpdater(processor, dynamicObjectCollection, testObject.external);
        updater.update(new JulianDate());

        updater.abort();

        expect(fakeEventSource.close).toHaveBeenCalled();
    });
});