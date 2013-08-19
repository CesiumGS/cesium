/*global define*/
define([
        '../Core/defined'
    ], function(
         defined) {
    "use strict";

    /**
     * A utility class for processing CZML color materials.
     * @alias DynamicColorMaterial
     * @constructor
     */
    var DynamicColorMaterial = function() {
        /**
         * A DynamicProperty of type Color which determines the material's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains color material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML color material data, false otherwise.
     */
    DynamicColorMaterial.isMaterial = function(czmlInterval) {
        return defined(czmlInterval) && defined(czmlInterval.solidColor);
    };

    /**
     * Returns true if the provided CZML interval contains color material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML color material data, false otherwise.
     */
    DynamicColorMaterial.prototype.isMaterial = DynamicColorMaterial.isMaterial;

    return DynamicColorMaterial;
});
