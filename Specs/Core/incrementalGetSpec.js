/*global defineSuite*/
defineSuite([
         'Core/incrementalGet'
     ], function(
         incrementalGet) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('incrementalGet throws with empty argument.', function() {
        expect(function() {
            incrementalGet();
        }).toThrow();
    });

    it('incrementalGet with itemCallback', function() {
        var eventSource = {
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        incrementalGet("test", function(data){
            expect(data).toEqual({test:"value"});
        });
        eventSource.onmessage({data:"{\"test\":\"value\"}"});
    });

    it('incrementalGet with doneCallback', function() {
        var fakeEventSource = jasmine.createSpyObj('EventSource', ['close']);
        var called = false;
        spyOn(window, 'EventSource').andReturn(fakeEventSource);
        var handle = incrementalGet("test", function(data){
        },
        function(){
            called = true;
        });
        handle.abort();
        expect(fakeEventSource.close).toHaveBeenCalled();
        expect(called).toBeTruthy();
    });


    it('incrementalGet with bad data closes throws exception', function() {
        var fakeEventSource = jasmine.createSpyObj('EventSource', ['close']);
        spyOn(window, 'XMLHttpRequest').andReturn(fakeEventSource);
        incrementalGet("test", function(data){
        });
        expect(function() {
            fakeEventSource.onmessage({data:"{\"test\":\"value}"});
        }).toThrow();
    });

});