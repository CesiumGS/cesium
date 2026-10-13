import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import Matrix3 from "./Matrix3.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";

/**
 * @private
 */
const CoplanarPolygonGeometryLibrary = {};

const scratchIntersectionPoint = new Cartesian3();
const scratchXAxis = new Cartesian3();
const scratchYAxis = new Cartesian3();
const scratchZAxis = new Cartesian3();
const obbScratch = new OrientedBoundingBox();

CoplanarPolygonGeometryLibrary.validOutline = function (positions) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  //>>includeEnd('debug');

  const orientedBoundingBox = OrientedBoundingBox.fromPoints(
    positions,
    obbScratch,
  );
  const halfAxes = orientedBoundingBox.halfAxes;
  const xAxis = Matrix3.getColumn(halfAxes, 0, scratchXAxis);
  const yAxis = Matrix3.getColumn(halfAxes, 1, scratchYAxis);
  const zAxis = Matrix3.getColumn(halfAxes, 2, scratchZAxis);

  const xMag = Cartesian3.magnitude(xAxis);
  const yMag = Cartesian3.magnitude(yAxis);
  const zMag = Cartesian3.magnitude(zAxis);

  // If all the points are on a line return undefined because we can't draw a polygon
  return !(
    (xMag === 0 && (yMag === 0 || zMag === 0)) ||
    (yMag === 0 && zMag === 0)
  );
};

// call after removeDuplicates
CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments = function (
  positions,
  centerResult,
  planeAxis1Result,
  planeAxis2Result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.defined("centerResult", centerResult);
  Check.defined("planeAxis1Result", planeAxis1Result);
  Check.defined("planeAxis2Result", planeAxis2Result);
  //>>includeEnd('debug');

  const orientedBoundingBox = OrientedBoundingBox.fromPoints(
    positions,
    obbScratch,
  );
  const halfAxes = orientedBoundingBox.halfAxes;
  const xAxis = Matrix3.getColumn(halfAxes, 0, scratchXAxis);
  const yAxis = Matrix3.getColumn(halfAxes, 1, scratchYAxis);
  const zAxis = Matrix3.getColumn(halfAxes, 2, scratchZAxis);

  const xMag = Cartesian3.magnitude(xAxis);
  const yMag = Cartesian3.magnitude(yAxis);
  const zMag = Cartesian3.magnitude(zAxis);
  const min = Math.min(xMag, yMag, zMag);

  // If all the points are on a line return undefined because we can't draw a polygon
  if (
    (xMag === 0 && (yMag === 0 || zMag === 0)) ||
    (yMag === 0 && zMag === 0)
  ) {
    return false;
  }

  let planeAxis1;
  let planeAxis2;

  if (min === yMag || min === zMag) {
    planeAxis1 = xAxis;
  }
  if (min === xMag) {
    planeAxis1 = yAxis;
  } else if (min === zMag) {
    planeAxis2 = yAxis;
  }
  if (min === xMag || min === yMag) {
    planeAxis2 = zAxis;
  }

  Cartesian3.normalize(planeAxis1, planeAxis1Result);
  Cartesian3.normalize(planeAxis2, planeAxis2Result);
  Cartesian3.clone(orientedBoundingBox.center, centerResult);
  return true;
};

function projectTo2D(position, center, axis1, axis2, result) {
  const v = Cartesian3.subtract(position, center, scratchIntersectionPoint);
  const x = Cartesian3.dot(axis1, v);
  const y = Cartesian3.dot(axis2, v);

  return Cartesian2.fromElements(x, y, result);
}

CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction = function (
  center,
  axis1,
  axis2,
) {
  return function (positions) {
    const positionResults = new Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      positionResults[i] = projectTo2D(positions[i], center, axis1, axis2);
    }

    return positionResults;
  };
};

CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction = function (
  center,
  axis1,
  axis2,
) {
  return function (position, result) {
    return projectTo2D(position, center, axis1, axis2, result);
  };
};
export default CoplanarPolygonGeometryLibrary;
