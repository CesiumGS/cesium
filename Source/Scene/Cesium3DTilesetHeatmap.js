define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Math'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
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

        // _time is an example where it's better to have some fixed reference value. Add any others here. It can help debug other tile member knowing that tiles are colored from a reference min max that you set.
        this._referenceMin = { _time: 0 };
        this._referenceMax = { _time: 10 };
    }

    /**
     * Sets the reference min and max for the variable name.
     *
     * @param {Number} min The min reference value.
     * @param {Number} max The max reference value.
     * @param {String} variableName The tile variable that will use these reference values when it is colorized.
     */
    Cesium3DTilesetHeatmap.prototype.setReferenceMinMax = function(min, max, variableName) {
        this._referenceMin[variableName] = min;
        this._referenceMax[variableName] = max;
    };

    function updateMinMax(heatmap, tile) {
        var variableName = heatmap.variableName;
        if (defined(variableName)) {
            var tileValue = tile[variableName];
            if (!defined(tileValue)) {
                heatmap.variableName = undefined;
                return;
            }
            heatmap._max = Math.max(tileValue, heatmap._max);
            heatmap._min = Math.min(tileValue, heatmap._min);
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

        updateMinMax(this, tile);
        var min = this._previousMin;
        var max = this._previousMax;

        if (min === Number.MAX_VALUE || max === -Number.MAX_VALUE) {
            return;
        }

        // Shift the min max window down to 0
        var shiftedMax = (max - min) + CesiumMath.EPSILON7; // Prevent divide by 0
        var tileValue = tile[variableName];
        var shiftedValue = CesiumMath.clamp(tileValue - min, 0, shiftedMax);

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
     * Determines if reference min max should be used. It will use the reference only if it exists.
     * Either the user set it or it's setup in this file because it's the use case for the particular variable (ex: _time)
     */
     function useReferenceMinMax(heatmap) {
         var variableName = heatmap.variableName;
         return defined(heatmap._referenceMin[variableName]) && defined(heatmap._referenceMax[variableName]);
     }

    /**
     * Resets the tracked min max values for heatmap colorization. Happens right before tileset traversal.
     */
    Cesium3DTilesetHeatmap.prototype.resetMinMax = function() {
        // For heat map colorization
        var variableName = this.variableName;
        if (defined(variableName)) {
            var useReference = useReferenceMinMax(this);
            this._previousMin = useReference ? this._referenceMin[variableName] : this._min;
            this._previousMax = useReference ? this._referenceMax[variableName] : this._max;
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
