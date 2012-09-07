/*global defineSuite*/
defineSuite(['Core/addEventSourceListener'], function(addEventSourceListener) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('addEventSourceListener throws with no args.', function() {
        expect(function() {
            addEventSourceListener();
         }).toThrow();
    });

    it('addEventSourceListener throws with no eventName specified.', function() {
        expect(function() {
            addEventSourceListener({});
         }).toThrow();
    });

    it('addEventSourceListener calls callback function.', function() {
        var eventSource = {
                addEventListener:function(eventName, callback){
                    callback({data:"{\"test\":\"data\"}"});
                }
        };
        var called;
        addEventSourceListener(eventSource, 'access', function(e){
            called = e;
        });
        expect(called).toBeDefined();
        expect(called).toEqual({test:"data"});
    });

    it('addEventSourceListener without callback function works.', function() {
        var eventSource = {
                addEventListener:function(eventName, callback){
                    callback({data:"{\"test\":\"data\"}"});
                }
        };
        addEventSourceListener(eventSource, 'access');
    });
});