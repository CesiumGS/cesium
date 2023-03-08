define(['exports', './Matrix3-315394f6', './Math-2dbd6b93', './Transforms-26539bce'], (function (exports, Matrix3, Math$1, Transforms) { 'use strict';

  const EllipseGeometryLibrary = {};

  const rotAxis = new Matrix3.Cartesian3();
  const tempVec = new Matrix3.Cartesian3();
  const unitQuat = new Transforms.Quaternion();
  const rotMtx = new Matrix3.Matrix3();

  function pointOnEllipsoid(
    theta,
    rotation,
    northVec,
    eastVec,
    aSqr,
    ab,
    bSqr,
    mag,
    unitPos,
    result
  ) {
    const azimuth = theta + rotation;

    Matrix3.Cartesian3.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
    Matrix3.Cartesian3.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
    Matrix3.Cartesian3.add(rotAxis, tempVec, rotAxis);

    let cosThetaSquared = Math.cos(theta);
    cosThetaSquared = cosThetaSquared * cosThetaSquared;

    let sinThetaSquared = Math.sin(theta);
    sinThetaSquared = sinThetaSquared * sinThetaSquared;

    const radius =
      ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
    const angle = radius / mag;

    // Create the quaternion to rotate the position vector to the boundary of the ellipse.
    Transforms.Quaternion.fromAxisAngle(rotAxis, angle, unitQuat);
    Matrix3.Matrix3.fromQuaternion(unitQuat, rotMtx);

    Matrix3.Matrix3.multiplyByVector(rotMtx, unitPos, result);
    Matrix3.Cartesian3.normalize(result, result);
    Matrix3.Cartesian3.multiplyByScalar(result, mag, result);
    return result;
  }

  const scratchCartesian1 = new Matrix3.Cartesian3();
  const scratchCartesian2 = new Matrix3.Cartesian3();
  const scratchCartesian3 = new Matrix3.Cartesian3();
  const scratchNormal = new Matrix3.Cartesian3();
  /**
   * Returns the positions raised to the given heights
   * @private
   */
  EllipseGeometryLibrary.raisePositionsToHeight = function (
    positions,
    options,
    extrude
  ) {
    const ellipsoid = options.ellipsoid;
    const height = options.height;
    const extrudedHeight = options.extrudedHeight;
    const size = extrude ? (positions.length / 3) * 2 : positions.length / 3;

    const finalPositions = new Float64Array(size * 3);

    const length = positions.length;
    const bottomOffset = extrude ? length : 0;
    for (let i = 0; i < length; i += 3) {
      const i1 = i + 1;
      const i2 = i + 2;

      const position = Matrix3.Cartesian3.fromArray(positions, i, scratchCartesian1);
      ellipsoid.scaleToGeodeticSurface(position, position);

      const extrudedPosition = Matrix3.Cartesian3.clone(position, scratchCartesian2);
      const normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
      const scaledNormal = Matrix3.Cartesian3.multiplyByScalar(
        normal,
        height,
        scratchCartesian3
      );
      Matrix3.Cartesian3.add(position, scaledNormal, position);

      if (extrude) {
        Matrix3.Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
        Matrix3.Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

        finalPositions[i + bottomOffset] = extrudedPosition.x;
        finalPositions[i1 + bottomOffset] = extrudedPosition.y;
        finalPositions[i2 + bottomOffset] = extrudedPosition.z;
      }

      finalPositions[i] = position.x;
      finalPositions[i1] = position.y;
      finalPositions[i2] = position.z;
    }

    return finalPositions;
  };

  const unitPosScratch = new Matrix3.Cartesian3();
  const eastVecScratch = new Matrix3.Cartesian3();
  const northVecScratch = new Matrix3.Cartesian3();
  /**
   * Returns an array of positions that make up the ellipse.
   * @private
   */
  EllipseGeometryLibrary.computeEllipsePositions = function (
    options,
    addFillPositions,
    addEdgePositions
  ) {
    const semiMinorAxis = options.semiMinorAxis;
    const semiMajorAxis = options.semiMajorAxis;
    const rotation = options.rotation;
    const center = options.center;

    // Computing the arc-length of the ellipse is too expensive to be practical. Estimating it using the
    // arc length of the sphere is too inaccurate and creates sharp edges when either the semi-major or
    // semi-minor axis is much bigger than the other. Instead, scale the angle delta to make
    // the distance along the ellipse boundary more closely match the granularity.
    const granularity = options.granularity * 8.0;

    const aSqr = semiMinorAxis * semiMinorAxis;
    const bSqr = semiMajorAxis * semiMajorAxis;
    const ab = semiMajorAxis * semiMinorAxis;

    const mag = Matrix3.Cartesian3.magnitude(center);

    const unitPos = Matrix3.Cartesian3.normalize(center, unitPosScratch);
    let eastVec = Matrix3.Cartesian3.cross(Matrix3.Cartesian3.UNIT_Z, center, eastVecScratch);
    eastVec = Matrix3.Cartesian3.normalize(eastVec, eastVec);
    const northVec = Matrix3.Cartesian3.cross(unitPos, eastVec, northVecScratch);

    // The number of points in the first quadrant
    let numPts = 1 + Math.ceil(Math$1.CesiumMath.PI_OVER_TWO / granularity);

    const deltaTheta = Math$1.CesiumMath.PI_OVER_TWO / (numPts - 1);
    let theta = Math$1.CesiumMath.PI_OVER_TWO - numPts * deltaTheta;
    if (theta < 0.0) {
      numPts -= Math.ceil(Math.abs(theta) / deltaTheta);
    }

    // If the number of points were three, the ellipse
    // would be tessellated like below:
    //
    //         *---*
    //       / | \ | \
    //     *---*---*---*
    //   / | \ | \ | \ | \
    //  / .*---*---*---*. \
    // * ` | \ | \ | \ | `*
    //  \`.*---*---*---*.`/
    //   \ | \ | \ | \ | /
    //     *---*---*---*
    //       \ | \ | /
    //         *---*
    // The first and last column have one position and fan to connect to the adjacent column.
    // Each other vertical column contains an even number of positions.
    const size = 2 * (numPts * (numPts + 2));
    const positions = addFillPositions ? new Array(size * 3) : undefined;
    let positionIndex = 0;
    let position = scratchCartesian1;
    let reflectedPosition = scratchCartesian2;

    const outerPositionsLength = numPts * 4 * 3;
    let outerRightIndex = outerPositionsLength - 1;
    let outerLeftIndex = 0;
    const outerPositions = addEdgePositions
      ? new Array(outerPositionsLength)
      : undefined;

    let i;
    let j;
    let numInterior;
    let t;
    let interiorPosition;

    // Compute points in the 'eastern' half of the ellipse
    theta = Math$1.CesiumMath.PI_OVER_TWO;
    position = pointOnEllipsoid(
      theta,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      position
    );
    if (addFillPositions) {
      positions[positionIndex++] = position.x;
      positions[positionIndex++] = position.y;
      positions[positionIndex++] = position.z;
    }
    if (addEdgePositions) {
      outerPositions[outerRightIndex--] = position.z;
      outerPositions[outerRightIndex--] = position.y;
      outerPositions[outerRightIndex--] = position.x;
    }
    theta = Math$1.CesiumMath.PI_OVER_TWO - deltaTheta;
    for (i = 1; i < numPts + 1; ++i) {
      position = pointOnEllipsoid(
        theta,
        rotation,
        northVec,
        eastVec,
        aSqr,
        ab,
        bSqr,
        mag,
        unitPos,
        position
      );
      reflectedPosition = pointOnEllipsoid(
        Math.PI - theta,
        rotation,
        northVec,
        eastVec,
        aSqr,
        ab,
        bSqr,
        mag,
        unitPos,
        reflectedPosition
      );

      if (addFillPositions) {
        positions[positionIndex++] = position.x;
        positions[positionIndex++] = position.y;
        positions[positionIndex++] = position.z;

        numInterior = 2 * i + 2;
        for (j = 1; j < numInterior - 1; ++j) {
          t = j / (numInterior - 1);
          interiorPosition = Matrix3.Cartesian3.lerp(
            position,
            reflectedPosition,
            t,
            scratchCartesian3
          );
          positions[positionIndex++] = interiorPosition.x;
          positions[positionIndex++] = interiorPosition.y;
          positions[positionIndex++] = interiorPosition.z;
        }

        positions[positionIndex++] = reflectedPosition.x;
        positions[positionIndex++] = reflectedPosition.y;
        positions[positionIndex++] = reflectedPosition.z;
      }

      if (addEdgePositions) {
        outerPositions[outerRightIndex--] = position.z;
        outerPositions[outerRightIndex--] = position.y;
        outerPositions[outerRightIndex--] = position.x;
        outerPositions[outerLeftIndex++] = reflectedPosition.x;
        outerPositions[outerLeftIndex++] = reflectedPosition.y;
        outerPositions[outerLeftIndex++] = reflectedPosition.z;
      }

      theta = Math$1.CesiumMath.PI_OVER_TWO - (i + 1) * deltaTheta;
    }

    // Compute points in the 'western' half of the ellipse
    for (i = numPts; i > 1; --i) {
      theta = Math$1.CesiumMath.PI_OVER_TWO - (i - 1) * deltaTheta;

      position = pointOnEllipsoid(
        -theta,
        rotation,
        northVec,
        eastVec,
        aSqr,
        ab,
        bSqr,
        mag,
        unitPos,
        position
      );
      reflectedPosition = pointOnEllipsoid(
        theta + Math.PI,
        rotation,
        northVec,
        eastVec,
        aSqr,
        ab,
        bSqr,
        mag,
        unitPos,
        reflectedPosition
      );

      if (addFillPositions) {
        positions[positionIndex++] = position.x;
        positions[positionIndex++] = position.y;
        positions[positionIndex++] = position.z;

        numInterior = 2 * (i - 1) + 2;
        for (j = 1; j < numInterior - 1; ++j) {
          t = j / (numInterior - 1);
          interiorPosition = Matrix3.Cartesian3.lerp(
            position,
            reflectedPosition,
            t,
            scratchCartesian3
          );
          positions[positionIndex++] = interiorPosition.x;
          positions[positionIndex++] = interiorPosition.y;
          positions[positionIndex++] = interiorPosition.z;
        }

        positions[positionIndex++] = reflectedPosition.x;
        positions[positionIndex++] = reflectedPosition.y;
        positions[positionIndex++] = reflectedPosition.z;
      }

      if (addEdgePositions) {
        outerPositions[outerRightIndex--] = position.z;
        outerPositions[outerRightIndex--] = position.y;
        outerPositions[outerRightIndex--] = position.x;
        outerPositions[outerLeftIndex++] = reflectedPosition.x;
        outerPositions[outerLeftIndex++] = reflectedPosition.y;
        outerPositions[outerLeftIndex++] = reflectedPosition.z;
      }
    }

    theta = Math$1.CesiumMath.PI_OVER_TWO;
    position = pointOnEllipsoid(
      -theta,
      rotation,
      northVec,
      eastVec,
      aSqr,
      ab,
      bSqr,
      mag,
      unitPos,
      position
    );

    const r = {};
    if (addFillPositions) {
      positions[positionIndex++] = position.x;
      positions[positionIndex++] = position.y;
      positions[positionIndex++] = position.z;
      r.positions = positions;
      r.numPts = numPts;
    }
    if (addEdgePositions) {
      outerPositions[outerRightIndex--] = position.z;
      outerPositions[outerRightIndex--] = position.y;
      outerPositions[outerRightIndex--] = position.x;
      r.outerPositions = outerPositions;
    }

    return r;
  };
  var EllipseGeometryLibrary$1 = EllipseGeometryLibrary;

  exports.EllipseGeometryLibrary = EllipseGeometryLibrary$1;

}));
