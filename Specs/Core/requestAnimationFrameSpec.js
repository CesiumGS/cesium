/*global defineSuite*/
defineSuite([
        'Core/requestAnimationFrame',
        'Core/cancelAnimationFrame'
    ], function(
        requestAnimationFrame,
        cancelAnimationFrame) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('calls the callback', function(done) {
        var requestID = requestAnimationFrame(function() {
            done();
        });
        expect(requestID).toBeDefined();
    });

    it('provides a timestamp that increases each frame', function(done) {
        var callbackTimestamps = [];

        function callback(timestamp) {
            callbackTimestamps.push(timestamp);

            if (callbackTimestamps.length < 3) {
                requestAnimationFrame(callback);
            } else {
                expect(callbackTimestamps[0]).toBeLessThanOrEqualTo(callbackTimestamps[1]);
                expect(callbackTimestamps[1]).toBeLessThanOrEqualTo(callbackTimestamps[2]);
                done();
            }
        }

        requestAnimationFrame(callback);
    });

    it('can cancel a callback', function(done) {
        var shouldNotBeCalled = jasmine.createSpy('shouldNotBeCalled');

        var requestID = requestAnimationFrame(shouldNotBeCalled);
        cancelAnimationFrame(requestID);

        // schedule and wait for another callback
        requestAnimationFrame(function() {
            // make sure cancelled callback didn't run
            expect(shouldNotBeCalled).not.toHaveBeenCalled();
            done();
        });
    });
});
