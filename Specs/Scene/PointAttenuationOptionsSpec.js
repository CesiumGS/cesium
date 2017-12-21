defineSuite([
        'Scene/PointAttenuationOptions'
    ], function(
        PointAttenuationOptions
    ) {
    'use strict';

    it('creates expected instance from raw assignment and construction', function() {
        var pointAttenuationOptions = new PointAttenuationOptions();
        expect(pointAttenuationOptions.geometricErrorAttenuation).toEqual(false);
        expect(pointAttenuationOptions.geometricErrorScale).toEqual(1.0);
        expect(pointAttenuationOptions.maximumAttenuation).not.toBeDefined();
        expect(pointAttenuationOptions.baseResolution).not.toBeDefined();
        expect(pointAttenuationOptions.eyeDomeLighting).toEqual(false);
        expect(pointAttenuationOptions.eyeDomeLightingStrength).toEqual(1.0);
        expect(pointAttenuationOptions.eyeDomeLightingRadius).toEqual(1.0);

        var options = {
            geometricErrorScale : 2.0,
            maximumAttenuation : 16,
            baseResolution : 0.1,
            eyeDomeLightingStrength : 0.1,
            eyeDomeLightingRadius : 2.0
        };
        pointAttenuationOptions = new PointAttenuationOptions(options);
        expect(pointAttenuationOptions.geometricErrorAttenuation).toEqual(false);
        expect(pointAttenuationOptions.geometricErrorScale).toEqual(options.geometricErrorScale);
        expect(pointAttenuationOptions.maximumAttenuation).toEqual(options.maximumAttenuation);
        expect(pointAttenuationOptions.baseResolution).toEqual(options.baseResolution);
        expect(pointAttenuationOptions.eyeDomeLighting).toEqual(false);
        expect(pointAttenuationOptions.eyeDomeLightingStrength).toEqual(options.eyeDomeLightingStrength);
        expect(pointAttenuationOptions.eyeDomeLightingRadius).toEqual(options.eyeDomeLightingRadius);
    });
});
