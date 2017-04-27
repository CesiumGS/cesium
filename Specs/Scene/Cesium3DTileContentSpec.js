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
            return content.pointsLength;
        }).toThrowDeveloperError();
        expect(function() {
            return content.trianglesLength;
        }).toThrowDeveloperError();
        expect(function() {
            return content.vertexMemorySizeInBytes;
        }).toThrowDeveloperError();
        expect(function() {
            return content.textureMemorySizeInBytes;
        }).toThrowDeveloperError();
        expect(function() {
            return content.batchTableMemorySizeInBytes;
        }).toThrowDeveloperError();
        expect(function() {
            return content.innerContents;
        }).toThrowDeveloperError();
        expect(function() {
            return content.readyPromise;
        }).toThrowDeveloperError();
        expect(function() {
            return content.hasProperty(0, 'height');
        }).toThrowDeveloperError();
        expect(function() {
            return content.getFeature(0);
        }).toThrowDeveloperError();
        expect(function() {
            content.applyDebugSettings();
        }).toThrowDeveloperError();
        expect(function() {
            content.applyStyleWithShader();
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
