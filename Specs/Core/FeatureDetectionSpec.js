/*global defineSuite*/
defineSuite(['Core/FeatureDetection'], function(FeatureDetection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('detects cross-origin imagery', function() {
        //just make sure the function runs, the test can't expect a value of true or false
        expect(FeatureDetection.supportsCrossOriginImagery()).toBeDefined();
    });

    it('detects full screen support', function() {
        //just make sure the function runs, the test can't expect a value of true or false
        expect(FeatureDetection.supportsFullScreen()).toBeDefined();
    });

    it('detects WebGL support', function() {
        //just make sure the function runs, the test can't expect a particular result
        expect(FeatureDetection.supportsWebGL()).toBeDefined();
    });
});