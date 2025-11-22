import defined from "../Core/defined.js";

/**
 * @private
 */
function Cesium3DTileStyleEngine() {
  this._style = undefined; // The style provided by the user
  this._styleDirty = false; // true when the style is reassigned
  this._lastStyleTime = 0; // The "time" when the last style was assigned
}

Object.defineProperties(Cesium3DTileStyleEngine.prototype, {
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      if (value === this._style) {
        return;
      }
      this._style = value;
      this._styleDirty = true;
    },
  },
});

Cesium3DTileStyleEngine.prototype.makeDirty = function () {
  this._styleDirty = true;
};

Cesium3DTileStyleEngine.prototype.resetDirty = function () {
  this._styleDirty = false;
};

Cesium3DTileStyleEngine.prototype.applyStyle = function (tileset) {
  if (!defined(tileset.root)) {
    return;
  }

  if (defined(this._style) && !this._style._ready) {
    return;
  }

  const styleDirty = this._styleDirty;

  if (styleDirty) {
    // Increase "time", so the style is applied to all visible tiles
    ++this._lastStyleTime;
  }

  const lastStyleTime = this._lastStyleTime;
  const statistics = tileset._statistics;

  // If a new style was assigned, loop through all the visible tiles; otherwise, loop through
  // only the tiles that are newly visible, i.e., they are visible this frame, but were not
  // visible last frame.  In many cases, the newly selected tiles list will be short or empty.
  const tiles = styleDirty
    ? tileset._selectedTiles
    : tileset._selectedTilesToStyle;
  // PERFORMANCE_IDEA: does mouse-over picking basically trash this?  We need to style on
  // pick, for example, because a feature's show may be false.

  const length = tiles.length;
  for (let i = 0; i < length; ++i) {
    const tile = tiles[i];
    if (tile.lastStyleTime !== lastStyleTime) {
      // Apply the style to this tile if it wasn't already applied because:
      //   1) the user assigned a new style to the tileset
      //   2) this tile is now visible, but it wasn't visible when the style was first assigned
      const content = tile.content;
      tile.lastStyleTime = lastStyleTime;
      content.applyStyle(this._style);
      statistics.numberOfFeaturesStyled += content.featuresLength;
      ++statistics.numberOfTilesStyled;
    }
  }
};
export default Cesium3DTileStyleEngine;
