import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import PolylinePipeline from "./PolylinePipeline.js";

/**
 * @private
 */
var WallGeometryLibrary = {};

function latLonEquals(c0, c1) {
  return (
    CesiumMath.equalsEpsilon(c0.latitude, c1.latitude, CesiumMath.EPSILON10) &&
    CesiumMath.equalsEpsilon(c0.longitude, c1.longitude, CesiumMath.EPSILON10)
  );
}

var scratchCartographic1 = new Cartographic();
var scratchCartographic2 = new Cartographic();
function removeDuplicates(ellipsoid, positions, topHeights, bottomHeights) {
  positions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon);

  var length = positions.length;
  if (length < 2) {
    return;
  }

  var hasBottomHeights = defined(bottomHeights);
  var hasTopHeights = defined(topHeights);

  var cleanedPositions = new Array(length);
  var cleanedTopHeights = new Array(length);
  var cleanedBottomHeights = new Array(length);

  var v0 = positions[0];
  cleanedPositions[0] = v0;

  var c0 = ellipsoid.cartesianToCartographic(v0, scratchCartographic1);
  if (hasTopHeights) {
    c0.height = topHeights[0];
  }

  cleanedTopHeights[0] = c0.height;

  if (hasBottomHeights) {
    cleanedBottomHeights[0] = bottomHeights[0];
  } else {
    cleanedBottomHeights[0] = 0.0;
  }

  var startTopHeight = cleanedTopHeights[0];
  var startBottomHeight = cleanedBottomHeights[0];
  var hasAllSameHeights = startTopHeight === startBottomHeight;

  var index = 1;
  for (var i = 1; i < length; ++i) {
    var v1 = positions[i];
    var c1 = ellipsoid.cartesianToCartographic(v1, scratchCartographic2);
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

      Cartographic.clone(c1, c0);
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

var positionsArrayScratch = new Array(2);
var heightsArrayScratch = new Array(2);
var generateArcOptionsScratch = {
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
  var o = removeDuplicates(
    ellipsoid,
    wallPositions,
    maximumHeights,
    minimumHeights
  );

  if (!defined(o)) {
    return;
  }

  wallPositions = o.positions;
  maximumHeights = o.topHeights;
  minimumHeights = o.bottomHeights;

  var length = wallPositions.length;
  var numCorners = length - 2;
  var topPositions;
  var bottomPositions;

  var minDistance = CesiumMath.chordLength(
    granularity,
    ellipsoid.maximumRadius
  );

  var generateArcOptions = generateArcOptionsScratch;
  generateArcOptions.minDistance = minDistance;
  generateArcOptions.ellipsoid = ellipsoid;

  if (duplicateCorners) {
    var count = 0;
    var i;

    for (i = 0; i < length - 1; i++) {
      count +=
        PolylinePipeline.numberOfPoints(
          wallPositions[i],
          wallPositions[i + 1],
          minDistance
        ) + 1;
    }

    topPositions = new Float64Array(count * 3);
    bottomPositions = new Float64Array(count * 3);

    var generateArcPositions = positionsArrayScratch;
    var generateArcHeights = heightsArrayScratch;
    generateArcOptions.positions = generateArcPositions;
    generateArcOptions.height = generateArcHeights;

    var offset = 0;
    for (i = 0; i < length - 1; i++) {
      generateArcPositions[0] = wallPositions[i];
      generateArcPositions[1] = wallPositions[i + 1];

      generateArcHeights[0] = maximumHeights[i];
      generateArcHeights[1] = maximumHeights[i + 1];

      var pos = PolylinePipeline.generateArc(generateArcOptions);
      topPositions.set(pos, offset);

      generateArcHeights[0] = minimumHeights[i];
      generateArcHeights[1] = minimumHeights[i + 1];

      bottomPositions.set(
        PolylinePipeline.generateArc(generateArcOptions),
        offset
      );

      offset += pos.length;
    }
  } else {
    generateArcOptions.positions = wallPositions;
    generateArcOptions.height = maximumHeights;
    topPositions = new Float64Array(
      PolylinePipeline.generateArc(generateArcOptions)
    );

    generateArcOptions.height = minimumHeights;
    bottomPositions = new Float64Array(
      PolylinePipeline.generateArc(generateArcOptions)
    );
  }

  return {
    bottomPositions: bottomPositions,
    topPositions: topPositions,
    numCorners: numCorners,
  };
};
export default WallGeometryLibrary;
