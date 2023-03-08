define(['exports', './arrayRemoveDuplicates-c2038105', './Matrix3-315394f6', './defaultValue-0a909f67', './Math-2dbd6b93', './PolylinePipeline-d8e6bd9b'], (function (exports, arrayRemoveDuplicates, Matrix3, defaultValue, Math, PolylinePipeline) { 'use strict';

  /**
   * @private
   */
  const WallGeometryLibrary = {};

  function latLonEquals(c0, c1) {
    return (
      Math.CesiumMath.equalsEpsilon(c0.latitude, c1.latitude, Math.CesiumMath.EPSILON10) &&
      Math.CesiumMath.equalsEpsilon(c0.longitude, c1.longitude, Math.CesiumMath.EPSILON10)
    );
  }

  const scratchCartographic1 = new Matrix3.Cartographic();
  const scratchCartographic2 = new Matrix3.Cartographic();
  function removeDuplicates(ellipsoid, positions, topHeights, bottomHeights) {
    positions = arrayRemoveDuplicates.arrayRemoveDuplicates(positions, Matrix3.Cartesian3.equalsEpsilon);

    const length = positions.length;
    if (length < 2) {
      return;
    }

    const hasBottomHeights = defaultValue.defined(bottomHeights);
    const hasTopHeights = defaultValue.defined(topHeights);

    const cleanedPositions = new Array(length);
    const cleanedTopHeights = new Array(length);
    const cleanedBottomHeights = new Array(length);

    const v0 = positions[0];
    cleanedPositions[0] = v0;

    const c0 = ellipsoid.cartesianToCartographic(v0, scratchCartographic1);
    if (hasTopHeights) {
      c0.height = topHeights[0];
    }

    cleanedTopHeights[0] = c0.height;

    if (hasBottomHeights) {
      cleanedBottomHeights[0] = bottomHeights[0];
    } else {
      cleanedBottomHeights[0] = 0.0;
    }

    const startTopHeight = cleanedTopHeights[0];
    const startBottomHeight = cleanedBottomHeights[0];
    let hasAllSameHeights = startTopHeight === startBottomHeight;

    let index = 1;
    for (let i = 1; i < length; ++i) {
      const v1 = positions[i];
      const c1 = ellipsoid.cartesianToCartographic(v1, scratchCartographic2);
      if (hasTopHeights) {
        c1.height = topHeights[i];
      }
      hasAllSameHeights = hasAllSameHeights && c1.height === 0;

      if (!latLonEquals(c0, c1)) {
        cleanedPositions[index] = v1; // Shallow copy!
        cleanedTopHeights[index] = c1.height;

        if (hasBottomHeights) {
          cleanedBottomHeights[index] = bottomHeights[i];
        } else {
          cleanedBottomHeights[index] = 0.0;
        }
        hasAllSameHeights =
          hasAllSameHeights &&
          cleanedTopHeights[index] === cleanedBottomHeights[index];

        Matrix3.Cartographic.clone(c1, c0);
        ++index;
      } else if (c0.height < c1.height) {
        // two adjacent positions are the same, so use whichever has the greater height
        cleanedTopHeights[index - 1] = c1.height;
      }
    }

    if (hasAllSameHeights || index < 2) {
      return;
    }

    cleanedPositions.length = index;
    cleanedTopHeights.length = index;
    cleanedBottomHeights.length = index;

    return {
      positions: cleanedPositions,
      topHeights: cleanedTopHeights,
      bottomHeights: cleanedBottomHeights,
    };
  }

  const positionsArrayScratch = new Array(2);
  const heightsArrayScratch = new Array(2);
  const generateArcOptionsScratch = {
    positions: undefined,
    height: undefined,
    granularity: undefined,
    ellipsoid: undefined,
  };

  /**
   * @private
   */
  WallGeometryLibrary.computePositions = function (
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights,
    granularity,
    duplicateCorners
  ) {
    const o = removeDuplicates(
      ellipsoid,
      wallPositions,
      maximumHeights,
      minimumHeights
    );

    if (!defaultValue.defined(o)) {
      return;
    }

    wallPositions = o.positions;
    maximumHeights = o.topHeights;
    minimumHeights = o.bottomHeights;

    const length = wallPositions.length;
    const numCorners = length - 2;
    let topPositions;
    let bottomPositions;

    const minDistance = Math.CesiumMath.chordLength(
      granularity,
      ellipsoid.maximumRadius
    );

    const generateArcOptions = generateArcOptionsScratch;
    generateArcOptions.minDistance = minDistance;
    generateArcOptions.ellipsoid = ellipsoid;

    if (duplicateCorners) {
      let count = 0;
      let i;

      for (i = 0; i < length - 1; i++) {
        count +=
          PolylinePipeline.PolylinePipeline.numberOfPoints(
            wallPositions[i],
            wallPositions[i + 1],
            minDistance
          ) + 1;
      }

      topPositions = new Float64Array(count * 3);
      bottomPositions = new Float64Array(count * 3);

      const generateArcPositions = positionsArrayScratch;
      const generateArcHeights = heightsArrayScratch;
      generateArcOptions.positions = generateArcPositions;
      generateArcOptions.height = generateArcHeights;

      let offset = 0;
      for (i = 0; i < length - 1; i++) {
        generateArcPositions[0] = wallPositions[i];
        generateArcPositions[1] = wallPositions[i + 1];

        generateArcHeights[0] = maximumHeights[i];
        generateArcHeights[1] = maximumHeights[i + 1];

        const pos = PolylinePipeline.PolylinePipeline.generateArc(generateArcOptions);
        topPositions.set(pos, offset);

        generateArcHeights[0] = minimumHeights[i];
        generateArcHeights[1] = minimumHeights[i + 1];

        bottomPositions.set(
          PolylinePipeline.PolylinePipeline.generateArc(generateArcOptions),
          offset
        );

        offset += pos.length;
      }
    } else {
      generateArcOptions.positions = wallPositions;
      generateArcOptions.height = maximumHeights;
      topPositions = new Float64Array(
        PolylinePipeline.PolylinePipeline.generateArc(generateArcOptions)
      );

      generateArcOptions.height = minimumHeights;
      bottomPositions = new Float64Array(
        PolylinePipeline.PolylinePipeline.generateArc(generateArcOptions)
      );
    }

    return {
      bottomPositions: bottomPositions,
      topPositions: topPositions,
      numCorners: numCorners,
    };
  };
  var WallGeometryLibrary$1 = WallGeometryLibrary;

  exports.WallGeometryLibrary = WallGeometryLibrary$1;

}));
