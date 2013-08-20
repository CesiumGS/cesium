/*global define*/
define(function() {
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

    return DynamicColorMaterial;
});
