import createTileKey from "./createTileKey.js";
import runLater from "./runLater.js";
import {
  Event,
  GeographicTilingScheme,
  Resource,
  RuntimeError,
} from "@cesium/engine";

function MockImageryProvider() {
  this.tilingScheme = new GeographicTilingScheme();
  this.rectangle = this.tilingScheme.rectangle;
  this.tileWidth = 256;
  this.tileHeight = 256;
  this.errorEvent = new Event();
  this._requestImageWillSucceed = {};
}

MockImageryProvider.prototype.requestImage = function (x, y, level, request) {
  const willSucceed = this._requestImageWillSucceed[createTileKey(x, y, level)];
  if (willSucceed === undefined) {
    return undefined; // defer by default
  }

  return runLater(function () {
    if (willSucceed === true) {
      return Resource.fetchImage("./Data/Images/Green.png");
    } else if (willSucceed === false) {
      throw new RuntimeError("requestImage failed as request.");
    }

    return Promise.resolve(willSucceed).then(function () {
      return Resource.fetchImage("./Data/Images/Green.png");
    });
  });
};

MockImageryProvider.prototype.requestImageWillSucceed = function (
  xOrTile,
  y,
  level
) {
  this._requestImageWillSucceed[createTileKey(xOrTile, y, level)] = true;
  return this;
};

MockImageryProvider.prototype.requestImageWillFail = function (
  xOrTile,
  y,
  level
) {
  this._requestImageWillSucceed[createTileKey(xOrTile, y, level)] = false;
  return this;
};

MockImageryProvider.prototype.requestImageWillDefer = function (
  xOrTile,
  y,
  level
) {
  this._requestImageWillSucceed[createTileKey(xOrTile, y, level)] = undefined;
  return this;
};

MockImageryProvider.prototype.requestImageWillWaitOn = function (
  promise,
  xOrTile,
  y,
  level
) {
  this._requestImageWillSucceed[createTileKey(xOrTile, y, level)] = promise;
  return this;
};
export default MockImageryProvider;
