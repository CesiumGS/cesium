import { FeatureDetection } from '../../Source/Cesium.js';
import { Fullscreen } from '../../Source/Cesium.js';

describe('Core/Fullscreen', function() {

    it('can tell if fullscreen is supported', function() {
        // just make sure the function runs, the test can't expect a particular result.
        expect(Fullscreen.supportsFullscreen()).toBeDefined();
    });

    it('can tell if fullscreen is enabled', function() {
        if (Fullscreen.supportsFullscreen()) {
            // just make sure the function runs, the test can't expect a particular result.
            expect(Fullscreen.enabled).toBeDefined();
        } else {
            expect(Fullscreen.enabled).toBeUndefined();
        }
    });

    it('can get fullscreen element', function() {
        if (Fullscreen.supportsFullscreen()) {
            expect(Fullscreen.element).toBeNull();
        } else {
            expect(Fullscreen.element).toBeUndefined();
        }
    });

    it('can tell if the browser is in fullscreen', function() {
        if (Fullscreen.supportsFullscreen()) {
            expect(Fullscreen.fullscreen).toEqual(false);
        } else {
            expect(Fullscreen.fullscreen).toBeUndefined();
        }
    });

    it('can request fullscreen', function() {
        if (Fullscreen.supportsFullscreen()) {
            spyOn(document.body, Fullscreen._names.requestFullscreen);
            spyOn(document, Fullscreen._names.exitFullscreen);

            Fullscreen.requestFullscreen(document.body);
            expect(document.body[Fullscreen._names.requestFullscreen]).toHaveBeenCalled();

            Fullscreen.exitFullscreen();
            expect(document[Fullscreen._names.exitFullscreen]).toHaveBeenCalled();
        } else {
            // These are no-ops if supportsFullscreen is false.
            Fullscreen.requestFullscreen(document.body);
            Fullscreen.exitFullscreen();
        }
    });

    if (!FeatureDetection.isInternetExplorer()) {
        it('can get the fullscreen change event name', function() {
            if (Fullscreen.supportsFullscreen()) {
                // the property on the document is the event name, prefixed with 'on'.
                expect(document['on' + Fullscreen.changeEventName]).toBeDefined();
            } else {
                expect(Fullscreen.changeEventName).toBeUndefined();
            }
        });

        it('can get the fullscreen error event name', function() {
            if (Fullscreen.supportsFullscreen()) {
                // the property on the document is the event name, prefixed with 'on'.
                expect(document['on' + Fullscreen.errorEventName]).toBeDefined();
            } else {
                expect(Fullscreen.errorEventName).toBeUndefined();
            }
        });
    }
});
