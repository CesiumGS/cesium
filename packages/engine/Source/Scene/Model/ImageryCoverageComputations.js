import defined from "../../Core/defined";
import Rectangle from "../../Core/Rectangle";
import Cartesian4 from "../../Core/Cartesian4";

// TODO_DRAPING: Some of this was extracted from ImageryLayer.prototype._createTileImagerySkeletons
// See https://github.com/CesiumGS/cesium/blob/5eaa2280f495d8f300d9e1f0497118c97aec54c8/packages/engine/Source/Scene/ImageryLayer.js#L700
// Some of this makes assumptions about the projection. This was originally
// handled with the `useWebMercatorT` flag that was passed along and ended
// up in certain differences in the shaders. The hope is that this can either
// be abstracted away using a `MapProjection` and/or computing only the
// right texture coordinates for the respective projection to begin with.

const imageryBoundsScratch = new Rectangle();
const overlappedRectangleScratch = new Rectangle();
const clippedRectangleScratch = new Rectangle();
const nativeInputRectangleScratch = new Rectangle();
const nativeImageryBoundsScratch = new Rectangle();

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

// TODO_DRAPING Preliminary structure containing information
// about a piece of imagery that is covered by a given
// `Rectangle`
class ImageryCoverage {
  constructor() {
    // All {number}
    this.x = undefined;
    this.y = undefined;
    this.level = undefined;
    // {Cartesian4}, minU, minV, maxU, maxV
    this.texCoordsRectangle = undefined;
  }
}

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
   * Computes the `ImageryCoverage` objects that describe the imagery tiles
   * and the respective texture coordinates that are covered by the given
   * input rectangle in the given imagery data.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   *
   * @param {Rectangle} inputRectangle The input rectangle (e.g. tile bounds)
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {ImageryProvider} imageryProvider The imagery provider
   * @returns {ImageryCoverage[]} The objects describing the covered imagery
   * and the respective texture coordinates
   */
  static createImageryCoverages(inputRectangle, imageryLayer, imageryProvider) {
    // Compute the required level in the imagery tiling scheme.
    // TODO_DRAPING This will need additional inputs
    const imageryLevel = ImageryCoverageComputations._computeImageryLevel();

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
        nativeImageryBounds,
        clippedRectangleScratch,
      );
      return localClippedImageryRectangle;
    };

    const imageryCoverages = ImageryCoverageComputations._processImageryRange(
      imageryRange,
      imageryLevel,
      nativeInputRectangle,
      computeClippedImageryRectangle,
    );
    return imageryCoverages;
  }

  /**
   * Computes the imagery level that should be used.
   *
   * TODO_DRAPING Extracted from _createTileImagerySkeletons.
   * This will need some input, maybe related to the geometric error,
   * but in the worst case, even something screen-spaced...
   *
   * @returns {number} The imagery level
   */
  static _computeImageryLevel() {
    // This is what this part originally did:
    /*
    let latitudeClosestToEquator = 0.0;
    if (rectangle.south > 0.0) {
      latitudeClosestToEquator = rectangle.south;
    } else if (rectangle.north < 0.0) {
      latitudeClosestToEquator = rectangle.north;
    }
    // Compute the required level in the imagery tiling scheme.
    const errorRatio = 1.0;
    const targetGeometricError =
      errorRatio * terrainProvider.getLevelMaximumGeometricError(tile.level);
    let imageryLevel = getLevelWithMaximumTexelSpacing(
      this,
      targetGeometricError,
      latitudeClosestToEquator,
    );
    imageryLevel = Math.max(0, imageryLevel);
    const maximumLevel = imageryProvider.maximumLevel;
    if (imageryLevel > maximumLevel) {
      imageryLevel = maximumLevel;
    }

    if (defined(imageryProvider.minimumLevel)) {
      const minimumLevel = imageryProvider.minimumLevel;
      if (imageryLevel < minimumLevel) {
        imageryLevel = minimumLevel;
      }
    }
    */
    return 0;
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
  static _processImageryRange(
    imageryRange,
    imageryLevel,
    nativeInputRectangle,
    computeClippedImageryRectangle,
  ) {
    const imageryCoverages = [];

    let minU;
    let maxU = 0.0;

    let minV = 1.0;
    let maxV;

    const clippedImageryRectangle = computeClippedImageryRectangle(
      imageryRange.minX,
      imageryRange.minY,
      imageryLevel,
    );

    // TODO_DRAPING Extracted from _createTileImagerySkeletons:
    // TODO_DRAPING I'm pretty sure that this "veryClose"-handling could somehow be
    // pulled out and made more readable....
    // If this is the northern-most or western-most tile in the imagery tiling scheme,
    // it may not start at the northern or western edge of the terrain tile.
    // Calculate where it does start.
    const veryCloseX = nativeInputRectangle.width / 512.0;
    const veryCloseY = nativeInputRectangle.height / 512.0;
    const differenceWest =
      clippedImageryRectangle.west - nativeInputRectangle.west;
    if (Math.abs(differenceWest) >= veryCloseX) {
      maxU = Math.min(1.0, differenceWest / nativeInputRectangle.width);
    }

    const differenceNorth =
      clippedImageryRectangle.north - nativeInputRectangle.north;
    if (Math.abs(differenceNorth) >= veryCloseY) {
      const differenceV =
        clippedImageryRectangle.north - nativeInputRectangle.south;
      minV = Math.max(0.0, differenceV / nativeInputRectangle.height);
    }

    const initialMinV = minV;

    for (let i = imageryRange.minX; i <= imageryRange.maxX; i++) {
      minU = maxU;

      const clippedImageryRectangleU = computeClippedImageryRectangle(
        i,
        imageryRange.minY,
        imageryLevel,
      );

      if (!defined(clippedImageryRectangleU)) {
        continue;
      }

      const differenceU =
        clippedImageryRectangleU.east - nativeInputRectangle.west;
      maxU = Math.min(1.0, differenceU / nativeInputRectangle.width);

      // TODO_DRAPING Extracted from _createTileImagerySkeletons:
      // If this is the eastern-most imagery tile mapped to this terrain tile,
      // and there are more imagery tiles to the east of this one, the maxU
      // should be 1.0 to make sure rounding errors don't make the last
      // image fall shy of the edge of the terrain tile.
      if (i === imageryRange.maxX) {
        const differenceEast =
          clippedImageryRectangleU.east - nativeInputRectangle.east;
        if (Math.abs(differenceEast) < veryCloseX) {
          maxU = 1.0;
        }
      }

      minV = initialMinV;

      for (let j = imageryRange.minY; j <= imageryRange.maxY; j++) {
        maxV = minV;

        const clippedimageryRectangleV = computeClippedImageryRectangle(
          i,
          j,
          imageryLevel,
        );

        if (!defined(clippedimageryRectangleV)) {
          continue;
        }

        const differenceSouth =
          clippedimageryRectangleV.south - nativeInputRectangle.south;
        minV = Math.max(0.0, differenceSouth / nativeInputRectangle.height);

        // TODO_DRAPING Extracted from _createTileImagerySkeletons:
        // If this is the southern-most imagery tile mapped to this terrain tile,
        // and there are more imagery tiles to the south of this one, the minV
        // should be 0.0 to make sure rounding errors don't make the last
        // image fall shy of the edge of the terrain tile.
        if (j === imageryRange.maxY && Math.abs(differenceSouth) < veryCloseY) {
          minV = 0.0;
        }

        const texCoordsRectangle = new Cartesian4(minU, minV, maxU, maxV);
        const imageryCoverage = new ImageryCoverage();
        imageryCoverage.x = i;
        imageryCoverage.y = j;
        imageryCoverage.level = imageryLevel;
        imageryCoverage.texCoordsRectangle = texCoordsRectangle;
        imageryCoverages.push(imageryCoverage);
      }
    }
    return imageryCoverages;
  }

  // TODO_DRAPING I'm pretty sure that this is what many operations here
  // boil down to, maybe including some "flip" or "clamp", but
  // carving that out and implementing it properly takes TIME...
  static _localizeCartesianRectangle(rectangleA, rectangleB, result) {
    if (result === undefined) {
      result = new CartesianRectangle();
    }
    const invX = rectangleA.maxX - rectangleA.minX;
    const invY = rectangleA.maxY - rectangleA.minY;
    result.minX = (rectangleB.minX - rectangleA.minX) * invX;
    result.minY = (rectangleB.minY - rectangleA.minY) * invY;
    result.maxY = (rectangleB.maxY - rectangleA.maxY) * invY;
    result.maxX = (rectangleB.maxX - rectangleA.maxX) * invX;
    return result;
  }
}

export default ImageryCoverageComputations;
