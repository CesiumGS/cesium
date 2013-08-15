/*global define*/
define([
        './DynamicProperty',
        './CzmlColor',
        './CzmlNumber',
        '../Core/defined',
        '../Scene/Material'
    ], function(
         DynamicProperty,
         CzmlColor,
         CzmlNumber,
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
         * A DynamicProperty of type CzmlColor which determines the grid's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the grid cells alpha value, when combined with the color alpha.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.cellAlpha = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the number of horizontal rows.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowCount = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the number of vertical columns.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.columnCount = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the width of each horizontal line, in pixels.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rowThickness = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the width of each vertical line, in pixels.
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

        if (defined(materialData.color)) {
            var color = this.color;
            if (!defined(color)) {
                this.color = color = new DynamicProperty(CzmlColor);
            }
            color.processCzmlIntervals(materialData.color, undefined, sourceUri);
        }

        if (defined(materialData.cellAlpha)) {
            var cellAlpha = this.cellAlpha;
            if (!defined(cellAlpha)) {
                this.cellAlpha = cellAlpha = new DynamicProperty(CzmlNumber);
            }
            cellAlpha.processCzmlIntervals(materialData.cellAlpha, undefined, sourceUri);
        }

        if (defined(materialData.rowCount)) {
            var rowCount = this.rowCount;
            if (!defined(rowCount)) {
                this.rowCount = rowCount = new DynamicProperty(CzmlNumber);
            }
            rowCount.processCzmlIntervals(materialData.rowCount, undefined, sourceUri);
        }

        if (defined(materialData.columnCount)) {
            var columnCount = this.columnCount;
            if (!defined(columnCount)) {
                this.columnCount = columnCount = new DynamicProperty(CzmlNumber);
            }
            columnCount.processCzmlIntervals(materialData.columnCount, undefined, sourceUri);
        }

        if (defined(materialData.rowThickness)) {
            var rowThickness = this.rowThickness;
            if (!defined(rowThickness)) {
                this.rowThickness = rowThickness = new DynamicProperty(CzmlNumber);
            }
            rowThickness.processCzmlIntervals(materialData.rowThickness, undefined, sourceUri);
        }

        if (defined(materialData.columnThickness)) {
            var columnThickness = this.columnThickness;
            if (!defined(columnThickness)) {
                this.columnThickness = columnThickness = new DynamicProperty(CzmlNumber);
            }
            columnThickness.processCzmlIntervals(materialData.columnThickness, undefined, sourceUri);
        }
    };

    /**
     * Gets an Grid Material that represents this dynamic material at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Context} context The context in which this material exists.
     * @param {Material} [existingMaterial] An existing material to be modified.  If the material is undefined or not an Grid Material, a new instance is created.
     * @returns The modified existingMaterial parameter or a new Grid Material instance if existingMaterial was undefined or not a Grid Material.
     */
    DynamicGridMaterial.prototype.getValue = function(time, context, existingMaterial) {
        if (!defined(existingMaterial) || (existingMaterial.type !== Material.GridType)) {
            existingMaterial = Material.fromType(context, Material.GridType);
        }

        var property = this.color;
        if (defined(property)) {
            property.getValue(time, existingMaterial.uniforms.color);
        }

        property = this.cellAlpha;
        if (defined(property)) {
            var cellAlpha = property.getValue(time);
            if (defined(cellAlpha)) {
                existingMaterial.uniforms.cellAlpha = cellAlpha;
            }
        }

        var lineCount = existingMaterial.uniforms.lineCount;

        property = this.rowCount;
        if (defined(property)) {
            var rowCount = property.getValue(time);
            if (defined(rowCount)) {
                lineCount.x = rowCount;
            }
        }

        property = this.columnCount;
        if (defined(property)) {
            var columnCount = property.getValue(time);
            if (defined(columnCount)) {
                lineCount.y = columnCount;
            }
        }

        var lineThickness = existingMaterial.uniforms.lineThickness;

        property = this.rowThickness;
        if (defined(property)) {
            var rowThickness = property.getValue(time);
            if (defined(rowThickness)) {
                lineThickness.x = rowThickness;
            }
        }

        property = this.columnThickness;
        if (defined(property)) {
            var columnThickness = property.getValue(time);
            if (defined(columnThickness)) {
                lineThickness.y = columnThickness;
            }
        }

        return existingMaterial;
    };

    return DynamicGridMaterial;
});
