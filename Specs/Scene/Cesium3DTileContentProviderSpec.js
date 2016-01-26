/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileContentProvider'
    ], function(
        Cesium3DTileContentProvider) {
    "use strict";

    it('throws', function() {
        var content = new Cesium3DTileContentProvider();
        expect(function() {
            return content.featuresLength;
        }).toThrowDeveloperError();
        expect(function() {
            return content.batchTableResources;
        }).toThrowDeveloperError();
        expect(function() {
            content.request();
        }).toThrowDeveloperError();
        expect(function() {
            content.initialize();
        }).toThrowDeveloperError();
        expect(function() {
            content.update();
        }).toThrowDeveloperError();
        expect(function() {
            content.isDestroyed();
        }).toThrowDeveloperError();
        expect(function() {
            content.destroy();
        }).toThrowDeveloperError();
    });
});
