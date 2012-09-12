/*global defineSuite*/
defineSuite([
         'DynamicScene/fillIncrementally'
     ], function(
             fillIncrementally) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('fillIncrementally calls processCallback.', function() {
        var buffer = {};
        var eventSource = {
                test:function(){
                    this.onmessage({data:"{\"test\":\"value\"}"});
                }
        };
        spyOn(window, 'EventSource').andReturn(eventSource);
        var called = false;
        fillIncrementally(buffer, "localhost", function(item, buffer, url){
            called = true;
        });
        eventSource.test();
        expect(called).toEqual(true);
    });

    it('fillIncrementally calls done callback.', function() {
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
        var handle = fillIncrementally(buffer, "localhost", function(item, buffer, url){

        },
        function(){
            called = true;
        });
        handle.abort();
        expect(called).toEqual(true);
    });
});