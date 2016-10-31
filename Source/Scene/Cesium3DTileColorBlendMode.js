/*global define*/
define([
        '../Core/freezeObject'
], function(
        freezeObject) {
    'use strict';

    /**
     * Defines how per-feature colors set from the Cesium API or declarative styling blend with the source colors from
     * the original feature, e.g. glTF material or per-point color in the tile.
     *
     * HIGHLIGHT multiplies the source color by the feature color
     * REPLACE replaces the source color with the feature color
     * MIX blends the source color and feature color together
     *
     * When REPLACE or MIX are used and the source color is a glTF material, the technique must assign the
     * _3DTILESDIFFUSE semantic to the diffuse color parameter. Otherwise only HIGHLIGHT is supported.
     *
     * For example:
     *
     * "techniques": {
     *   "technique0": {
     *     "parameters": {
     *       "diffuse": {
     *         "semantic": "_3DTILESDIFFUSE",
     *         "type": 35666
     *       }
     *     }
     *   }
     * }
     *
     * @exports Cesium3DTileColorBlendMode
     */
    var Cesium3DTileColorBlendMode = {
        HIGHLIGHT : 0,
        REPLACE : 1,
        MIX : 2
    };

    return freezeObject(Cesium3DTileColorBlendMode);
});
