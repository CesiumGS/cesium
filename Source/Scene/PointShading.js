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
     * {Boolean} [options.attenuation=false] Perform point attenuation based on geometric error.
     * {Number} [options.geometricErrorScale=1.0] Scale to be applied to each tile's geometric error.
     * {Number} [options.maximumAttenuation] Maximum attenuation in pixels. Defaults to the Cesium3DTileset's maximumScreenSpaceError.
     * {Number} [options.baseResolution] Average base resolution for the dataset in meters. Substitute for Geometric Error when not available.
     * {Boolean} [options.eyeDomeLighting=false] When true, use eye dome lighting when drawing with point attenuation.
     * {Number} [options.eyeDomeLightingStrength=1.0] Increasing this value increases contrast on slopes and edges.
     * {Number} [options.eyeDomeLightingRadius=1.0] Increase the thickness of contours from eye dome lighting.
     * @constructor
     */
    function PointShading(options) {
        var pointShading = defaultValue(options, {});

        /**
         * Perform point attenuation based on geometric error.
         * @type {Boolean}
         * @default false
         */
        this.attenuation = defaultValue(pointShading.attenuation, false);

        /**
         * Scale to be applied to the geometric error before computing attenuation.
         * @type {Number}
         * @default 1.0
         */
        this.geometricErrorScale = defaultValue(pointShading.geometricErrorScale, 1.0);

        /**
         * Maximum point attenuation in pixels. If undefined, the Cesium3DTileset's maximumScreenSpaceError will be used.
         * @type {Number}
         */
        this.maximumAttenuation = pointShading.maximumAttenuation;

        /**
         * Average base resolution for the dataset in meters.
         * Used in place of geometric error when geometric error is 0.
         * If undefined, an approximation will be computed for each tile that has geometric error of 0.
         * @type {Number}
         */
        this.baseResolution = pointShading.baseResolution;

        /**
         * Use eye dome lighting when drawing with point attenuation
         * Requires support for EXT_frag_depth, OES_texture_float, and WEBGL_draw_buffers extensions in WebGL 1.0,
         * otherwise eye dome lighting is ignored.
         *
         * @type {Boolean}
         * @default false
         */
        this.eyeDomeLighting = defaultValue(pointShading.eyeDomeLighting, false);

        /**
         * Eye dome lighting strength (apparent contrast)
         * @type {Number}
         * @default 1.0
         */
        this.eyeDomeLightingStrength = defaultValue(pointShading.eyeDomeLightingStrength, 1.0);

        /**
         * Thickness of contours from eye dome lighting
         * @type {Number}
         * @default 1.0
         */
        this.eyeDomeLightingRadius = defaultValue(pointShading.eyeDomeLightingRadius, 1.0);
    }

    return PointShading;
});
