import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import ImageryState from "./ImageryState.js";

/**
 * Stores details about a tile of imagery.
 *
 * @alias Imagery
 * @private
 */
function Imagery(imageryLayer, x, y, level, rectangle) {
  this.imageryLayer = imageryLayer;
  this.x = x;
  this.y = y;
  this.level = level;
  this.request = undefined;

  if (level !== 0) {
    const parentX = (x / 2) | 0;
    const parentY = (y / 2) | 0;
    const parentLevel = level - 1;
    this.parent = imageryLayer.getImageryFromCache(
      parentX,
      parentY,
      parentLevel
    );
  }

  this.state = ImageryState.UNLOADED;
  this.imageUrl = undefined;
  this.image = undefined;
  this.texture = undefined;
  this.textureWebMercator = undefined;
  this.credits = undefined;
  this.referenceCount = 0;

  if (!defined(rectangle) && imageryLayer.ready) {
    const tilingScheme = imageryLayer.imageryProvider.tilingScheme;
    rectangle = tilingScheme.tileXYToRectangle(x, y, level);
  }

  this.rectangle = rectangle;
}
Imagery.createPlaceholder = function (imageryLayer) {
  const result = new Imagery(imageryLayer, 0, 0, 0);
  result.addReference();
  result.state = ImageryState.PLACEHOLDER;
  return result;
};

Imagery.prototype.addReference = function () {
  ++this.referenceCount;
};

Imagery.prototype.releaseReference = function () {
  --this.referenceCount;

  if (this.referenceCount === 0) {
    this.imageryLayer.removeImageryFromCache(this);

    if (defined(this.parent)) {
      this.parent.releaseReference();
    }

    if (defined(this.image) && defined(this.image.destroy)) {
      this.image.destroy();
    }

    if (defined(this.texture)) {
      this.texture.destroy();
    }

    if (
      defined(this.textureWebMercator) &&
      this.texture !== this.textureWebMercator
    ) {
      this.textureWebMercator.destroy();
    }

    destroyObject(this);

    return 0;
  }

  return this.referenceCount;
};

Imagery.prototype.processStateMachine = function (
  frameState,
  needGeographicProjection,
  skipLoading
) {
  if (this.state === ImageryState.UNLOADED && !skipLoading) {
    this.state = ImageryState.TRANSITIONING;
    this.imageryLayer._requestImagery(this);
  }

  if (this.state === ImageryState.RECEIVED) {
    this.state = ImageryState.TRANSITIONING;
    this.imageryLayer._createTexture(frameState.context, this);
  }

  // If the imagery is already ready, but we need a geographic version and don't have it yet,
  // we still need to do the reprojection step. This can happen if the Web Mercator version
  // is fine initially, but the geographic one is needed later.
  const needsReprojection =
    this.state === ImageryState.READY &&
    needGeographicProjection &&
    !this.texture;

  if (this.state === ImageryState.TEXTURE_LOADED || needsReprojection) {
    this.state = ImageryState.TRANSITIONING;
    this.imageryLayer._reprojectTexture(
      frameState,
      this,
      needGeographicProjection
    );
  }
};
export default Imagery;
