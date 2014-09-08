/*global defineSuite*/
defineSuite([
        'Core/FeatureDetection'
    ], function(
        FeatureDetection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('detects fullscreen support', function() {
        //just make sure the function runs, the test can't expect a value of true or false
        expect(FeatureDetection.supportsFullscreen()).toBeDefined();
    });

    it('detects web worker support', function() {
        //just make sure the function runs, the test can't expect a value of true or false
        expect(FeatureDetection.supportsWebWorkers()).toBeDefined();
    });
});
