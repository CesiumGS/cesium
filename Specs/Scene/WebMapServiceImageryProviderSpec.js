/*global defineSuite*/
defineSuite([
         'Scene/WebMapServiceImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Scene/ImageryProvider'
     ], function(
         WebMapServiceImageryProvider,
         jsonp,
         loadImage,
         ImageryProvider) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    beforeAll(function() {
    });

    afterAll(function() {
    });

    beforeEach(function() {
    });

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(WebMapServiceImageryProvider).toConformToInterface(ImageryProvider);
    });
});
