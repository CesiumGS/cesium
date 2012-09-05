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
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        incrementalGet("test", function(data){
            expect(data).toEqual({test:"value"});
        });
        eventSource.test();
    });

    it('incrementalGet with doneCallback', function() {
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                },
                close:function(){
                }
        };
        var called = false;
        spyOn(window, 'EventSource').andReturn(eventSource);
        var handle = incrementalGet("test", function(data){
        },
        function(){
            called = true;
        });
        spyOn(eventSource, 'close');
        handle.abort();
        expect(eventSource.close).toHaveBeenCalled();
        expect(called).toBeTruthy();
    });


    it('incrementalGet with bad data closes eventSource', function() {
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value}"});
                },
                close:function(){
                }
        };
        var called = false;
        spyOn(window, 'EventSource').andReturn(eventSource);
        spyOn(eventSource, 'close');
        incrementalGet("test", function(data){
        },
        function(){
            called = true;
        });
        eventSource.test();
        expect(eventSource.close).toHaveBeenCalled();
        expect(called).toBeTruthy();
    });

});