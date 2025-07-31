import defined from "../../Core/defined.js";
import CesiumMath from "../../Core/Math.js";
import Rectangle from "../../Core/Rectangle.js";

import CartesianRectangle from "./CartesianRectangle.js";

const imageryBoundsScratch = new Rectangle();
const overlappedRectangleScratch = new Rectangle();
const clippedRectangleScratch = new Rectangle();
const nativeInputRectangleScratch = new Rectangle();
//const nativeImageryBoundsScratch = new Rectangle(); XXX_DRAPING unused
const nativeClippedImageryBoundsScratch = new Rectangle();

/**
 * A class containing information about a piece of imagery.
 *
 * This represents the result of computing the imagery tiles that
 * are covered by a given <code>Rectangle</code> (and which part
 * of that imagery is covered, in terms of texture coordinates).
 *
 * This class represents a plain structure, without member functions.
 * Instances are created with the <code>createImageryCoverages</code>
 * function.
 *
 * The instances are used by the <code>ModelPrimitiveImagery</code>, to
 * represent the imagery tiles that are covered by the cartographic
 * bounding rectangle of the primitive positions.
 *
 * Implementation note for ImageryCoverage:
 *
 * Some of the static functions in this class have been extracted from
 * <code>ImageryLayer.prototype._createTileImagerySkeletons</code>
 * See https://github.com/CesiumGS/cesium/blob/5eaa2280f495d8f300d9e1f0497118c97aec54c8/packages/engine/Source/Scene/ImageryLayer.js#L700
 * An instance of this class roughly corresponds to the <code>TileImagery</code>
 * that is created there. Questions about the implementation here should
 * be addressed to the original author.
 *
 * @private
 */
class ImageryCoverage {
  /**
   * Creates a new instance.
   *
   * @param {number} x x-coordinate of the imagery tile
   * @param {number} y y-coordinate of the imagery tile
   * @param {number} level level of the imagery tile
   * @param {CartesianRectangle} textureCoordinateRectangle The texture coordinate
   * rectangle from the imagery tile that is covered
   * @param {Imagery} imagery The imagery
   */
  constructor(x, y, level, textureCoordinateRectangle, imagery) {
    this._x = x;
    this._y = y;
    this._level = level;
    this._textureCoordinateRectangle = textureCoordinateRectangle;
    this._imagery = imagery;
  }

  /**
   * The x-coordinate of the imagery tile, typically correlated with longitude
   *
   * @type {number}
   * @readonly
   */
  get x() {
    return this._x;
  }

  /**
   * The y-coordinate of the imagery tile, typically correlated with latitude
   *
   * @type {number}
   * @readonly
   */
  get y() {
    return this._y;
  }

  /**
   * The level of the imagery tile
   *
   * @type {number}
   * @readonly
   */
  get level() {
    return this._level;
  }

  /**
   * The texture coordinate range that is covered from the
   * imagery tile.
   *
   * This is a <code>CartesianRectangle</code> that contains the
   * (minU, minV, maxU, maxV) coordinate range.
   *
   * Clients may not modify the returned instance.
   *
   * @type {CartesianRectangle}
   * @readonly
   */
  get textureCoordinateRectangle() {
    return this._textureCoordinateRectangle;
  }

  /**
   * Returns the imagery
   *
   * @type {Imagery}
   * @readonly
   */
  get imagery() {
    return this._imagery;
  }

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
    if (!imageryLayer.show) {
      return [];
    }

    const imageryProvider = imageryLayer.imageryProvider;
    const imageryLevel = ImageryCoverage._clampImageryLevel(
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
    const imageryRange = ImageryCoverage._computeImageryRange(
      inputRectangle,
      imageryBounds,
      imageryTilingScheme,
      imageryLevel,
    );

    // Convert the input rectangle and the imagery bounds into
    // the native coordinate system of the tiling scheme
    const nativeInputRectangle = nativeInputRectangleScratch;
    imageryTilingScheme.rectangleToNativeRectangle(
      inputRectangle,
      nativeInputRectangle,
    );

    // XXX_DRAPING Was unused?
    /*
    const nativeImageryBounds = nativeImageryBoundsScratch;
    imageryTilingScheme.rectangleToNativeRectangle(
      imageryBounds,
      nativeImageryBounds,
    );
    */

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

    const imageryCoverages = ImageryCoverage._computeImageryCoverages(
      imageryLayer,
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
  static _clampImageryLevel(imageryProvider, imageryLevel) {
    const minimumLevel = imageryProvider.minimumLevel ?? 0;
    const maximumLevel =
      imageryProvider.maximumLevel ?? Number.POSITIVE_INFINITY;
    const clampedImageryLevel = Math.min(
      maximumLevel - 1,
      Math.max(minimumLevel, imageryLevel),
    );
    const validImageryLevel = Math.floor(clampedImageryLevel);
    return validImageryLevel;
  }

  /**
   * Compute the rectangle describing the range of imagery that is covered
   * with the given rectangle.
   *
   * This will compute a rectangle with integer coordinates that describe
   * the X/Y coordinates of the imagery that is overlapped by the given
   * input rectangle, based on the given imagery rectangle.
   *
   * This was largely extracted from _createTileImagerySkeletons.
   *
   * Note that the resulting rectangle will always obey the `minX<=maxX`
   * constraint, but `maxX` may be larger than the number of tiles along
   * x in the given imagery level. The receiver is responsible for
   * wrapping the results into the valid range.
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
    const overlappedRectangle = ImageryCoverage._computeOverlappedRectangle(
      inputRectangle,
      imageryBounds,
    );

    // XXX_DRAPING: The wrapping that is happening here has to be
    // verified. The "computeOverlappedRectangle" is doing some
    // obscure "clamping" under certain conditions, as extracted
    // from "_createTileImagerySkeletons", which may cause results
    // that do not make sense here.
    const nw = Rectangle.northwest(overlappedRectangle);
    nw.longitude = CesiumMath.convertLongitudeRange(nw.longitude);
    const northwestTileCoordinates = imageryTilingScheme.positionToTileXY(
      nw,
      imageryLevel,
    );
    const se = Rectangle.southeast(overlappedRectangle);
    se.longitude = CesiumMath.convertLongitudeRange(se.longitude);
    const southeastTileCoordinates = imageryTilingScheme.positionToTileXY(
      se,
      imageryLevel,
    );

    const result = new CartesianRectangle();
    result.minX = northwestTileCoordinates.x;
    result.minY = northwestTileCoordinates.y;
    result.maxX = southeastTileCoordinates.x;
    result.maxY = southeastTileCoordinates.y;

    /*/ XXX_DRAPING We have to get rid of this...
    // As extracted from _createTileImagerySkeletons:
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
    //*/

    // For the case that the inputRectangle crosses the antimeridian,
    // "west" (the westernmost side) may be 179° and "east" (the
    // easternmost side) may be -179°.
    // The "imageryTilingScheme.positionToTileXY" call returns coordinates
    // that are wrapped into the valid range individually (!). This
    // means that the tile x-coordinate for "west" (minX) may be larger
    // than the tile x-coordinate for "east" (maxX). In this case,
    // wrap the "maxX" around, based on the number of tiles along x.
    if (result.minX > result.maxX) {
      const numTilesX =
        imageryTilingScheme.getNumberOfXTilesAtLevel(imageryLevel);
      result.maxX += numTilesX;
    }

    // XXX_DRAPING
    console.log("ImageryCoverage._computeImageryRange: result ", result);

    return result;
  }

  /**
   * Clamp the given input rectangle to the given clamp rectangle.
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
   * Compute overlap between the given input rectangle, and the given
   * bounds that have been obtained from the imagery provider.
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
    return ImageryCoverage._clampRectangle(
      inputRectangle,
      imageryBounds,
      overlappedRectangleScratch,
    );
  }

  /**
   * Computes the <code>ImageryCoverage</code> objects that describe the imagery and
   * the texture coordinates that are contained in the given range of
   * imagery tile coordinates, referring to the given input rectangle.
   *
   * The given imageryRange may contain x-coordinates that are larger than the
   * number of tiles along x for the given imagery level. This method will
   * wrap the coordinates to be in a valid range.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
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
    imageryLayer,
    imageryRange,
    imageryLevel,
    nativeInputRectangle,
    computeClippedImageryRectangle,
  ) {
    const imageryProvider = imageryLayer.imageryProvider;
    const imageryTilingScheme = imageryProvider.tilingScheme;
    const numTilesX =
      imageryTilingScheme.getNumberOfXTilesAtLevel(imageryLevel);

    const imageryCoverages = [];

    for (let rawX = imageryRange.minX; rawX <= imageryRange.maxX; rawX++) {
      let x = rawX;
      if (rawX >= numTilesX) {
        x = rawX % numTilesX;
        /// XXX_DRAPING Debug log
        console.log(
          `ImageryCoverage._computeImageryCoverages: Wrapping ${rawX} to ${x} for ${numTilesX} tiles on level ${imageryLevel}`,
        );
      }

      const clippedImageryRectangleU = computeClippedImageryRectangle(
        x,
        imageryRange.maxY,
        imageryLevel,
      );

      if (!defined(clippedImageryRectangleU)) {
        continue;
      }

      for (let y = imageryRange.minY; y <= imageryRange.maxY; y++) {
        const clippedImageryRectangleV = computeClippedImageryRectangle(
          x,
          y,
          imageryLevel,
        );

        if (!defined(clippedImageryRectangleV)) {
          continue;
        }

        const textureCoordinateRectangle =
          ImageryCoverage._localizeToCartesianRectangle(
            clippedImageryRectangleV,
            nativeInputRectangle,
            undefined,
          );

        // XXX_DRAPING Debug log...
        Rectangle.debugPrintDirectly(
          "ImageryCoverage._computeImageryCoverages: clippedImageryRectangleV",
          clippedImageryRectangleV,
        );
        Rectangle.debugPrintDirectly(
          "ImageryCoverage._computeImageryCoverages: nativeInputRectangle",
          nativeInputRectangle,
        );
        console.log(
          "ImageryCoverage._computeImageryCoverages: textureCoordinateRectangle",
          textureCoordinateRectangle,
        );

        // Note: The getImageryFromCache function will create the whole "chain"
        // of ancestor imageries, up to the root, and increases the reference
        // counter for each of them, even though it is not called
        // getImageryFromCacheAndCreateAllAncestorsAndAddReferences.
        // There is currently no way to have a single imagery, because
        // somewhere in TileImagery, the parent is assumed to be present.
        const imagery = imageryLayer.getImageryFromCache(x, y, imageryLevel);
        const imageryCoverage = new ImageryCoverage(
          x,
          y,
          imageryLevel,
          textureCoordinateRectangle,
          imagery,
        );
        imageryCoverages.push(imageryCoverage);
      }
    }
    return imageryCoverages;
  }

  /**
   * XXX_DRAPING This function does not work for rectangles that have
   * been converted to the "native" representation, because
   * Rectangle.computeWidth is broken for these rectangles
   *
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
    if (!defined(result)) {
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

  /**
   * XXX_DRAPING This function should replace _localizeToCartesianRectangle,
   * but operates on Rectangles that are proper Cartographic rectangles,
   * which is often not the case for the imagery-related computations that
   * have been extracted from _createTileImagerySkeletons
   *
   * Compute the coordinates of the first rectangle relative to the
   * second rectangle.
   *
   * The result will describe the bounds of the first rectangle
   * in coordinates that are relative to the (west, south) and
   * (width, height) of the second rectangle, wrapping the
   * longitude at the antimeridian. This is suitable for
   * describing the texture coordinates of the first
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
  static _localizeCartographicRectanglesToCartesianRectangle(
    rectangleA,
    rectangleB,
    result,
  ) {
    if (!defined(result)) {
      result = new CartesianRectangle();
    }
    const invX = 1.0 / rectangleB.width;
    const invY = 1.0 / rectangleB.height;

    const wa = CesiumMath.zeroToTwoPi(rectangleA.west);
    const ea = CesiumMath.zeroToTwoPi(rectangleA.east);
    const wb = CesiumMath.zeroToTwoPi(rectangleB.west);

    const rawMinX = ImageryCoverage.wrappedDifference(
      wa,
      wb,
      CesiumMath.TWO_PI,
    );
    const rawMaxX = ImageryCoverage.wrappedDifference(
      ea,
      wb,
      CesiumMath.TWO_PI,
    );

    result.minX = rawMinX * invX;
    result.minY = (rectangleA.south - rectangleB.south) * invY;
    result.maxX = rawMaxX * invX;
    result.maxY = (rectangleA.north - rectangleB.south) * invY;
    return result;
  }

  /**
   * Computes the difference between the given values, wrapped to
   * the given wrapping value.
   *
   * The values will be brought into the range [0, wrap]. The
   * result will be the signed (!) difference between both values,
   * considering the wrapping of the values.
   *
   * For example:
   * <code>wrappedDifference(0.9, 0.7, 1.0) = 0.2</code>
   * <code>wrappedDifference(0.7, 0.9, 1.0) = -0.2</code>
   * <code>wrappedDifference(1.1, 0.9, 1.0) = 0.2</code>
   * <code>wrappedDifference(0.9, 1.1, 1.0) = -0.2</code>
   *
   * @param {number} a The first value
   * @param {number} b The second value
   * @param {number} wrap The wrapping value
   * @returns The wrapped difference
   */
  static wrappedDifference(a, b, wrap) {
    const wrappedA = (a %= wrap);
    const wrappedB = (b %= wrap);
    const diff = wrappedA - wrappedB;
    const absDiff = Math.abs(diff);
    if (absDiff < wrap - absDiff) {
      return diff;
    }
    if (diff < 0) {
      return diff + wrap;
    }
    return diff - wrap;
  }
}

export default ImageryCoverage;
