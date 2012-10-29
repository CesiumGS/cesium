/*global defineSuite*/
defineSuite([
             'Core/requestAnimationFrame'
         ], function(
             requestAnimationFrame) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('calls the callback', function() {
        var callbackRan = false;

        runs(function() {
            requestAnimationFrame(function() {
                callbackRan = true;
            });
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
});
