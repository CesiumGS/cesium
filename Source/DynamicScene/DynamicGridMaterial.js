/*global define*/
define([
        './processPacketData',
        '../Core/Color',
        '../Core/defined',
        '../Scene/Material'
    ], function(
         processPacketData,
         Color,
         defined,
         Material) {
    "use strict";

    /**
     * A utility class for processing CZML grid materials.
     * @alias DynamicGridMaterial
     * @constructor
     */
    var DynamicGridMaterial = function() {
        /**
         * A DynamicProperty of type Color which determines the grid's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;

        /**
         * A DynamicProperty of type Number which determines the grid cells alpha value, when combined with the color alpha.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.cellAlpha = undefined;

        /**
         * A DynamicProperty of type Number which determines the number of horizontal rows.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowCount = undefined;

        /**
         * A DynamicProperty of type Number which determines the number of vertical columns.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.columnCount = undefined;

        /**
         * A DynamicProperty of type Number which determines the width of each horizontal line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowThickness = undefined;

        /**
         * A DynamicProperty of type Number which determines the width of each vertical line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.columnThickness = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains grid material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML grid material data, false otherwise.
     */
    DynamicGridMaterial.isMaterial = function(czmlInterval) {
        return defined(czmlInterval.grid);
    };

    /**
     * Returns true if the provided CZML interval contains grid material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML grid material data, false otherwise.
     */
    DynamicGridMaterial.prototype.isMaterial = DynamicGridMaterial.isMaterial;

    /**
     * Provided a CZML interval containing grid material data, processes the
     * interval into a new or existing instance of this class.
     *
     * @param {Object} czmlInterval The interval to process.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns The modified existingMaterial parameter or a new DynamicGridMaterial instance if existingMaterial was undefined or not a DynamicGridMaterial.
     */
    DynamicGridMaterial.prototype.processCzmlIntervals = function(czmlInterval, sourceUri) {
        var materialData = czmlInterval.grid;
        if (!defined(materialData)) {
            return;
        }

        processPacketData(Color, this, 'color', materialData.color, undefined, sourceUri);
        processPacketData(Number, this, 'cellAlpha', materialData.cellAlpha, undefined, sourceUri);
        processPacketData(Number, this, 'rowCount', materialData.rowCount, undefined, sourceUri);
        processPacketData(Number, this, 'columnCount', materialData.columnCount, undefined, sourceUri);
        processPacketData(Number, this, 'rowThickness', materialData.rowThickness, undefined, sourceUri);
        processPacketData(Number, this, 'columnThickness', materialData.columnThickness, undefined, sourceUri);
    };

    return DynamicGridMaterial;
});
