define([
    '../Core/defaultValue'
], function(
    defaultValue
) {
    'use strict';

    /**
     * Options for performing point attenuation based on geometric error when rendering
     * pointclouds using 3D Tiles.
     *
     * @param {Object} [options] Object with the following properties:
     * {Boolean} [options.geometricErrorAttenuation=false] Perform point attenuation based on geometric error.
     * {Number} [options.geometricErrorScale=1.0] Scale to be applied to each tile's geometric error.
     * {Number} [options.maximumAttenuation] Maximum attenuation in pixels. Defaults to the Cesium3DTileset's maximumScreenSpaceError.
     * {Number} [options.baseResolution] Average base resolution for the dataset in meters. Substitute for Geometric Error when not available.
     * {Boolean} [options.eyeDomeLighting=false] When true, use eye dome lighting when drawing with point attenuation.
     * {Number} [options.eyeDomeLightingStrength=1.0] Increasing this value increases contrast on slopes and edges.
     * {Number} [options.eyeDomeLightingRadius=1.0] Increase the thickness of contours from eye dome lighting.
     * @constructor
     */
    function PointAttenuationOptions(options) {
        var pointAttenuationOptions = defaultValue(options, {});

        /**
         * Perform point attenuation based on geometric error.
         * @type {Boolean}
         */
        this.geometricErrorAttenuation = defaultValue(pointAttenuationOptions.geometricErrorAttenuation, false);

        /**
         * Scale to be applied to the geometric error before computing attenuation.
         * @type {Number}
         */
        this.geometricErrorScale = defaultValue(pointAttenuationOptions.geometricErrorScale, 1.0);

        /**
         * Maximum point attenuation in pixels. If undefined, the Cesium3DTileset's maximumScreenSpaceError will be used.
         * @type {Number}
         */
        this.maximumAttenuation = pointAttenuationOptions.maximumAttenuation;

        /**
         * Average base resolution for the dataset in meters.
         * Used in place of geometric error when geometric error is 0.
         * If undefined, an approximation will be computed for each tile that has geometric error of 0.
         * @type {Number}
         */
        this.baseResolution = pointAttenuationOptions.baseResolution;

        /**
         * Use eye dome lighting when drawing with point attenuation
         * @type {Boolean}
         */
        this.eyeDomeLighting = defaultValue(pointAttenuationOptions.eyeDomeLighting, false);

        /**
         * Eye dome lighting strength (apparent contrast)
         * @type {Number}
         */
        this.eyeDomeLightingStrength = defaultValue(pointAttenuationOptions.eyeDomeLightingStrength, 1.0);

        /**
         * Thickness of contours from eye dome lighting
         * @type {Number}
         */
        this.eyeDomeLightingRadius = defaultValue(pointAttenuationOptions.eyeDomeLightingRadius, 1.0);
    }

    return PointAttenuationOptions;
});
