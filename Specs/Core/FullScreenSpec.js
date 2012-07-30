/*global defineSuite*/
defineSuite(['Core/FullScreen'
            ],function(
              FullScreen) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('Methods execute', function() {
        //Just make sure the functions run.
        //We can't actually verify what's happening.
        expect(FullScreen.supportsFullScreen()).toBeDefined();
        expect(FullScreen.isFullscreenEnabled()).toBeDefined();
        FullScreen.requestFullScreen(document.body);
        FullScreen.exitFullscreen();
    });

    it('getFullScreenChangeEventName works', function() {
        //Just make sure the functions run.
        //We can't actually verify what's happening.
        if (FullScreen.supportsFullScreen()) {
            expect(document[FullScreen.getFullScreenChangeEventName()]).toBeDefined();
        }
    });

    it('getFullScreenErrorEventName works', function() {
        //Just make sure the functions run.
        //We can't actually verify what's happening.
        if (FullScreen.supportsFullScreen()) {
            expect(document[FullScreen.getFullScreenChangeEventName()]).toBeDefined();
        }
    });
});