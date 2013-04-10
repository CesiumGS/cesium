/*global define*/
define([
        './DynamicProperty',
        './CzmlColor',
        './CzmlNumber',
        '../Scene/Material'
    ], function(
         DynamicProperty,
         CzmlColor,
         CzmlNumber,
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
         * @type DynamicProperty
         */
        this.color = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the grid cells alpha value, when combined with the color alpha.
         * @type DynamicProperty
         */
        this.cellAlpha = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the number of horizontal rows.
         * @type DynamicProperty
         */
        this.rowCount = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the number of vertical columns.
         * @type DynamicProperty
         */
        this.columnCount = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the width of each horizontal line, in pixels.
         * @type DynamicProperty
         */
        this.rowThickness = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the width of each vertical line, in pixels.
         * @type DynamicProperty
         */
        this.columnThickness = undefined;
    };

    /**
     * Returns true if the provided CZML interval contains grid material data.
     * @param czmlInterval The CZML interval to check.
     * @returns {Boolean} true if the interval contains CZML grid material data, false otherwise.
     */
    DynamicGridMaterial.isMaterial = function(czmlInterval) {
        return typeof czmlInterval.grid !== 'undefined';
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
        if (typeof materialData === 'undefined') {
            return;
        }

        if (typeof materialData.color !== 'undefined') {
            var color = this.color;
            if (typeof color === 'undefined') {
                this.color = color = new DynamicProperty(CzmlColor);
            }
            color.processCzmlIntervals(materialData.color, undefined, sourceUri);
        }

        if (typeof materialData.cellAlpha !== 'undefined') {
            var cellAlpha = this.cellAlpha;
            if (typeof cellAlpha === 'undefined') {
                this.cellAlpha = cellAlpha = new DynamicProperty(CzmlNumber);
            }
            cellAlpha.processCzmlIntervals(materialData.cellAlpha, undefined, sourceUri);
        }

        if (typeof materialData.rowCount !== 'undefined') {
            var rowCount = this.rowCount;
            if (typeof rowCount === 'undefined') {
                this.rowCount = rowCount = new DynamicProperty(CzmlNumber);
            }
            rowCount.processCzmlIntervals(materialData.rowCount, undefined, sourceUri);
        }

        if (typeof materialData.columnCount !== 'undefined') {
            var columnCount = this.columnCount;
            if (typeof columnCount === 'undefined') {
                this.columnCount = columnCount = new DynamicProperty(CzmlNumber);
            }
            columnCount.processCzmlIntervals(materialData.columnCount, undefined, sourceUri);
        }

        if (typeof materialData.rowThickness !== 'undefined') {
            var rowThickness = this.rowThickness;
            if (typeof rowThickness === 'undefined') {
                this.rowThickness = rowThickness = new DynamicProperty(CzmlNumber);
            }
            rowThickness.processCzmlIntervals(materialData.rowThickness, undefined, sourceUri);
        }

        if (typeof materialData.columnThickness !== 'undefined') {
            var columnThickness = this.columnThickness;
            if (typeof columnThickness === 'undefined') {
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
        if (typeof existingMaterial === 'undefined' || (existingMaterial.type !== Material.GridType)) {
            existingMaterial = Material.fromType(context, Material.GridType);
        }

        var property = this.color;
        if (typeof property !== 'undefined') {
            property.getValue(time, existingMaterial.uniforms.color);
        }

        property = this.cellAlpha;
        if (typeof property !== 'undefined') {
            var cellAlpha = property.getValue(time);
            if (typeof cellAlpha !== 'undefined') {
                existingMaterial.uniforms.cellAlpha = cellAlpha;
            }
        }

        var lineCount = existingMaterial.uniforms.lineCount;

        property = this.rowCount;
        if (typeof property !== 'undefined') {
            var rowCount = property.getValue(time);
            if (typeof rowCount !== 'undefined') {
                lineCount.x = rowCount;
            }
        }

        property = this.columnCount;
        if (typeof property !== 'undefined') {
            var columnCount = property.getValue(time);
            if (typeof columnCount !== 'undefined') {
                lineCount.y = columnCount;
            }
        }

        var lineThickness = existingMaterial.uniforms.lineThickness;

        property = this.rowThickness;
        if (typeof property !== 'undefined') {
            var rowThickness = property.getValue(time);
            if (typeof rowThickness !== 'undefined') {
                lineThickness.x = rowThickness;
            }
        }

        property = this.columnThickness;
        if (typeof property !== 'undefined') {
            var columnThickness = property.getValue(time);
            if (typeof columnThickness !== 'undefined') {
                lineThickness.y = columnThickness;
            }
        }

        return existingMaterial;
    };

    return DynamicGridMaterial;
});