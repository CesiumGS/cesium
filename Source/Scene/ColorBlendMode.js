/*global define*/
define([
        '../Core/freezeObject'
], function(
        freezeObject) {
    'use strict';

    /**
     * Defines different modes for blending between a target color and a primitive's source color.
     *
     * HIGHLIGHT multiplies the source color by the target color
     * REPLACE replaces the source color with the target color
     * MIX blends the source color and target color together
     *
     * @exports ColorBlendMode
     *
     * @see Model.colorBlendMode
     */
    var ColorBlendMode = {
        HIGHLIGHT : 0,
        REPLACE : 1,
        MIX : 2
    };

    return freezeObject(ColorBlendMode);
});