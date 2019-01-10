define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math'
    ], function(
        Color,
        defined,
        destroyObject,
        CesiumMath) {
    'use strict';

    /**
     * A heatmap colorizer in a {@link Cesium3DTileset}. A tileset can colorize its visible tiles in a heatmap style.
     *
     * @alias Cesium3DTilesetHeatmap
     * @constructor
     */
    function Cesium3DTilesetHeatmap() {
        /**
         * The tile variable to track for heatmap colorization.
         * Tile's will be colorized relative to the other visible tile's values for this variable.
         *
         * @type {String}
         */
        this.heatMapVariable = undefined;

        // Members that are updated every time a tile is colorized
        this._minHeatMap = Number.MAX_VALUE;
        this._maxHeatMap = -Number.MAX_VALUE;

        // Members that are updated once every frame
        this._previousMinHeatMap = Number.MAX_VALUE;
        this._previousMaxHeatMap = -Number.MAX_VALUE;
    }

     /**
     * @private
     */
    Cesium3DTilesetHeatmap.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * @private
     */
    Cesium3DTilesetHeatmap.prototype.destroy = function() {
        return destroyObject(this);
    };

    function updateHeatMapMinMax(tile) {
        var variableName = this.heatMapVariable;
        if (defined(variableName)) {
            var tileValue = tile[variableName];
            if (!defined(tileValue)) {
                this.heatMapVariable = undefined;
                return;
            }
            this._maxHeatMap = Math.max(tileValue, this._maxHeatMap);
            this._minHeatMap = Math.min(tileValue, this._minHeatMap);
        }
    }

    var heatMapColors = [new Color(0,0,0,1),
                         new Color(0,0,1,1),
                         new Color(0,1,0,1),
                         new Color(1,0,0,1),
                         new Color(1,1,1,1)];
    /**
     * Colorize the tile in heat map style base on where it lies within the min max window.
     * Heatmap colors are black, blue, green, red, white. 'Cold' or low numbers will be black and blue, 'Hot' or high numbers will be red and white,
     * @param {Cesium3DTile} tile The tile to colorize relative to last frames min and max values of all visible tiles.
     * @param {FrameState} frameState The frame state.
     *
     * @private
     */
    Cesium3DTilesetHeatmap.prototype.heatMapColorize = function (tile, frameState) {
        var variableName = this.heatMapVariable;
        if (!defined(variableName) || !tile.contentAvailable || tile._selectedFrame !== frameState.frameNumber) {
            return;
        }

        updateHeatMapMinMax(tile);
        var min = this._previousMinHeatMap;
        var max = this._previousMaxHeatMap;
        if (min === Number.MAX_VALUE || max === -Number.MAX_VALUE) {
            return;
        }

        // Shift the min max window down to 0
        var shiftedMax = (max - min) + CesiumMath.EPSILON7; // Prevent divide by 0
        var tileValue = tile[variableName];
        var shiftedValue = CesiumMath.clamp(tileValue - min, 0, shiftedMax);

        // Get position between min and max and convert that to a position in the color array
        var zeroToOne = shiftedValue / shiftedMax;
        var lastIndex = heatMapColors.length - 1;
        var colorPosition = zeroToOne * lastIndex;

        // Take floor and ceil of the value to get the two colors to lerp between, lerp using the fractional portion
        var colorPositionFloor = Math.floor(colorPosition);
        var colorPositionCeil = Math.ceil(colorPosition);
        var t = colorPosition - colorPositionFloor;
        var colorZero = heatMapColors[colorPositionFloor];
        var colorOne = heatMapColors[colorPositionCeil];

        // Perform the lerp
        var finalColor = new Color(1,1,1,1);
        finalColor.red = CesiumMath.lerp(colorZero.red, colorOne.red, t);
        finalColor.green = CesiumMath.lerp(colorZero.green, colorOne.green, t);
        finalColor.blue = CesiumMath.lerp(colorZero.blue, colorOne.blue, t);
        tile.color = finalColor;
    };

    /**
     * Resets the tracked min max values for heatmap colorization. Happens right before tileset traversal.
     *
     * @private
     */
    Cesium3DTilesetHeatmap.prototype.resetAllMinMax = function() {
        // For heat map colorization
        var variableName = this.heatMapVariable;
        if (defined(variableName)) {
            this._previousMinHeatMap = this._minHeatMap;
            this._previousMaxHeatMap = this._maxHeatMap;
            this._minHeatMap = Number.MAX_VALUE;
            this._maxHeatMap = -Number.MAX_VALUE;
        }
    };

    return Cesium3DTilesetHeatmap;
});
