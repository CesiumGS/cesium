defineSuite([
        'Scene/PointCloudShading'
    ], function(
        PointCloudShading) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var pointCloudShading = new PointCloudShading();
        expect(pointCloudShading.attenuation).toEqual(false);
        expect(pointCloudShading.geometricErrorScale).toEqual(1.0);
        expect(pointCloudShading.maximumAttenuation).not.toBeDefined();
        expect(pointCloudShading.baseResolution).not.toBeDefined();
        expect(pointCloudShading.eyeDomeLighting).toEqual(true);
        expect(pointCloudShading.eyeDomeLightingStrength).toEqual(1.0);
        expect(pointCloudShading.eyeDomeLightingRadius).toEqual(1.0);

        var options = {
            geometricErrorScale : 2.0,
            maximumAttenuation : 16,
            baseResolution : 0.1,
            eyeDomeLightingStrength : 0.1,
            eyeDomeLightingRadius : 2.0
        };
        pointCloudShading = new PointCloudShading(options);
        expect(pointCloudShading.attenuation).toEqual(false);
        expect(pointCloudShading.geometricErrorScale).toEqual(options.geometricErrorScale);
        expect(pointCloudShading.maximumAttenuation).toEqual(options.maximumAttenuation);
        expect(pointCloudShading.baseResolution).toEqual(options.baseResolution);
        expect(pointCloudShading.eyeDomeLighting).toEqual(true);
        expect(pointCloudShading.eyeDomeLightingStrength).toEqual(options.eyeDomeLightingStrength);
        expect(pointCloudShading.eyeDomeLightingRadius).toEqual(options.eyeDomeLightingRadius);
    });
});
