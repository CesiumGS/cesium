/*global defineSuite*/
defineSuite([
         'Scene/OpenStreetMapImageryProvider',
         'Core/jsonp',
         'Core/loadImage',
         'Scene/ImageryProvider'
     ], function(
         OpenStreetMapImageryProvider,
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
        expect(OpenStreetMapImageryProvider).toConformToInterface(ImageryProvider);
    });
});
