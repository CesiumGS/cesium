defineSuite([
        'Scene/PointShading'
    ], function(
        PointShading
    ) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var pointShading = new PointShading();
        expect(pointShading.attenuation).toEqual(false);
        expect(pointShading.geometricErrorScale).toEqual(1.0);
        expect(pointShading.maximumAttenuation).not.toBeDefined();
        expect(pointShading.baseResolution).not.toBeDefined();
        expect(pointShading.eyeDomeLighting).toEqual(false);
        expect(pointShading.eyeDomeLightingStrength).toEqual(1.0);
        expect(pointShading.eyeDomeLightingRadius).toEqual(1.0);

        var options = {
            geometricErrorScale : 2.0,
            maximumAttenuation : 16,
            baseResolution : 0.1,
            eyeDomeLightingStrength : 0.1,
            eyeDomeLightingRadius : 2.0
        };
        pointShading = new PointShading(options);
        expect(pointShading.attenuation).toEqual(false);
        expect(pointShading.geometricErrorScale).toEqual(options.geometricErrorScale);
        expect(pointShading.maximumAttenuation).toEqual(options.maximumAttenuation);
        expect(pointShading.baseResolution).toEqual(options.baseResolution);
        expect(pointShading.eyeDomeLighting).toEqual(false);
        expect(pointShading.eyeDomeLightingStrength).toEqual(options.eyeDomeLightingStrength);
        expect(pointShading.eyeDomeLightingRadius).toEqual(options.eyeDomeLightingRadius);
    });
});
