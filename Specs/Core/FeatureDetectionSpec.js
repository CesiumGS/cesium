/*global defineSuite*/
defineSuite(['Core/FeatureDetection'], function(FeatureDetection) {
    "use strict";
    /*global it,expect*/

    it('detects cross-origin imagery', function() {
        //just make sure the function runs, the test can't expect a value of true or false
        expect(FeatureDetection.supportsCrossOriginImagery()).toBeDefined();
    });
});