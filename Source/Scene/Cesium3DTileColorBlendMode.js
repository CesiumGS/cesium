/*global define*/
define([
        '../Core/freezeObject'
], function(
        freezeObject) {
    'use strict';

    var Cesium3DTileColorBlendMode = {
        HIGHLIGHT : 0,
        REPLACE : 1,
        MIX : 2
    };

    return freezeObject(Cesium3DTileColorBlendMode);
});
