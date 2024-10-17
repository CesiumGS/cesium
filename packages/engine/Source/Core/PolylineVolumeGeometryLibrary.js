import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartesian4 from "./Cartesian4.js";
import Cartographic from "./Cartographic.js";
import CornerType from "./CornerType.js";
import EllipsoidTangentPlane from "./EllipsoidTangentPlane.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import PolylinePipeline from "./PolylinePipeline.js";
import Quaternion from "./Quaternion.js";
import Transforms from "./Transforms.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";

const scratch2Array = [new Cartesian3(), new Cartesian3()];
const scratchCartesian1 = new Cartesian3();
const scratchCartesian2 = new Cartesian3();
const scratchCartesian3 = new Cartesian3();
const scratchCartesian4 = new Cartesian3();
const scratchCartesian5 = new Cartesian3();
const scratchCartesian6 = new Cartesian3();
const scratchCartesian7 = new Cartesian3();
const scratchCartesian8 = new Cartesian3();
const scratchCartesian9 = new Cartesian3();

const scratch1 = new Cartesian3();
const scratch2 = new Cartesian3();

/**
 * @private
 */
const PolylineVolumeGeometryLibrary = {};

let cartographic = new Cartographic();
function scaleToSurface(positions, ellipsoid) {
  const heights = new Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    cartographic = ellipsoid.cartesianToCartographic(pos, cartographic);
    heights[i] = cartographic.height;
    positions[i] = ellipsoid.scaleToGeodeticSurface(pos, pos);
  }
  return heights;
}

function subdivideHeights(points, h0, h1, granularity) {
  const p0 = points[0];
  const p1 = points[1];
  const angleBetween = Cartesian3.angleBetween(p0, p1);
  const numPoints = Math.ceil(angleBetween / granularity);
  const heights = new Array(numPoints);
  let i;
  if (h0 === h1) {
    for (i = 0; i < numPoints; i++) {
      heights[i] = h0;
    }
    heights.push(h1);
    return heights;
  }

  const dHeight = h1 - h0;
  const heightPerVertex = dHeight / numPoints;

  for (i = 1; i < numPoints; i++) {
    const h = h0 + i * heightPerVertex;
    heights[i] = h;
  }

  heights[0] = h0;
  heights.push(h1);
  return heights;
}

const nextScratch = new Cartesian3();
const prevScratch = new Cartesian3();

function computeRotationAngle(start, end, position, ellipsoid) {
  const tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
  const next = tangentPlane.projectPointOntoPlane(
    Cartesian3.add(position, start, nextScratch),
    nextScratch,
  );
  const prev = tangentPlane.projectPointOntoPlane(
    Cartesian3.add(position, end, prevScratch),
    prevScratch,
  );
  const angle = Cartesian2.angleBetween(next, prev);

  return prev.x * next.y - prev.y * next.x >= 0.0 ? -angle : angle;
}

const negativeX = new Cartesian3(-1, 0, 0);
let transform = new Matrix4();
const translation = new Matrix4();
let rotationZ = new Matrix3();
const scaleMatrix = Matrix3.IDENTITY.clone();
const westScratch = new Cartesian3();
const finalPosScratch = new Cartesian4();
const heightCartesian = new Cartesian3();
function addPosition(
  center,
  left,
  shape,
  finalPositions,
  ellipsoid,
  height,
  xScalar,
  repeat,
) {
  let west = westScratch;
  let finalPosition = finalPosScratch;
  transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, transform);

  west = Matrix4.multiplyByPointAsVector(transform, negativeX, west);
  west = Cartesian3.normalize(west, west);
  const angle = computeRotationAngle(west, left, center, ellipsoid);
  rotationZ = Matrix3.fromRotationZ(angle, rotationZ);

  heightCartesian.z = height;
  transform = Matrix4.multiplyTransformation(
    transform,
    Matrix4.fromRotationTranslation(rotationZ, heightCartesian, translation),
    transform,
  );
  const scale = scaleMatrix;
  scale[0] = xScalar;

  for (let j = 0; j < repeat; j++) {
    for (let i = 0; i < shape.length; i += 3) {
      finalPosition = Cartesian3.fromArray(shape, i, finalPosition);
      finalPosition = Matrix3.multiplyByVector(
        scale,
        finalPosition,
        finalPosition,
      );
      finalPosition = Matrix4.multiplyByPoint(
        transform,
        finalPosition,
        finalPosition,
      );
      finalPositions.push(finalPosition.x, finalPosition.y, finalPosition.z);
    }
  }

  return finalPositions;
}

const centerScratch = new Cartesian3();
function addPositions(
  centers,
  left,
  shape,
  finalPositions,
  ellipsoid,
  heights,
  xScalar,
) {
  for (let i = 0; i < centers.length; i += 3) {
    const center = Cartesian3.fromArray(centers, i, centerScratch);
    finalPositions = addPosition(
      center,
      left,
      shape,
      finalPositions,
      ellipsoid,
      heights[i / 3],
      xScalar,
      1,
    );
  }
  return finalPositions;
}

function convertShapeTo3DDuplicate(shape2D, boundingRectangle) {
  //orientate 2D shape to XZ plane center at (0, 0, 0), duplicate points
  const length = shape2D.length;
  const shape = new Array(length * 6);
  let index = 0;
  const xOffset = boundingRectangle.x + boundingRectangle.width / 2;
  const yOffset = boundingRectangle.y + boundingRectangle.height / 2;

  let point = shape2D[0];
  shape[index++] = point.x - xOffset;
  shape[index++] = 0.0;
  shape[index++] = point.y - yOffset;
  for (let i = 1; i < length; i++) {
    point = shape2D[i];
    const x = point.x - xOffset;
    const z = point.y - yOffset;
    shape[index++] = x;
    shape[index++] = 0.0;
    shape[index++] = z;

    shape[index++] = x;
    shape[index++] = 0.0;
    shape[index++] = z;
  }
  point = shape2D[0];
  shape[index++] = point.x - xOffset;
  shape[index++] = 0.0;
  shape[index++] = point.y - yOffset;

  return shape;
}

function convertShapeTo3D(shape2D, boundingRectangle) {
  //orientate 2D shape to XZ plane center at (0, 0, 0)
  const length = shape2D.length;
  const shape = new Array(length * 3);
  let index = 0;
  const xOffset = boundingRectangle.x + boundingRectangle.width / 2;
  const yOffset = boundingRectangle.y + boundingRectangle.height / 2;

  for (let i = 0; i < length; i++) {
    shape[index++] = shape2D[i].x - xOffset;
    shape[index++] = 0;
    shape[index++] = shape2D[i].y - yOffset;
  }

  return shape;
}

const quaterion = new Quaternion();
const startPointScratch = new Cartesian3();
const rotMatrix = new Matrix3();
function computeRoundCorner(
  pivot,
  startPoint,
  endPoint,
  cornerType,
  leftIsOutside,
  ellipsoid,
  finalPositions,
  shape,
  height,
  duplicatePoints,
) {
  const angle = Cartesian3.angleBetween(
    Cartesian3.subtract(startPoint, pivot, scratch1),
    Cartesian3.subtract(endPoint, pivot, scratch2),
  );
  const granularity =
    cornerType === CornerType.BEVELED
      ? 0
      : Math.ceil(angle / CesiumMath.toRadians(5));

  let m;
  if (leftIsOutside) {
    m = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(
        Cartesian3.negate(pivot, scratch1),
        angle / (granularity + 1),
        quaterion,
      ),
      rotMatrix,
    );
  } else {
    m = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(pivot, angle / (granularity + 1), quaterion),
      rotMatrix,
    );
  }

  let left;
  let surfacePoint;
  startPoint = Cartesian3.clone(startPoint, startPointScratch);
  if (granularity > 0) {
    const repeat = duplicatePoints ? 2 : 1;
    for (let i = 0; i < granularity; i++) {
      startPoint = Matrix3.multiplyByVector(m, startPoint, startPoint);
      left = Cartesian3.subtract(startPoint, pivot, scratch1);
      left = Cartesian3.normalize(left, left);
      if (!leftIsOutside) {
        left = Cartesian3.negate(left, left);
      }
      surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
      finalPositions = addPosition(
        surfacePoint,
        left,
        shape,
        finalPositions,
        ellipsoid,
        height,
        1,
        repeat,
      );
    }
  } else {
    left = Cartesian3.subtract(startPoint, pivot, scratch1);
    left = Cartesian3.normalize(left, left);
    if (!leftIsOutside) {
      left = Cartesian3.negate(left, left);
    }
    surfacePoint = ellipsoid.scaleToGeodeticSurface(startPoint, scratch2);
    finalPositions = addPosition(
      surfacePoint,
      left,
      shape,
      finalPositions,
      ellipsoid,
      height,
      1,
      1,
    );

    endPoint = Cartesian3.clone(endPoint, startPointScratch);
    left = Cartesian3.subtract(endPoint, pivot, scratch1);
    left = Cartesian3.normalize(left, left);
    if (!leftIsOutside) {
      left = Cartesian3.negate(left, left);
    }
    surfacePoint = ellipsoid.scaleToGeodeticSurface(endPoint, scratch2);
    finalPositions = addPosition(
      surfacePoint,
      left,
      shape,
      finalPositions,
      ellipsoid,
      height,
      1,
      1,
    );
  }

  return finalPositions;
}

PolylineVolumeGeometryLibrary.removeDuplicatesFromShape = function (
  shapePositions,
) {
  const length = shapePositions.length;
  const cleanedPositions = [];
  for (let i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
    const v0 = shapePositions[i0];
    const v1 = shapePositions[i1];

    if (!Cartesian2.equals(v0, v1)) {
      cleanedPositions.push(v1); // Shallow copy!
    }
  }

  return cleanedPositions;
};

PolylineVolumeGeometryLibrary.angleIsGreaterThanPi = function (
  forward,
  backward,
  position,
  ellipsoid,
) {
  const tangentPlane = new EllipsoidTangentPlane(position, ellipsoid);
  const next = tangentPlane.projectPointOntoPlane(
    Cartesian3.add(position, forward, nextScratch),
    nextScratch,
  );
  const prev = tangentPlane.projectPointOntoPlane(
    Cartesian3.add(position, backward, prevScratch),
    prevScratch,
  );

  return prev.x * next.y - prev.y * next.x >= 0.0;
};

const scratchForwardProjection = new Cartesian3();
const scratchBackwardProjection = new Cartesian3();

PolylineVolumeGeometryLibrary.computePositions = function (
  positions,
  shape2D,
  boundingRectangle,
  geometry,
  duplicatePoints,
) {
  const ellipsoid = geometry._ellipsoid;
  const heights = scaleToSurface(positions, ellipsoid);
  const granularity = geometry._granularity;
  const cornerType = geometry._cornerType;
  const shapeForSides = duplicatePoints
    ? convertShapeTo3DDuplicate(shape2D, boundingRectangle)
    : convertShapeTo3D(shape2D, boundingRectangle);
  const shapeForEnds = duplicatePoints
    ? convertShapeTo3D(shape2D, boundingRectangle)
    : undefined;
  const heightOffset = boundingRectangle.height / 2;
  const width = boundingRectangle.width / 2;
  let length = positions.length;
  let finalPositions = [];
  let ends = duplicatePoints ? [] : undefined;

  let forward = scratchCartesian1;
  let backward = scratchCartesian2;
  let cornerDirection = scratchCartesian3;
  let surfaceNormal = scratchCartesian4;
  let pivot = scratchCartesian5;
  let start = scratchCartesian6;
  let end = scratchCartesian7;
  let left = scratchCartesian8;
  let previousPosition = scratchCartesian9;

  let position = positions[0];
  let nextPosition = positions[1];
  surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);
  forward = Cartesian3.subtract(nextPosition, position, forward);
  forward = Cartesian3.normalize(forward, forward);
  left = Cartesian3.cross(surfaceNormal, forward, left);
  left = Cartesian3.normalize(left, left);
  let h0 = heights[0];
  let h1 = heights[1];
  if (duplicatePoints) {
    ends = addPosition(
      position,
      left,
      shapeForEnds,
      ends,
      ellipsoid,
      h0 + heightOffset,
      1,
      1,
    );
  }
  previousPosition = Cartesian3.clone(position, previousPosition);
  position = nextPosition;
  backward = Cartesian3.negate(forward, backward);
  let subdividedHeights;
  let subdividedPositions;
  for (let i = 1; i < length - 1; i++) {
    const repeat = duplicatePoints ? 2 : 1;
    nextPosition = positions[i + 1];
    if (position.equals(nextPosition)) {
      oneTimeWarning(
        "Positions are too close and are considered equivalent with rounding error.",
      );
      continue;
    }
    forward = Cartesian3.subtract(nextPosition, position, forward);
    forward = Cartesian3.normalize(forward, forward);
    surfaceNormal = ellipsoid.geodeticSurfaceNormal(position, surfaceNormal);

    const forwardProjection = Cartesian3.multiplyByScalar(
      surfaceNormal,
      Cartesian3.dot(forward, surfaceNormal),
      scratchForwardProjection,
    );
    Cartesian3.subtract(forward, forwardProjection, forwardProjection);
    Cartesian3.normalize(forwardProjection, forwardProjection);

    const backwardProjection = Cartesian3.multiplyByScalar(
      surfaceNormal,
      Cartesian3.dot(backward, surfaceNormal),
      scratchBackwardProjection,
    );
    Cartesian3.subtract(backward, backwardProjection, backwardProjection);
    Cartesian3.normalize(backwardProjection, backwardProjection);

    const doCorner = !CesiumMath.equalsEpsilon(
      Math.abs(Cartesian3.dot(forwardProjection, backwardProjection)),
      1.0,
      CesiumMath.EPSILON7,
    );

    if (doCorner) {
      cornerDirection = Cartesian3.add(forward, backward, cornerDirection);
      cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
      cornerDirection = Cartesian3.cross(
        cornerDirection,
        surfaceNormal,
        cornerDirection,
      );
      cornerDirection = Cartesian3.cross(
        surfaceNormal,
        cornerDirection,
        cornerDirection,
      );
      cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
      const scalar =
        1 /
        Math.max(
          0.25,
          Cartesian3.magnitude(
            Cartesian3.cross(cornerDirection, backward, scratch1),
          ),
        );
      const leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(
        forward,
        backward,
        position,
        ellipsoid,
      );
      if (leftIsOutside) {
        pivot = Cartesian3.add(
          position,
          Cartesian3.multiplyByScalar(
            cornerDirection,
            scalar * width,
            cornerDirection,
          ),
          pivot,
        );
        start = Cartesian3.add(
          pivot,
          Cartesian3.multiplyByScalar(left, width, start),
          start,
        );
        scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
        subdividedHeights = subdivideHeights(
          scratch2Array,
          h0 + heightOffset,
          h1 + heightOffset,
          granularity,
        );
        subdividedPositions = PolylinePipeline.generateArc({
          positions: scratch2Array,
          granularity: granularity,
          ellipsoid: ellipsoid,
        });
        finalPositions = addPositions(
          subdividedPositions,
          left,
          shapeForSides,
          finalPositions,
          ellipsoid,
          subdividedHeights,
          1,
        );
        left = Cartesian3.cross(surfaceNormal, forward, left);
        left = Cartesian3.normalize(left, left);
        end = Cartesian3.add(
          pivot,
          Cartesian3.multiplyByScalar(left, width, end),
          end,
        );
        if (
          cornerType === CornerType.ROUNDED ||
          cornerType === CornerType.BEVELED
        ) {
          computeRoundCorner(
            pivot,
            start,
            end,
            cornerType,
            leftIsOutside,
            ellipsoid,
            finalPositions,
            shapeForSides,
            h1 + heightOffset,
            duplicatePoints,
          );
        } else {
          cornerDirection = Cartesian3.negate(cornerDirection, cornerDirection);
          finalPositions = addPosition(
            position,
            cornerDirection,
            shapeForSides,
            finalPositions,
            ellipsoid,
            h1 + heightOffset,
            scalar,
            repeat,
          );
        }
        previousPosition = Cartesian3.clone(end, previousPosition);
      } else {
        pivot = Cartesian3.add(
          position,
          Cartesian3.multiplyByScalar(
            cornerDirection,
            scalar * width,
            cornerDirection,
          ),
          pivot,
        );
        start = Cartesian3.add(
          pivot,
          Cartesian3.multiplyByScalar(left, -width, start),
          start,
        );
        scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
        scratch2Array[1] = Cartesian3.clone(start, scratch2Array[1]);
        subdividedHeights = subdivideHeights(
          scratch2Array,
          h0 + heightOffset,
          h1 + heightOffset,
          granularity,
        );
        subdividedPositions = PolylinePipeline.generateArc({
          positions: scratch2Array,
          granularity: granularity,
          ellipsoid: ellipsoid,
        });
        finalPositions = addPositions(
          subdividedPositions,
          left,
          shapeForSides,
          finalPositions,
          ellipsoid,
          subdividedHeights,
          1,
        );
        left = Cartesian3.cross(surfaceNormal, forward, left);
        left = Cartesian3.normalize(left, left);
        end = Cartesian3.add(
          pivot,
          Cartesian3.multiplyByScalar(left, -width, end),
          end,
        );
        if (
          cornerType === CornerType.ROUNDED ||
          cornerType === CornerType.BEVELED
        ) {
          computeRoundCorner(
            pivot,
            start,
            end,
            cornerType,
            leftIsOutside,
            ellipsoid,
            finalPositions,
            shapeForSides,
            h1 + heightOffset,
            duplicatePoints,
          );
        } else {
          finalPositions = addPosition(
            position,
            cornerDirection,
            shapeForSides,
            finalPositions,
            ellipsoid,
            h1 + heightOffset,
            scalar,
            repeat,
          );
        }
        previousPosition = Cartesian3.clone(end, previousPosition);
      }
      backward = Cartesian3.negate(forward, backward);
    } else {
      finalPositions = addPosition(
        previousPosition,
        left,
        shapeForSides,
        finalPositions,
        ellipsoid,
        h0 + heightOffset,
        1,
        1,
      );
      previousPosition = position;
    }
    h0 = h1;
    h1 = heights[i + 1];
    position = nextPosition;
  }

  scratch2Array[0] = Cartesian3.clone(previousPosition, scratch2Array[0]);
  scratch2Array[1] = Cartesian3.clone(position, scratch2Array[1]);
  subdividedHeights = subdivideHeights(
    scratch2Array,
    h0 + heightOffset,
    h1 + heightOffset,
    granularity,
  );
  subdividedPositions = PolylinePipeline.generateArc({
    positions: scratch2Array,
    granularity: granularity,
    ellipsoid: ellipsoid,
  });
  finalPositions = addPositions(
    subdividedPositions,
    left,
    shapeForSides,
    finalPositions,
    ellipsoid,
    subdividedHeights,
    1,
  );
  if (duplicatePoints) {
    ends = addPosition(
      position,
      left,
      shapeForEnds,
      ends,
      ellipsoid,
      h1 + heightOffset,
      1,
      1,
    );
  }

  length = finalPositions.length;
  const posLength = duplicatePoints ? length + ends.length : length;
  const combinedPositions = new Float64Array(posLength);
  combinedPositions.set(finalPositions);
  if (duplicatePoints) {
    combinedPositions.set(ends, length);
  }

  return combinedPositions;
};
export default PolylineVolumeGeometryLibrary;
