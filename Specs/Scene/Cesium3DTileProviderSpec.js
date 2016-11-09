/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileContent'
    ], function(
        Cesium3DTileContent) {
    'use strict';

    it('throws', function() {
        var content = new Cesium3DTileContent();
        expect(function() {
            return content.featuresLength;
        }).toThrowDeveloperError();
        expect(function() {
            return content.innerContents;
        }).toThrowDeveloperError();
        expect(function() {
            return content.getFeature(0);
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
