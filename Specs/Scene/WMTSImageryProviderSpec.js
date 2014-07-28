/*global defineSuite*/
defineSuite([
        'Scene/WMTSImageryProvider',
        'Core/DefaultProxy',
        'Core/defined',
        'Core/jsonp',
        'Core/loadImage',
        'Core/Rectangle',
        'Core/WebMercatorTilingScheme',
        'Scene/Imagery',
        'Scene/ImageryLayer',
        'Scene/ImageryProvider',
        'Scene/ImageryState',
        'ThirdParty/when'
    ], function(
        WMTSImageryProvider,
        DefaultProxy,
        defined,
        jsonp,
        loadImage,
        Rectangle,
        WebMercatorTilingScheme,
        Imagery,
        ImageryLayer,
        ImageryProvider,
        ImageryState,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    afterEach(function() {
        jsonp.loadAndExecuteScript = jsonp.defaultLoadAndExecuteScript;
        loadImage.createImage = loadImage.defaultCreateImage;
    });

    it('conforms to ImageryProvider interface', function() {
        expect(WMTSImageryProvider).toConformToInterface(ImageryProvider);
    });



});
