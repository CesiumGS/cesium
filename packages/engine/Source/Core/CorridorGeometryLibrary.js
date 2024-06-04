import Cartesian3 from "./Cartesian3.js";
import CornerType from "./CornerType.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import PolylinePipeline from "./PolylinePipeline.js";
import PolylineVolumeGeometryLibrary from "./PolylineVolumeGeometryLibrary.js";
import Quaternion from "./Quaternion.js";

/**
 * @private
 */
const CorridorGeometryLibrary = {};

const scratch1 = new Cartesian3();
const scratch2 = new Cartesian3();
const scratch3 = new Cartesian3();
const scratch4 = new Cartesian3();

const scaleArray2 = [new Cartesian3(), new Cartesian3()];

const cartesian1 = new Cartesian3();
const cartesian2 = new Cartesian3();
const cartesian3 = new Cartesian3();
const cartesian4 = new Cartesian3();
const cartesian5 = new Cartesian3();
const cartesian6 = new Cartesian3();
const cartesian7 = new Cartesian3();
const cartesian8 = new Cartesian3();
const cartesian9 = new Cartesian3();
const cartesian10 = new Cartesian3();

const quaterion = new Quaternion();
const rotMatrix = new Matrix3();
function computeRoundCorner(
  cornerPoint,
  startPoint,
  endPoint,
  cornerType,
  leftIsOutside
) {
  const angle = Cartesian3.angleBetween(
    Cartesian3.subtract(startPoint, cornerPoint, scratch1),
    Cartesian3.subtract(endPoint, cornerPoint, scratch2)
  );
  const granularity =
    cornerType === CornerType.BEVELED
      ? 1
      : Math.ceil(angle / CesiumMath.toRadians(5)) + 1;

  const size = granularity * 3;
  const array = new Array(size);

  array[size - 3] = endPoint.x;
  array[size - 2] = endPoint.y;
  array[size - 1] = endPoint.z;

  let m;
  if (leftIsOutside) {
    m = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(
        Cartesian3.negate(cornerPoint, scratch1),
        angle / granularity,
        quaterion
      ),
      rotMatrix
    );
  } else {
    m = Matrix3.fromQuaternion(
      Quaternion.fromAxisAngle(cornerPoint, angle / granularity, quaterion),
      rotMatrix
    );
  }

  let index = 0;
  startPoint = Cartesian3.clone(startPoint, scratch1);
  for (let i = 0; i < granularity; i++) {
    startPoint = Matrix3.multiplyByVector(m, startPoint, startPoint);
    array[index++] = startPoint.x;
    array[index++] = startPoint.y;
    array[index++] = startPoint.z;
  }

  return array;
}

function addEndCaps(calculatedPositions) {
  let cornerPoint = cartesian1;
  let startPoint = cartesian2;
  let endPoint = cartesian3;

  let leftEdge = calculatedPositions[1];
  startPoint = Cartesian3.fromArray(
    calculatedPositions[1],
    leftEdge.length - 3,
    startPoint
  );
  endPoint = Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
  cornerPoint = Cartesian3.midpoint(startPoint, endPoint, cornerPoint);
  const firstEndCap = computeRoundCorner(
    cornerPoint,
    startPoint,
    endPoint,
    CornerType.ROUNDED,
    false
  );

  const length = calculatedPositions.length - 1;
  const rightEdge = calculatedPositions[length - 1];
  leftEdge = calculatedPositions[length];
  startPoint = Cartesian3.fromArray(
    rightEdge,
    rightEdge.length - 3,
    startPoint
  );
  endPoint = Cartesian3.fromArray(leftEdge, 0, endPoint);
  cornerPoint = Cartesian3.midpoint(startPoint, endPoint, cornerPoint);
  const lastEndCap = computeRoundCorner(
    cornerPoint,
    startPoint,
    endPoint,
    CornerType.ROUNDED,
    false
  );

  return [firstEndCap, lastEndCap];
}

function computeMiteredCorner(
  position,
  leftCornerDirection,
  lastPoint,
  leftIsOutside
) {
  let cornerPoint = scratch1;
  if (leftIsOutside) {
    cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
  } else {
    leftCornerDirection = Cartesian3.negate(
      leftCornerDirection,
      leftCornerDirection
    );
    cornerPoint = Cartesian3.add(position, leftCornerDirection, cornerPoint);
  }
  return [
    cornerPoint.x,
    cornerPoint.y,
    cornerPoint.z,
    lastPoint.x,
    lastPoint.y,
    lastPoint.z,
  ];
}

function addShiftedPositions(positions, left, scalar, calculatedPositions) {
  const rightPositions = new Array(positions.length);
  const leftPositions = new Array(positions.length);
  const scaledLeft = Cartesian3.multiplyByScalar(left, scalar, scratch1);
  const scaledRight = Cartesian3.negate(scaledLeft, scratch2);
  let rightIndex = 0;
  let leftIndex = positions.length - 1;

  for (let i = 0; i < positions.length; i += 3) {
    const pos = Cartesian3.fromArray(positions, i, scratch3);
    const rightPos = Cartesian3.add(pos, scaledRight, scratch4);
    rightPositions[rightIndex++] = rightPos.x;
    rightPositions[rightIndex++] = rightPos.y;
    rightPositions[rightIndex++] = rightPos.z;

    const leftPos = Cartesian3.add(pos, scaledLeft, scratch4);
    leftPositions[leftIndex--] = leftPos.z;
    leftPositions[leftIndex--] = leftPos.y;
    leftPositions[leftIndex--] = leftPos.x;
  }
  calculatedPositions.push(rightPositions, leftPositions);

  return calculatedPositions;
}

/**
 * @private
 */
CorridorGeometryLibrary.addAttribute = function (
  attribute,
  value,
  front,
  back
) {
  const x = value.x;
  const y = value.y;
  const z = value.z;
  if (defined(front)) {
    attribute[front] = x;
    attribute[front + 1] = y;
    attribute[front + 2] = z;
  }
  if (defined(back)) {
    attribute[back] = z;
    attribute[back - 1] = y;
    attribute[back - 2] = x;
  }
};

const scratchForwardProjection = new Cartesian3();
const scratchBackwardProjection = new Cartesian3();

/**
 * @private
 */
CorridorGeometryLibrary.computePositions = function (params) {
  const granularity = params.granularity;
  const positions = params.positions;
  const ellipsoid = params.ellipsoid;
  const width = params.width / 2;
  const cornerType = params.cornerType;
  const saveAttributes = params.saveAttributes;
  let normal = cartesian1;
  let forward = cartesian2;
  let backward = cartesian3;
  let left = cartesian4;
  let cornerDirection = cartesian5;
  let startPoint = cartesian6;
  let previousPos = cartesian7;
  let rightPos = cartesian8;
  let leftPos = cartesian9;
  let center = cartesian10;
  let calculatedPositions = [];
  const calculatedLefts = saveAttributes ? [] : undefined;
  const calculatedNormals = saveAttributes ? [] : undefined;
  let position = positions[0]; //add first point
  let nextPosition = positions[1];

  forward = Cartesian3.normalize(
    Cartesian3.subtract(nextPosition, position, forward),
    forward
  );
  normal = ellipsoid.geodeticSurfaceNormal(position, normal);
  left = Cartesian3.normalize(Cartesian3.cross(normal, forward, left), left);
  if (saveAttributes) {
    calculatedLefts.push(left.x, left.y, left.z);
    calculatedNormals.push(normal.x, normal.y, normal.z);
  }
  previousPos = Cartesian3.clone(position, previousPos);
  position = nextPosition;
  backward = Cartesian3.negate(forward, backward);

  let subdividedPositions;
  const corners = [];
  let i;
  const length = positions.length;
  for (i = 1; i < length - 1; i++) {
    // add middle points and corners
    normal = ellipsoid.geodeticSurfaceNormal(position, normal);
    nextPosition = positions[i + 1];
    forward = Cartesian3.normalize(
      Cartesian3.subtract(nextPosition, position, forward),
      forward
    );
    cornerDirection = Cartesian3.normalize(
      Cartesian3.add(forward, backward, cornerDirection),
      cornerDirection
    );

    const forwardProjection = Cartesian3.multiplyByScalar(
      normal,
      Cartesian3.dot(forward, normal),
      scratchForwardProjection
    );
    Cartesian3.subtract(forward, forwardProjection, forwardProjection);
    Cartesian3.normalize(forwardProjection, forwardProjection);

    const backwardProjection = Cartesian3.multiplyByScalar(
      normal,
      Cartesian3.dot(backward, normal),
      scratchBackwardProjection
    );
    Cartesian3.subtract(backward, backwardProjection, backwardProjection);
    Cartesian3.normalize(backwardProjection, backwardProjection);

    const doCorner = !CesiumMath.equalsEpsilon(
      Math.abs(Cartesian3.dot(forwardProjection, backwardProjection)),
      1.0,
      CesiumMath.EPSILON7
    );

    if (doCorner) {
      cornerDirection = Cartesian3.cross(
        cornerDirection,
        normal,
        cornerDirection
      );
      cornerDirection = Cartesian3.cross(
        normal,
        cornerDirection,
        cornerDirection
      );
      cornerDirection = Cartesian3.normalize(cornerDirection, cornerDirection);
      const scalar =
        width /
        Math.max(
          0.25,
          Cartesian3.magnitude(
            Cartesian3.cross(cornerDirection, backward, scratch1)
          )
        );
      const leftIsOutside = PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(
        forward,
        backward,
        position,
        ellipsoid
      );
      cornerDirection = Cartesian3.multiplyByScalar(
        cornerDirection,
        scalar,
        cornerDirection
      );
      if (leftIsOutside) {
        rightPos = Cartesian3.add(position, cornerDirection, rightPos);
        center = Cartesian3.add(
          rightPos,
          Cartesian3.multiplyByScalar(left, width, center),
          center
        );
        leftPos = Cartesian3.add(
          rightPos,
          Cartesian3.multiplyByScalar(left, width * 2, leftPos),
          leftPos
        );
        scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
        subdividedPositions = PolylinePipeline.generateArc({
          positions: scaleArray2,
          granularity: granularity,
          ellipsoid: ellipsoid,
        });
        calculatedPositions = addShiftedPositions(
          subdividedPositions,
          left,
          width,
          calculatedPositions
        );
        if (saveAttributes) {
          calculatedLefts.push(left.x, left.y, left.z);
          calculatedNormals.push(normal.x, normal.y, normal.z);
        }
        startPoint = Cartesian3.clone(leftPos, startPoint);
        left = Cartesian3.normalize(
          Cartesian3.cross(normal, forward, left),
          left
        );
        leftPos = Cartesian3.add(
          rightPos,
          Cartesian3.multiplyByScalar(left, width * 2, leftPos),
          leftPos
        );
        previousPos = Cartesian3.add(
          rightPos,
          Cartesian3.multiplyByScalar(left, width, previousPos),
          previousPos
        );
        if (
          cornerType === CornerType.ROUNDED ||
          cornerType === CornerType.BEVELED
        ) {
          corners.push({
            leftPositions: computeRoundCorner(
              rightPos,
              startPoint,
              leftPos,
              cornerType,
              leftIsOutside
            ),
          });
        } else {
          corners.push({
            leftPositions: computeMiteredCorner(
              position,
              Cartesian3.negate(cornerDirection, cornerDirection),
              leftPos,
              leftIsOutside
            ),
          });
        }
      } else {
        leftPos = Cartesian3.add(position, cornerDirection, leftPos);
        center = Cartesian3.add(
          leftPos,
          Cartesian3.negate(
            Cartesian3.multiplyByScalar(left, width, center),
            center
          ),
          center
        );
        rightPos = Cartesian3.add(
          leftPos,
          Cartesian3.negate(
            Cartesian3.multiplyByScalar(left, width * 2, rightPos),
            rightPos
          ),
          rightPos
        );
        scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
        scaleArray2[1] = Cartesian3.clone(center, scaleArray2[1]);
        subdividedPositions = PolylinePipeline.generateArc({
          positions: scaleArray2,
          granularity: granularity,
          ellipsoid: ellipsoid,
        });
        calculatedPositions = addShiftedPositions(
          subdividedPositions,
          left,
          width,
          calculatedPositions
        );
        if (saveAttributes) {
          calculatedLefts.push(left.x, left.y, left.z);
          calculatedNormals.push(normal.x, normal.y, normal.z);
        }
        startPoint = Cartesian3.clone(rightPos, startPoint);
        left = Cartesian3.normalize(
          Cartesian3.cross(normal, forward, left),
          left
        );
        rightPos = Cartesian3.add(
          leftPos,
          Cartesian3.negate(
            Cartesian3.multiplyByScalar(left, width * 2, rightPos),
            rightPos
          ),
          rightPos
        );
        previousPos = Cartesian3.add(
          leftPos,
          Cartesian3.negate(
            Cartesian3.multiplyByScalar(left, width, previousPos),
            previousPos
          ),
          previousPos
        );
        if (
          cornerType === CornerType.ROUNDED ||
          cornerType === CornerType.BEVELED
        ) {
          corners.push({
            rightPositions: computeRoundCorner(
              leftPos,
              startPoint,
              rightPos,
              cornerType,
              leftIsOutside
            ),
          });
        } else {
          corners.push({
            rightPositions: computeMiteredCorner(
              position,
              cornerDirection,
              rightPos,
              leftIsOutside
            ),
          });
        }
      }
      backward = Cartesian3.negate(forward, backward);
    }
    position = nextPosition;
  }

  normal = ellipsoid.geodeticSurfaceNormal(position, normal);
  scaleArray2[0] = Cartesian3.clone(previousPos, scaleArray2[0]);
  scaleArray2[1] = Cartesian3.clone(position, scaleArray2[1]);
  subdividedPositions = PolylinePipeline.generateArc({
    positions: scaleArray2,
    granularity: granularity,
    ellipsoid: ellipsoid,
  });
  calculatedPositions = addShiftedPositions(
    subdividedPositions,
    left,
    width,
    calculatedPositions
  );
  if (saveAttributes) {
    calculatedLefts.push(left.x, left.y, left.z);
    calculatedNormals.push(normal.x, normal.y, normal.z);
  }

  let endPositions;
  if (cornerType === CornerType.ROUNDED) {
    endPositions = addEndCaps(calculatedPositions);
  }

  return {
    positions: calculatedPositions,
    corners: corners,
    lefts: calculatedLefts,
    normals: calculatedNormals,
    endPositions: endPositions,
  };
};
export default CorridorGeometryLibrary;
