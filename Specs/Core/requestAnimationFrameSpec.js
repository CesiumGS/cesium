/*global defineSuite*/
defineSuite([
        'Core/requestAnimationFrame',
        'Core/cancelAnimationFrame'
    ], function(
        requestAnimationFrame,
        cancelAnimationFrame) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('calls the callback', function() {
        var callbackRan = false;

        runs(function() {
            var requestID = requestAnimationFrame(function() {
                callbackRan = true;
            });
            expect(requestID).toBeDefined();
        });

        waitsFor(function() {
            return callbackRan;
        });
    });

    it('provides a timestamp that increases each frame', function() {
        var callbackTimestamps = [];

        runs(function() {
            function callback(timestamp) {
                callbackTimestamps.push(timestamp);

                if (callbackTimestamps.length < 3) {
                    requestAnimationFrame(callback);
                }
            }
            requestAnimationFrame(callback);
        });

        waitsFor(function() {
            return callbackTimestamps.length === 3;
        });

        runs(function() {
            expect(callbackTimestamps[0]).toBeLessThanOrEqualTo(callbackTimestamps[1]);
            expect(callbackTimestamps[1]).toBeLessThanOrEqualTo(callbackTimestamps[2]);
        });
    });

    it('can cancel a callback', function() {
        var cancelledCallbackRan = false;

        runs(function() {
            var requestID = requestAnimationFrame(function() {
                cancelledCallbackRan = true;
            });
            cancelAnimationFrame(requestID);
        });

        // schedule and wait for another callback

        var secondCallbackRan = false;
        runs(function() {
            requestAnimationFrame(function() {
                secondCallbackRan = true;
            });
        });

        waitsFor(function() {
            return secondCallbackRan;
        });

        runs(function() {
            // make sure cancelled callback didn't run
            expect(cancelledCallbackRan).toBe(false);
        });
    });
});
