import defined from "../../Core/defined";
import Rectangle from "../../Core/Rectangle";
import Cartesian4 from "../../Core/Cartesian4";
import ImageryCoverage from "./ImageryCoverage";

// TODO_DRAPING: Some of this was extracted from ImageryLayer.prototype._createTileImagerySkeletons
// See https://github.com/CesiumGS/cesium/blob/5eaa2280f495d8f300d9e1f0497118c97aec54c8/packages/engine/Source/Scene/ImageryLayer.js#L700
// Some of this makes assumptions about the projection. This was originally
// handled with the `useWebMercatorT` flag that was passed along and ended
// up in certain differences in the shaders. The hope is that this can either
// be abstracted away using a `MapProjection` and/or computing only the
// right texture coordinates for the respective projection to begin with.

// TODO_DRAPING Preliminary, internal class for texture
// coordinate and index range computations. This could
// be emulated with a "BoundingRectangle", but min/max
// is often more convenient than min/size.
class CartesianRectangle {
  constructor() {
    this.minY = 0;
    this.maxX = 0;
    this.maxY = 0;
    this.minX = 0;
  }
}

const imageryBoundsScratch = new Rectangle();
const overlappedRectangleScratch = new Rectangle();
const clippedRectangleScratch = new Rectangle();
const nativeInputRectangleScratch = new Rectangle();
const nativeImageryBoundsScratch = new Rectangle();
const nativeClippedImageryBoundsScratch = new Rectangle();
const textureCoordinateCartesianRectangleScratch = new CartesianRectangle();

/**
 * A class that can compute the parts of imagery that are covered
 * by a rectangle.
 *
 * This was extracted from ImageryLayer.prototype._createTileImagerySkeletons
 * Fun and easy, just like extracting eggs from an omelette.
 * Now there are many functions, so we need more unit tests.
 */
class ImageryCoverageComputations {
  /**
   * Computes the <code>ImageryCoverage</code> objects that describe the imagery
   * tiles and the respective texture coordinates that are covered by the given
   * input rectangle in the given imagery data.
   *
   * The given imagery level will be clamped if necessary, to be in the valid
   * range for the imagery provider of the given imagery layer.
   *
   * @param {Rectangle} inputRectangle The input rectangle (e.g. tile bounds)
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {number} inputImageryLevel The level for which the imagery coverage
   * should be computed.
   * @returns {ImageryCoverage[]} The objects describing the covered imagery
   * and the respective texture coordinates
   */
  static createImageryCoverages(
    inputRectangle,
    imageryLayer,
    inputImageryLevel,
  ) {
    const imageryProvider = imageryLayer.imageryProvider;
    const imageryLevel = ImageryCoverageComputations._validateImageryLevel(
      imageryProvider,
      inputImageryLevel,
    );

    // Compute the range, in integer coordinates, of imagery
    // tiles that are covered by the input rectangle
    const imageryBounds = Rectangle.intersection(
      imageryProvider.rectangle,
      imageryLayer.rectangle,
      imageryBoundsScratch,
    );
    const imageryTilingScheme = imageryProvider.tilingScheme;
    const imageryRange = ImageryCoverageComputations._computeImageryRange(
      inputRectangle,
      imageryBounds,
      imageryTilingScheme,
      imageryLevel,
    );

    // TODO_DRAPING Extracted from _createTileImagerySkeletons:
    // Convert the input rectangle and the imagery bounds into
    // the native coordinate system of the tiling scheme
    const nativeInputRectangle = nativeInputRectangleScratch;
    imageryTilingScheme.rectangleToNativeRectangle(
      inputRectangle,
      nativeInputRectangle,
    );
    const nativeImageryBounds = nativeImageryBoundsScratch;
    imageryTilingScheme.rectangleToNativeRectangle(
      imageryBounds,
      nativeImageryBounds,
    );

    // A function that returns an imagery rectangle, based on (x, y, level),
    // clipped to the imagery bounds (or undefined if there is no intersection
    // between the imagery rectangle and the bounds)
    const computeClippedImageryRectangle = (x, y, level) => {
      const localImageryRectangle = imageryTilingScheme.tileXYToRectangle(
        x,
        y,
        level,
      );
      const localClippedImageryRectangle = Rectangle.intersection(
        localImageryRectangle,
        imageryBounds,
        clippedRectangleScratch,
      );
      if (!defined(localClippedImageryRectangle)) {
        return undefined;
      }
      const nativeClippedImageryBounds = nativeClippedImageryBoundsScratch;
      imageryTilingScheme.rectangleToNativeRectangle(
        localClippedImageryRectangle,
        nativeClippedImageryBounds,
      );
      return nativeClippedImageryBounds;
    };

    const imageryCoverages =
      ImageryCoverageComputations._computeImageryCoverages(
        imageryRange,
        imageryLevel,
        nativeInputRectangle,
        computeClippedImageryRectangle,
      );
    return imageryCoverages;
  }

  /**
   * Validate the given imagery level against the constraints of the
   * given imagery provider.
   *
   * This will clamp the given level to be in the range
   * <code>[minimumLevel, maximumLevel)</code> that is
   * defined by the given imagery provider (and cut off
   * any fractional part that the input may have)
   *
   * @param {ImageryProvider} imageryProvider The imagery provider
   * @param {number} imageryLevel The imagery level
   * @returns {number} The validated level
   */
  static _validateImageryLevel(imageryProvider, imageryLevel) {
    const minimumLevel = imageryProvider.minimumLevel ?? 0;
    const maximumLevel =
      imageryProvider.maximumLevel ?? Number.POSITIVE_INFINITY;
    const clampedImageryLevel = Math.min(
      maximumLevel,
      Math.max(minimumLevel, imageryLevel),
    );
    const validImageryLevel = Math.floor(clampedImageryLevel);
    return validImageryLevel;
  }

  /**
   * Compute the rectangle describing the range of imagery that is covered
   * with the given rectangle.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   *
   * This will compute a rectangle with integer coordinates that describe
   * the X/Y coordinates of the imagery that is overlapped by the given
   * input rectangle, based on the given imagery rectangle.
   *
   * @param {Rectangle} inputRectangle The input rectangle
   * @param {Rectangle} imageryBounds The imagery bounds
   * @param {TilingScheme} imageryTilingScheme The tiling scheme
   * @param {number} imageryLevel The imagery level
   * @returns {CartesianRectangle} The rectangle
   */
  static _computeImageryRange(
    inputRectangle,
    imageryBounds,
    imageryTilingScheme,
    imageryLevel,
  ) {
    const overlappedRectangle =
      ImageryCoverageComputations._computeOverlappedRectangle(
        inputRectangle,
        imageryBounds,
      );
    const northwestTileCoordinates = imageryTilingScheme.positionToTileXY(
      Rectangle.northwest(overlappedRectangle),
      imageryLevel,
    );
    const southeastTileCoordinates = imageryTilingScheme.positionToTileXY(
      Rectangle.southeast(overlappedRectangle),
      imageryLevel,
    );

    const result = new CartesianRectangle();
    result.minX = northwestTileCoordinates.x;
    result.minY = northwestTileCoordinates.y;
    result.maxX = southeastTileCoordinates.x;
    result.maxY = southeastTileCoordinates.y;

    // XXX_DRAPING Debug log
    //console.log("  northwestTileCoordinates ", northwestTileCoordinates);
    //console.log("  southeastTileCoordinates ", southeastTileCoordinates);
    //console.log("  result before veryClose  ", result);

    // TODO_DRAPING Extracted from _createTileImagerySkeletons:
    // If the southeast corner of the rectangle lies very close to the north or west side
    // of the southeast tile, we don't actually need the southernmost or easternmost
    // tiles.
    // Similarly, if the northwest corner of the rectangle lies very close to the south or east side
    // of the northwest tile, we don't actually need the northernmost or westernmost tiles.
    // We define "very close" as being within 1/512 of the width of the tile.
    const veryCloseX = inputRectangle.width / 512.0;
    const veryCloseY = inputRectangle.height / 512.0;

    const northwestTileRectangle = imageryTilingScheme.tileXYToRectangle(
      result.minX,
      result.minY,
      imageryLevel,
    );
    const deltaNorth = Math.abs(
      northwestTileRectangle.south - inputRectangle.north,
    );
    if (deltaNorth < veryCloseY && result.minY < result.maxY) {
      ++result.minY;
    }
    const deltaWest = Math.abs(
      northwestTileRectangle.east - inputRectangle.west,
    );
    if (deltaWest < veryCloseX && result.minX < result.maxX) {
      ++result.minX;
    }

    const southeastTileRectangle = imageryTilingScheme.tileXYToRectangle(
      result.maxX,
      result.maxY,
      imageryLevel,
    );
    const deltaSouth = Math.abs(
      southeastTileRectangle.north - inputRectangle.south,
    );
    if (deltaSouth < veryCloseY && result.maxY > result.minY) {
      --result.maxY;
    }
    const deltaEast = Math.abs(
      southeastTileRectangle.west - inputRectangle.east,
    );
    if (deltaEast < veryCloseX && result.maxX > result.minX) {
      --result.maxX;
    }

    // XXX_DRAPING Debug log
    //console.log("  result after  veryClose  ", result);

    return result;
  }

  /**
   * Clamp the given input rectangle to the given clamp rectangle.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   *
   * If the input rectangle is completely above/below or left/right
   * of the clamp rectangle, then the north/south or east/east
   * if the clamp rectangle will be used in the result.
   *
   * @param {Rectangle} input The input rectangle
   * @param {Rectangle} clamp The clamping rectangle
   * @param {Rectangle} [result] The result
   * @returns {Rectangle} The result
   */
  static _clampRectangle(input, clamp, result) {
    if (!defined(result)) {
      result = new Rectangle();
    }
    if (input.south >= clamp.north) {
      result.north = result.south = clamp.north;
    } else if (input.north <= clamp.south) {
      result.north = result.south = clamp.south;
    } else {
      result.south = Math.max(input.south, clamp.south);
      result.north = Math.min(input.north, clamp.north);
    }

    if (input.west >= clamp.east) {
      result.west = result.east = clamp.east;
    } else if (input.east <= clamp.west) {
      result.west = result.east = clamp.west;
    } else {
      result.west = Math.max(input.west, clamp.west);
      result.east = Math.min(input.east, clamp.east);
    }
    return result;
  }

  /**
   * Compute the rectangle of the imagery from the imageryProvider that overlaps
   * the input.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   *
   * @param {Rectangle} inputRectangle The input
   * @param {Rectangle} imageryBounds The imagery bounds
   * @returns {Rectangle} The rectangle
   */
  static _computeOverlappedRectangle(inputRectangle, imageryBounds) {
    const overlappedRectangle = Rectangle.intersection(
      inputRectangle,
      imageryBounds,
      overlappedRectangleScratch,
    );
    if (defined(overlappedRectangle)) {
      return overlappedRectangle;
    }
    return ImageryCoverageComputations._clampRectangle(
      inputRectangle,
      imageryBounds,
      overlappedRectangleScratch,
    );
  }

  /**
   * Computes the `ImageryCoverage` objects that describe the imagery and
   * the texture coordinates that are contained in the given range of
   * imagery tile coordinates, referring to the given input rectangle.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   *
   * @param {CartesianRectangle} imageryRange The range of imagery tile coordinates
   * @param {number} imageryLevel The imagery level
   * @param {Rectangle} nativeInputRectangle The input rectangle, in coordinates
   * that are native for the tiling scheme
   * @param {Function} computeClippedImageryRectangle A function that returns
   * an imagery rectangle, based on (x, y, level), clipped to the imagery bounds
   * (or undefined if there is no intersection between the imagery rectangle
   * and the bounds)
   * @returns {ImageryCoverage[]} The objects describing the covered imagery
   * and the respective texture coordinates
   */
  static _computeImageryCoverages(
    imageryRange,
    imageryLevel,
    nativeInputRectangle,
    computeClippedImageryRectangle,
  ) {
    const imageryCoverages = [];

    for (let i = imageryRange.minX; i <= imageryRange.maxX; i++) {
      const clippedImageryRectangleU = computeClippedImageryRectangle(
        i,
        imageryRange.maxY,
        imageryLevel,
      );

      if (!defined(clippedImageryRectangleU)) {
        continue;
      }

      for (let j = imageryRange.minY; j <= imageryRange.maxY; j++) {
        const clippedImageryRectangleV = computeClippedImageryRectangle(
          i,
          j,
          imageryLevel,
        );

        if (!defined(clippedImageryRectangleV)) {
          continue;
        }

        const textureCoordinateCartesianRectangle =
          ImageryCoverageComputations._localizeToCartesianRectangle(
            clippedImageryRectangleV,
            nativeInputRectangle,
            textureCoordinateCartesianRectangleScratch,
          );

        const textureCoordinateRectangle = new Cartesian4(
          textureCoordinateCartesianRectangle.minX,
          textureCoordinateCartesianRectangle.minY,
          textureCoordinateCartesianRectangle.maxX,
          textureCoordinateCartesianRectangle.maxY,
        );

        const imageryCoverage = new ImageryCoverage(
          i,
          j,
          imageryLevel,
          textureCoordinateRectangle,
        );
        imageryCoverages.push(imageryCoverage);
      }
    }
    return imageryCoverages;
  }

  /**
   * Compute the coordinates of the first rectangle relative to the
   * second rectangle.
   *
   * The result will describe the bounds of the first rectangle
   * in coordinates that are relative to the (south,west) and
   * (width, height) of the second rectangle. This is suitable
   * for describing the texture coordinates of the first
   * rectangle within the second one.
   *
   * The result will be stored in the given result parameter, or
   * in a new rectangle if the result was undefined.
   *
   * @param {Rectangle} rectangleA The first rectangle
   * @param {Rectangle} rectangleB The second rectangle
   * @param {CartesianRectangle} [result] The result
   * @returns {CartesianRectangle} The result
   */
  static _localizeToCartesianRectangle(rectangleA, rectangleB, result) {
    if (result === undefined) {
      result = new CartesianRectangle();
    }
    const invX = 1.0 / rectangleB.width;
    const invY = 1.0 / rectangleB.height;
    result.minX = (rectangleA.west - rectangleB.west) * invX;
    result.minY = (rectangleA.south - rectangleB.south) * invY;
    result.maxX = (rectangleA.east - rectangleB.west) * invX;
    result.maxY = (rectangleA.north - rectangleB.south) * invY;
    return result;
  }
}

export default ImageryCoverageComputations;
