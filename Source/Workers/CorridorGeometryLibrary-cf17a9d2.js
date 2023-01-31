/* This file is automatically rebuilt by the Cesium build process. */
define(['exports', './Cartesian2-ea36f114', './PolylineVolumeGeometryLibrary-e3fa0fe8', './when-9f8cafad', './Math-cf2f57e0', './Transforms-0a60c469', './PolylinePipeline-489d0ce2'], function (exports, Cartesian2, PolylineVolumeGeometryLibrary, when, _Math, Transforms, PolylinePipeline) { 'use strict';

  /**
   * @private
   */
  var CorridorGeometryLibrary = {};

  var scratch1 = new Cartesian2.Cartesian3();
  var scratch2 = new Cartesian2.Cartesian3();
  var scratch3 = new Cartesian2.Cartesian3();
  var scratch4 = new Cartesian2.Cartesian3();

  var scaleArray2 = [new Cartesian2.Cartesian3(), new Cartesian2.Cartesian3()];

  var cartesian1 = new Cartesian2.Cartesian3();
  var cartesian2 = new Cartesian2.Cartesian3();
  var cartesian3 = new Cartesian2.Cartesian3();
  var cartesian4 = new Cartesian2.Cartesian3();
  var cartesian5 = new Cartesian2.Cartesian3();
  var cartesian6 = new Cartesian2.Cartesian3();
  var cartesian7 = new Cartesian2.Cartesian3();
  var cartesian8 = new Cartesian2.Cartesian3();
  var cartesian9 = new Cartesian2.Cartesian3();
  var cartesian10 = new Cartesian2.Cartesian3();

  var quaterion = new Transforms.Quaternion();
  var rotMatrix = new Transforms.Matrix3();
  function computeRoundCorner(
    cornerPoint,
    startPoint,
    endPoint,
    cornerType,
    leftIsOutside
  ) {
    var angle = Cartesian2.Cartesian3.angleBetween(
      Cartesian2.Cartesian3.subtract(startPoint, cornerPoint, scratch1),
      Cartesian2.Cartesian3.subtract(endPoint, cornerPoint, scratch2)
    );
    var granularity =
      cornerType === PolylineVolumeGeometryLibrary.CornerType.BEVELED
        ? 1
        : Math.ceil(angle / _Math.CesiumMath.toRadians(5)) + 1;

    var size = granularity * 3;
    var array = new Array(size);

    array[size - 3] = endPoint.x;
    array[size - 2] = endPoint.y;
    array[size - 1] = endPoint.z;

    var m;
    if (leftIsOutside) {
      m = Transforms.Matrix3.fromQuaternion(
        Transforms.Quaternion.fromAxisAngle(
          Cartesian2.Cartesian3.negate(cornerPoint, scratch1),
          angle / granularity,
          quaterion
        ),
        rotMatrix
      );
    } else {
      m = Transforms.Matrix3.fromQuaternion(
        Transforms.Quaternion.fromAxisAngle(cornerPoint, angle / granularity, quaterion),
        rotMatrix
      );
    }

    var index = 0;
    startPoint = Cartesian2.Cartesian3.clone(startPoint, scratch1);
    for (var i = 0; i < granularity; i++) {
      startPoint = Transforms.Matrix3.multiplyByVector(m, startPoint, startPoint);
      array[index++] = startPoint.x;
      array[index++] = startPoint.y;
      array[index++] = startPoint.z;
    }

    return array;
  }

  function addEndCaps(calculatedPositions) {
    var cornerPoint = cartesian1;
    var startPoint = cartesian2;
    var endPoint = cartesian3;

    var leftEdge = calculatedPositions[1];
    startPoint = Cartesian2.Cartesian3.fromArray(
      calculatedPositions[1],
      leftEdge.length - 3,
      startPoint
    );
    endPoint = Cartesian2.Cartesian3.fromArray(calculatedPositions[0], 0, endPoint);
    cornerPoint = Cartesian2.Cartesian3.midpoint(startPoint, endPoint, cornerPoint);
    var firstEndCap = computeRoundCorner(
      cornerPoint,
      startPoint,
      endPoint,
      PolylineVolumeGeometryLibrary.CornerType.ROUNDED,
      false
    );

    var length = calculatedPositions.length - 1;
    var rightEdge = calculatedPositions[length - 1];
    leftEdge = calculatedPositions[length];
    startPoint = Cartesian2.Cartesian3.fromArray(
      rightEdge,
      rightEdge.length - 3,
      startPoint
    );
    endPoint = Cartesian2.Cartesian3.fromArray(leftEdge, 0, endPoint);
    cornerPoint = Cartesian2.Cartesian3.midpoint(startPoint, endPoint, cornerPoint);
    var lastEndCap = computeRoundCorner(
      cornerPoint,
      startPoint,
      endPoint,
      PolylineVolumeGeometryLibrary.CornerType.ROUNDED,
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
    var cornerPoint = scratch1;
    if (leftIsOutside) {
      cornerPoint = Cartesian2.Cartesian3.add(position, leftCornerDirection, cornerPoint);
    } else {
      leftCornerDirection = Cartesian2.Cartesian3.negate(
        leftCornerDirection,
        leftCornerDirection
      );
      cornerPoint = Cartesian2.Cartesian3.add(position, leftCornerDirection, cornerPoint);
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
    var rightPositions = new Array(positions.length);
    var leftPositions = new Array(positions.length);
    var scaledLeft = Cartesian2.Cartesian3.multiplyByScalar(left, scalar, scratch1);
    var scaledRight = Cartesian2.Cartesian3.negate(scaledLeft, scratch2);
    var rightIndex = 0;
    var leftIndex = positions.length - 1;

    for (var i = 0; i < positions.length; i += 3) {
      var pos = Cartesian2.Cartesian3.fromArray(positions, i, scratch3);
      var rightPos = Cartesian2.Cartesian3.add(pos, scaledRight, scratch4);
      rightPositions[rightIndex++] = rightPos.x;
      rightPositions[rightIndex++] = rightPos.y;
      rightPositions[rightIndex++] = rightPos.z;

      var leftPos = Cartesian2.Cartesian3.add(pos, scaledLeft, scratch4);
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
    var x = value.x;
    var y = value.y;
    var z = value.z;
    if (when.defined(front)) {
      attribute[front] = x;
      attribute[front + 1] = y;
      attribute[front + 2] = z;
    }
    if (when.defined(back)) {
      attribute[back] = z;
      attribute[back - 1] = y;
      attribute[back - 2] = x;
    }
  };

  var scratchForwardProjection = new Cartesian2.Cartesian3();
  var scratchBackwardProjection = new Cartesian2.Cartesian3();

  /**
   * @private
   */
  CorridorGeometryLibrary.computePositions = function (params) {
    var granularity = params.granularity;
    var positions = params.positions;
    var ellipsoid = params.ellipsoid;
    var width = params.width / 2;
    var cornerType = params.cornerType;
    var saveAttributes = params.saveAttributes;
    var normal = cartesian1;
    var forward = cartesian2;
    var backward = cartesian3;
    var left = cartesian4;
    var cornerDirection = cartesian5;
    var startPoint = cartesian6;
    var previousPos = cartesian7;
    var rightPos = cartesian8;
    var leftPos = cartesian9;
    var center = cartesian10;
    var calculatedPositions = [];
    var calculatedLefts = saveAttributes ? [] : undefined;
    var calculatedNormals = saveAttributes ? [] : undefined;
    var position = positions[0]; //add first point
    var nextPosition = positions[1];

    forward = Cartesian2.Cartesian3.normalize(
      Cartesian2.Cartesian3.subtract(nextPosition, position, forward),
      forward
    );
    normal = ellipsoid.geodeticSurfaceNormal(position, normal);
    left = Cartesian2.Cartesian3.normalize(Cartesian2.Cartesian3.cross(normal, forward, left), left);
    if (saveAttributes) {
      calculatedLefts.push(left.x, left.y, left.z);
      calculatedNormals.push(normal.x, normal.y, normal.z);
    }
    previousPos = Cartesian2.Cartesian3.clone(position, previousPos);
    position = nextPosition;
    backward = Cartesian2.Cartesian3.negate(forward, backward);

    var subdividedPositions;
    var corners = [];
    var i;
    var length = positions.length;
    for (i = 1; i < length - 1; i++) {
      // add middle points and corners
      normal = ellipsoid.geodeticSurfaceNormal(position, normal);
      nextPosition = positions[i + 1];
      forward = Cartesian2.Cartesian3.normalize(
        Cartesian2.Cartesian3.subtract(nextPosition, position, forward),
        forward
      );
      cornerDirection = Cartesian2.Cartesian3.normalize(
        Cartesian2.Cartesian3.add(forward, backward, cornerDirection),
        cornerDirection
      );

      var forwardProjection = Cartesian2.Cartesian3.multiplyByScalar(
        normal,
        Cartesian2.Cartesian3.dot(forward, normal),
        scratchForwardProjection
      );
      Cartesian2.Cartesian3.subtract(forward, forwardProjection, forwardProjection);
      Cartesian2.Cartesian3.normalize(forwardProjection, forwardProjection);

      var backwardProjection = Cartesian2.Cartesian3.multiplyByScalar(
        normal,
        Cartesian2.Cartesian3.dot(backward, normal),
        scratchBackwardProjection
      );
      Cartesian2.Cartesian3.subtract(backward, backwardProjection, backwardProjection);
      Cartesian2.Cartesian3.normalize(backwardProjection, backwardProjection);

      var doCorner = !_Math.CesiumMath.equalsEpsilon(
        Math.abs(Cartesian2.Cartesian3.dot(forwardProjection, backwardProjection)),
        1.0,
        _Math.CesiumMath.EPSILON7
      );

      if (doCorner) {
        cornerDirection = Cartesian2.Cartesian3.cross(
          cornerDirection,
          normal,
          cornerDirection
        );
        cornerDirection = Cartesian2.Cartesian3.cross(
          normal,
          cornerDirection,
          cornerDirection
        );
        cornerDirection = Cartesian2.Cartesian3.normalize(cornerDirection, cornerDirection);
        var scalar =
          width /
          Math.max(
            0.25,
            Cartesian2.Cartesian3.magnitude(
              Cartesian2.Cartesian3.cross(cornerDirection, backward, scratch1)
            )
          );
        var leftIsOutside = PolylineVolumeGeometryLibrary.PolylineVolumeGeometryLibrary.angleIsGreaterThanPi(
          forward,
          backward,
          position,
          ellipsoid
        );
        cornerDirection = Cartesian2.Cartesian3.multiplyByScalar(
          cornerDirection,
          scalar,
          cornerDirection
        );
        if (leftIsOutside) {
          rightPos = Cartesian2.Cartesian3.add(position, cornerDirection, rightPos);
          center = Cartesian2.Cartesian3.add(
            rightPos,
            Cartesian2.Cartesian3.multiplyByScalar(left, width, center),
            center
          );
          leftPos = Cartesian2.Cartesian3.add(
            rightPos,
            Cartesian2.Cartesian3.multiplyByScalar(left, width * 2, leftPos),
            leftPos
          );
          scaleArray2[0] = Cartesian2.Cartesian3.clone(previousPos, scaleArray2[0]);
          scaleArray2[1] = Cartesian2.Cartesian3.clone(center, scaleArray2[1]);
          subdividedPositions = PolylinePipeline.PolylinePipeline.generateArc({
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
          startPoint = Cartesian2.Cartesian3.clone(leftPos, startPoint);
          left = Cartesian2.Cartesian3.normalize(
            Cartesian2.Cartesian3.cross(normal, forward, left),
            left
          );
          leftPos = Cartesian2.Cartesian3.add(
            rightPos,
            Cartesian2.Cartesian3.multiplyByScalar(left, width * 2, leftPos),
            leftPos
          );
          previousPos = Cartesian2.Cartesian3.add(
            rightPos,
            Cartesian2.Cartesian3.multiplyByScalar(left, width, previousPos),
            previousPos
          );
          if (
            cornerType === PolylineVolumeGeometryLibrary.CornerType.ROUNDED ||
            cornerType === PolylineVolumeGeometryLibrary.CornerType.BEVELED
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
                Cartesian2.Cartesian3.negate(cornerDirection, cornerDirection),
                leftPos,
                leftIsOutside
              ),
            });
          }
        } else {
          leftPos = Cartesian2.Cartesian3.add(position, cornerDirection, leftPos);
          center = Cartesian2.Cartesian3.add(
            leftPos,
            Cartesian2.Cartesian3.negate(
              Cartesian2.Cartesian3.multiplyByScalar(left, width, center),
              center
            ),
            center
          );
          rightPos = Cartesian2.Cartesian3.add(
            leftPos,
            Cartesian2.Cartesian3.negate(
              Cartesian2.Cartesian3.multiplyByScalar(left, width * 2, rightPos),
              rightPos
            ),
            rightPos
          );
          scaleArray2[0] = Cartesian2.Cartesian3.clone(previousPos, scaleArray2[0]);
          scaleArray2[1] = Cartesian2.Cartesian3.clone(center, scaleArray2[1]);
          subdividedPositions = PolylinePipeline.PolylinePipeline.generateArc({
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
          startPoint = Cartesian2.Cartesian3.clone(rightPos, startPoint);
          left = Cartesian2.Cartesian3.normalize(
            Cartesian2.Cartesian3.cross(normal, forward, left),
            left
          );
          rightPos = Cartesian2.Cartesian3.add(
            leftPos,
            Cartesian2.Cartesian3.negate(
              Cartesian2.Cartesian3.multiplyByScalar(left, width * 2, rightPos),
              rightPos
            ),
            rightPos
          );
          previousPos = Cartesian2.Cartesian3.add(
            leftPos,
            Cartesian2.Cartesian3.negate(
              Cartesian2.Cartesian3.multiplyByScalar(left, width, previousPos),
              previousPos
            ),
            previousPos
          );
          if (
            cornerType === PolylineVolumeGeometryLibrary.CornerType.ROUNDED ||
            cornerType === PolylineVolumeGeometryLibrary.CornerType.BEVELED
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
        backward = Cartesian2.Cartesian3.negate(forward, backward);
      }
      position = nextPosition;
    }

    normal = ellipsoid.geodeticSurfaceNormal(position, normal);
    scaleArray2[0] = Cartesian2.Cartesian3.clone(previousPos, scaleArray2[0]);
    scaleArray2[1] = Cartesian2.Cartesian3.clone(position, scaleArray2[1]);
    subdividedPositions = PolylinePipeline.PolylinePipeline.generateArc({
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

    var endPositions;
    if (cornerType === PolylineVolumeGeometryLibrary.CornerType.ROUNDED) {
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

  exports.CorridorGeometryLibrary = CorridorGeometryLibrary;

});
