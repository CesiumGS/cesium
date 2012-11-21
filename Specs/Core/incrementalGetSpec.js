/*global defineSuite*/
defineSuite([
         'Core/incrementalGet'
     ], function(
         incrementalGet) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var fakeEventSource;
    var fakeEventSourceConstructor;

    beforeEach(function() {
        fakeEventSource = jasmine.createSpyObj('EventSource', ['close','addEventListener']);
        fakeEventSource.events = {};
        fakeEventSource.addEventListener.andCallFake(function(eventName, f) {
            fakeEventSource.events[eventName] = f;
        });
        fakeEventSourceConstructor = spyOn(window, 'EventSource').andReturn(fakeEventSource);
    });

    it('throws with an empty url', function() {
        expect(function() {
            incrementalGet();
        }).toThrow();
    });

    it('constructs an EventSource and calls itemCallback with each item', function() {
        var testUrl = 'http://example.com/test';
        var itemCallback = jasmine.createSpy('itemCallback');
        incrementalGet(testUrl, itemCallback);

        expect(fakeEventSourceConstructor).toHaveBeenCalledWith(testUrl);
        expect(itemCallback).not.toHaveBeenCalled();
        expect(fakeEventSource.addEventListener).toHaveBeenCalledWith('message', jasmine.any(Function));

        var event = fakeEventSource.events.message;
        event({
            data : '{"test":"value"}'
        });

        expect(itemCallback).toHaveBeenCalledWith({
            test : 'value'
        });
    });

    it('calls doneCallback and closes the EventSource when onerror fires (i.e. the connection closes)', function() {
        var testUrl = 'http://example.com/test';
        var itemCallback = jasmine.createSpy('itemCallback');
        var doneCallback = jasmine.createSpy('doneCallback');
        incrementalGet(testUrl, itemCallback, doneCallback);

        expect(doneCallback).not.toHaveBeenCalled();
        expect(fakeEventSource.close).not.toHaveBeenCalled();

        fakeEventSource.onerror();

        expect(doneCallback).toHaveBeenCalled();
        expect(fakeEventSource.close).toHaveBeenCalled();
    });

    it('calls doneCallback and closes the EventSource when abort is called', function() {
        var testUrl = 'http://example.com/test';
        var itemCallback = jasmine.createSpy('itemCallback');
        var doneCallback = jasmine.createSpy('doneCallback');
        var abort = incrementalGet(testUrl, itemCallback, doneCallback);

        expect(doneCallback).not.toHaveBeenCalled();
        expect(fakeEventSource.close).not.toHaveBeenCalled();

        abort();

        expect(doneCallback).toHaveBeenCalled();
        expect(fakeEventSource.close).toHaveBeenCalled();
    });
});