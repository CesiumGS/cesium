define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/JulianDate',
        '../Core/Math'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        JulianDate,
        CesiumMath) {
    'use strict';

    /**
     * A heatmap colorizer in a {@link Cesium3DTileset}. A tileset can colorize its visible tiles in a heatmap style.
     *
     * @alias Cesium3DTilesetHeatmap
     * @constructor
     * @private
     */
    function Cesium3DTilesetHeatmap(heatmapVariable) {
        /**
         * The tile variable to track for heatmap colorization.
         * Tile's will be colorized relative to the other visible tile's values for this variable.
         *
         * @type {String}
         */
        this.variableName = heatmapVariable;

        // Members that are updated every time a tile is colorized
        this._min = Number.MAX_VALUE;
        this._max = -Number.MAX_VALUE;

        // Members that are updated once every frame
        this._previousMin = Number.MAX_VALUE;
        this._previousMax = -Number.MAX_VALUE;

        // If defined uses a reference min max to colorize by instead of using last frames min max of rendered tiles.
        // For example, the _loadTimestamp can get a better colorization using setReferenceMinMax in order to take accurate colored timing diffs of various scenes.
        this._referenceMin = { };
        this._referenceMax = { };
    }

    /**
     * Convert to a usable heatmap value (i.e. a number). Ensures that tile values that aren't stored as numbers can be used for colorization.
     */
     function getHeatmapValue(tileValue, variableName) {
        var value;
        if (variableName === '_loadTimestamp') {
            value = JulianDate.toDate(tileValue).getTime();
        } else {
            value = tileValue;
        }
        return value;
    }

    /**
     * Sets the reference min and max for the variable name. Converted to numbers before they are stored.
     *
     * @param {Object} min The min reference value.
     * @param {Object} max The max reference value.
     * @param {String} variableName The tile variable that will use these reference values when it is colorized.
     */
    Cesium3DTilesetHeatmap.prototype.setReferenceMinMax = function(min, max, variableName) {
        this._referenceMin[variableName] = getHeatmapValue(min, variableName);
        this._referenceMax[variableName] = getHeatmapValue(max, variableName);
    };

    function updateMinMax(heatmap, tile) {
        var variableName = heatmap.variableName;
        if (defined(variableName)) {
            var heatmapValue = getHeatmapValue(tile[variableName], variableName);
            if (!defined(heatmapValue)) {
                heatmap.variableName = undefined;
                return heatmapValue;
            }
            heatmap._max = Math.max(heatmapValue, heatmap._max);
            heatmap._min = Math.min(heatmapValue, heatmap._min);
            return heatmapValue;
        }
    }

    var heatmapColors = [new Color(0.000, 0.000, 0.000, 1),  // Black
                         new Color(0.153, 0.278, 0.878, 1),  // Blue
                         new Color(0.827, 0.231, 0.490, 1),  // Pink
                         new Color(0.827, 0.188, 0.220, 1),  // Red
                         new Color(1.000, 0.592, 0.259, 1),  // Orange
                         new Color(1.000, 0.843, 0.000, 1)]; // Yellow
    /**
     * Colorize the tile in heat map style based on where it lies within the min max window.
     * Heatmap colors are black, blue, pink, red, orange, yellow. 'Cold' or low numbers will be black and blue, 'Hot' or high numbers will be orange and yellow,
     * @param {Cesium3DTile} tile The tile to colorize relative to last frame's min and max values of all visible tiles.
     * @param {FrameState} frameState The frame state.
     */
    Cesium3DTilesetHeatmap.prototype.colorize = function (tile, frameState) {
        var variableName = this.variableName;
        if (!defined(variableName) || !tile.contentAvailable || tile._selectedFrame !== frameState.frameNumber) {
            return;
        }

        var heatmapValue = updateMinMax(this, tile);
        var min = this._previousMin;
        var max = this._previousMax;
        if (min === Number.MAX_VALUE || max === -Number.MAX_VALUE) {
            return;
        }

        // Shift the min max window down to 0
        var shiftedMax = (max - min) + CesiumMath.EPSILON7; // Prevent divide by 0
        var shiftedValue = CesiumMath.clamp(heatmapValue - min, 0, shiftedMax);

        // Get position between min and max and convert that to a position in the color array
        var zeroToOne = shiftedValue / shiftedMax;
        var lastIndex = heatmapColors.length - 1;
        var colorPosition = zeroToOne * lastIndex;

        // Take floor and ceil of the value to get the two colors to lerp between, lerp using the fractional portion
        var colorPositionFloor = Math.floor(colorPosition);
        var colorPositionCeil = Math.ceil(colorPosition);
        var t = colorPosition - colorPositionFloor;
        var colorZero = heatmapColors[colorPositionFloor];
        var colorOne = heatmapColors[colorPositionCeil];

        // Perform the lerp
        var finalColor = new Color(1,1,1,1);
        finalColor.red = CesiumMath.lerp(colorZero.red, colorOne.red, t);
        finalColor.green = CesiumMath.lerp(colorZero.green, colorOne.green, t);
        finalColor.blue = CesiumMath.lerp(colorZero.blue, colorOne.blue, t);
        tile._debugColor = finalColor;
    };

    /**
     * Resets the tracked min max values for heatmap colorization. Happens right before tileset traversal.
     */
    Cesium3DTilesetHeatmap.prototype.resetMinMax = function() {
        // For heat map colorization
        var variableName = this.variableName;
        if (defined(variableName)) {
            var referenceMin = this._referenceMin[variableName];
            var referenceMax = this._referenceMax[variableName];
            var useReference = defined(referenceMin) && defined(referenceMax);
            this._previousMin = useReference ? referenceMin : this._min;
            this._previousMax = useReference ? referenceMax : this._max;
            this._min = Number.MAX_VALUE;
            this._max = -Number.MAX_VALUE;
        }
    };

    Cesium3DTilesetHeatmap.prototype.isDestroyed = function() {
        return false;
    };

    Cesium3DTilesetHeatmap.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Cesium3DTilesetHeatmap;
});
