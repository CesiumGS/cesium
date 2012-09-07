/*global defineSuite*/
defineSuite([
         'DynamicScene/fillBufferIncrementally'
     ], function(
             fillBufferIncrementally) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('fillBufferIncrementally calls processCallback.', function() {
        var buffer = {};
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var called = false;
        fillBufferIncrementally(buffer, "localhost", function(item, buffer, url){
            called = true;
        });
        eventSource.test();
        expect(called).toEqual(true);
    });

    it('fillBufferIncrementally calls done callback.', function() {
        var buffer = {};
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                },
                close:function(){

                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var called = false;
        var handle = fillBufferIncrementally(buffer, "localhost", function(item, buffer, url){

        },
        function(){
            called = true;
        });
        handle.abort();
        expect(called).toEqual(true);
    });
});