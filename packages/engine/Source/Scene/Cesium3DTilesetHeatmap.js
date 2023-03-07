import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";

/**
 * A heatmap colorizer in a {@link Cesium3DTileset}. A tileset can colorize its visible tiles in a heatmap style.
 *
 * @alias Cesium3DTilesetHeatmap
 * @constructor
 * @private
 */
function Cesium3DTilesetHeatmap(tilePropertyName) {
  /**
   * The tile variable to track for heatmap colorization.
   * Tile's will be colorized relative to the other visible tile's values for this variable.
   *
   * @type {string}
   */
  this.tilePropertyName = tilePropertyName;

  // Members that are updated every time a tile is colorized
  this._minimum = Number.MAX_VALUE;
  this._maximum = -Number.MAX_VALUE;

  // Members that are updated once every frame
  this._previousMinimum = Number.MAX_VALUE;
  this._previousMaximum = -Number.MAX_VALUE;

  // If defined uses a reference minimum maximum to colorize by instead of using last frames minimum maximum of rendered tiles.
  // For example, the _loadTimestamp can get a better colorization using setReferenceMinimumMaximum in order to take accurate colored timing diffs of various scenes.
  this._referenceMinimum = {};
  this._referenceMaximum = {};
}

/**
 * Convert to a usable heatmap value (i.e. a number). Ensures that tile values that aren't stored as numbers can be used for colorization.
 * @private
 */
function getHeatmapValue(tileValue, tilePropertyName) {
  let value;
  if (tilePropertyName === "_loadTimestamp") {
    value = JulianDate.toDate(tileValue).getTime();
  } else {
    value = tileValue;
  }
  return value;
}

/**
 * Sets the reference minimum and maximum for the variable name. Converted to numbers before they are stored.
 *
 * @param {object} minimum The minimum reference value.
 * @param {object} maximum The maximum reference value.
 * @param {string} tilePropertyName The tile variable that will use these reference values when it is colorized.
 */
Cesium3DTilesetHeatmap.prototype.setReferenceMinimumMaximum = function (
  minimum,
  maximum,
  tilePropertyName
) {
  this._referenceMinimum[tilePropertyName] = getHeatmapValue(
    minimum,
    tilePropertyName
  );
  this._referenceMaximum[tilePropertyName] = getHeatmapValue(
    maximum,
    tilePropertyName
  );
};

function getHeatmapValueAndUpdateMinimumMaximum(heatmap, tile) {
  const tilePropertyName = heatmap.tilePropertyName;
  if (defined(tilePropertyName)) {
    const heatmapValue = getHeatmapValue(
      tile[tilePropertyName],
      tilePropertyName
    );
    if (!defined(heatmapValue)) {
      heatmap.tilePropertyName = undefined;
      return heatmapValue;
    }
    heatmap._maximum = Math.max(heatmapValue, heatmap._maximum);
    heatmap._minimum = Math.min(heatmapValue, heatmap._minimum);
    return heatmapValue;
  }
}

const heatmapColors = [
  new Color(0.1, 0.1, 0.1, 1), // Dark Gray
  new Color(0.153, 0.278, 0.878, 1), // Blue
  new Color(0.827, 0.231, 0.49, 1), // Pink
  new Color(0.827, 0.188, 0.22, 1), // Red
  new Color(1.0, 0.592, 0.259, 1), // Orange
  new Color(1.0, 0.843, 0.0, 1),
]; // Yellow
/**
 * Colorize the tile in heat map style based on where it lies within the minimum maximum window.
 * Heatmap colors are black, blue, pink, red, orange, yellow. 'Cold' or low numbers will be black and blue, 'Hot' or high numbers will be orange and yellow,
 * @param {Cesium3DTile} tile The tile to colorize relative to last frame's minimum and maximum values of all visible tiles.
 * @param {FrameState} frameState The frame state.
 */
Cesium3DTilesetHeatmap.prototype.colorize = function (tile, frameState) {
  const tilePropertyName = this.tilePropertyName;
  if (
    !defined(tilePropertyName) ||
    !tile.contentAvailable ||
    tile._selectedFrame !== frameState.frameNumber
  ) {
    return;
  }

  const heatmapValue = getHeatmapValueAndUpdateMinimumMaximum(this, tile);
  const minimum = this._previousMinimum;
  const maximum = this._previousMaximum;

  if (minimum === Number.MAX_VALUE || maximum === -Number.MAX_VALUE) {
    return;
  }

  // Shift the minimum maximum window down to 0
  const shiftedMax = maximum - minimum + CesiumMath.EPSILON7; // Prevent divide by 0
  const shiftedValue = CesiumMath.clamp(
    heatmapValue - minimum,
    0.0,
    shiftedMax
  );

  // Get position between minimum and maximum and convert that to a position in the color array
  const zeroToOne = shiftedValue / shiftedMax;
  const lastIndex = heatmapColors.length - 1.0;
  const colorPosition = zeroToOne * lastIndex;

  // Take floor and ceil of the value to get the two colors to lerp between, lerp using the fractional portion
  const colorPositionFloor = Math.floor(colorPosition);
  const colorPositionCeil = Math.ceil(colorPosition);
  const t = colorPosition - colorPositionFloor;
  const colorZero = heatmapColors[colorPositionFloor];
  const colorOne = heatmapColors[colorPositionCeil];

  // Perform the lerp
  const finalColor = Color.clone(Color.WHITE);
  finalColor.red = CesiumMath.lerp(colorZero.red, colorOne.red, t);
  finalColor.green = CesiumMath.lerp(colorZero.green, colorOne.green, t);
  finalColor.blue = CesiumMath.lerp(colorZero.blue, colorOne.blue, t);
  tile._debugColor = finalColor;
};

/**
 * Resets the tracked minimum maximum values for heatmap colorization. Happens right before tileset traversal.
 */
Cesium3DTilesetHeatmap.prototype.resetMinimumMaximum = function () {
  // For heat map colorization
  const tilePropertyName = this.tilePropertyName;
  if (defined(tilePropertyName)) {
    const referenceMinimum = this._referenceMinimum[tilePropertyName];
    const referenceMaximum = this._referenceMaximum[tilePropertyName];
    const useReference = defined(referenceMinimum) && defined(referenceMaximum);
    this._previousMinimum = useReference ? referenceMinimum : this._minimum;
    this._previousMaximum = useReference ? referenceMaximum : this._maximum;
    this._minimum = Number.MAX_VALUE;
    this._maximum = -Number.MAX_VALUE;
  }
};
export default Cesium3DTilesetHeatmap;
