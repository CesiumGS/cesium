/*global defineSuite*/
defineSuite([
             'Core/Fullscreen',
             'Core/FeatureDetection'
         ],function(
             Fullscreen,
             FeatureDetection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can tell if fullscreen is supported', function() {
        // just make sure the function runs, the test can't expect a particular result.
        expect(Fullscreen.supportsFullscreen()).toBeDefined();
    });

    it('can tell if fullscreen is enabled', function() {
        if (Fullscreen.supportsFullscreen()) {
            // just make sure the function runs, the test can't expect a particular result.
            expect(Fullscreen.isFullscreenEnabled()).toBeDefined();
        } else {
            expect(Fullscreen.isFullscreenEnabled()).toBeUndefined();
        }
    });

    it('can get fullscreen element', function() {
        if (Fullscreen.supportsFullscreen()) {
            expect(Fullscreen.getFullscreenElement()).toBeNull();
        } else {
            expect(Fullscreen.getFullscreenElement()).toBeUndefined();
        }
    });

    it('can tell if the browser is in fullscreen', function() {
        if (Fullscreen.supportsFullscreen()) {
            expect(Fullscreen.isFullscreen()).toEqual(false);
        } else {
            expect(Fullscreen.isFullscreen()).toBeUndefined();
        }
    });

    it('can request fullscreen', function() {
        // we can get away with this because the request is async, allowing us to
        // exit before it actually happens
        Fullscreen.requestFullscreen(document.body);
        Fullscreen.exitFullscreen();
    });

    if (!FeatureDetection.isInternetExplorer()) {
        it('can get the fullscreen change event name', function() {
            if (Fullscreen.supportsFullscreen()) {
                // the property on the document is the event name, prefixed with 'on'.
                expect(document['on' + Fullscreen.getFullscreenChangeEventName()]).toBeDefined();
            } else {
                expect(Fullscreen.getFullscreenChangeEventName()).toBeUndefined();
            }
        });

        it('can get the fullscreen error event name', function() {
            if (Fullscreen.supportsFullscreen()) {
                // the property on the document is the event name, prefixed with 'on'.
                expect(document['on' + Fullscreen.getFullscreenErrorEventName()]).toBeDefined();
            } else {
                expect(Fullscreen.getFullscreenErrorEventName()).toBeUndefined();
            }
        });
    }
});