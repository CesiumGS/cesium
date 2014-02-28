/*global define*/
define([
        './Cartesian3',
        './Math',
        './Matrix3',
        './Quaternion'
    ], function(
        Cartesian3,
        CesiumMath,
        Matrix3,
        Quaternion) {
    "use strict";

    var EllipseGeometryLibrary = {};

    var rotAxis = new Cartesian3();
    var tempVec = new Cartesian3();
    var unitQuat = new Quaternion();
    var rotMtx = new Matrix3();

    function pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
        var azimuth = theta + rotation;

        Cartesian3.multiplyByScalar(eastVec, Math.cos(azimuth), rotAxis);
        Cartesian3.multiplyByScalar(northVec, Math.sin(azimuth), tempVec);
        Cartesian3.add(rotAxis, tempVec, rotAxis);

        var cosThetaSquared = Math.cos(theta);
        cosThetaSquared = cosThetaSquared * cosThetaSquared;

        var sinThetaSquared = Math.sin(theta);
        sinThetaSquared = sinThetaSquared * sinThetaSquared;

        var radius = ab / Math.sqrt(bSqr * cosThetaSquared + aSqr * sinThetaSquared);
        var angle = radius / mag;

        // Create the quaternion to rotate the position vector to the boundary of the ellipse.
        Quaternion.fromAxisAngle(rotAxis, angle, unitQuat);
        Matrix3.fromQuaternion(unitQuat, rotMtx);

        Matrix3.multiplyByVector(rotMtx, unitPos, result);
        Cartesian3.normalize(result, result);
        Cartesian3.multiplyByScalar(result, mag, result);
        return result;
    }

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchNormal = new Cartesian3();
    /**
     * Returns the positions raised to the given heights
     * @private
     */
    EllipseGeometryLibrary.raisePositionsToHeight = function(positions, options, extrude) {
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var size = (extrude) ? positions.length / 3 * 2 : positions.length / 3;

        var finalPositions = new Float64Array(size * 3);
        var normal = scratchNormal;

        var length = positions.length;
        var bottomOffset = (extrude) ? length : 0;
        for (var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            position = ellipsoid.scaleToGeodeticSurface(position, position);
            extrudedPosition = Cartesian3.clone(position, scratchCartesian2);
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian3);
            position = Cartesian3.add(position, scaledNormal, position);

            if (extrude) {
                scaledNormal = Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
                extrudedPosition = Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

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

    var unitPosScratch = new Cartesian3();
    var eastVecScratch = new Cartesian3();
    var northVecScratch = new Cartesian3();
    /**
     * Returns an array of positions that make up the ellipse.
     * @private
     */
    EllipseGeometryLibrary.computeEllipsePositions = function(options, addFillPositions, addEdgePositions) {
        var semiMinorAxis = options.semiMinorAxis;
        var semiMajorAxis = options.semiMajorAxis;
        var rotation = options.rotation;
        var center = options.center;
        var granularity = options.granularity;

        var MAX_ANOMALY_LIMIT = 2.31;

        var aSqr = semiMinorAxis * semiMinorAxis;
        var bSqr = semiMajorAxis * semiMajorAxis;
        var ab = semiMajorAxis * semiMinorAxis;

        var mag = Cartesian3.magnitude(center);

        var unitPos = Cartesian3.normalize(center, unitPosScratch);
        var eastVec = Cartesian3.cross(Cartesian3.UNIT_Z, center, eastVecScratch);
        eastVec = Cartesian3.normalize(eastVec, eastVec);
        var northVec = Cartesian3.cross(unitPos, eastVec, northVecScratch);

        // The number of points in the first quadrant
        var numPts = 1 + Math.ceil(CesiumMath.PI_OVER_TWO / granularity);
        var deltaTheta = MAX_ANOMALY_LIMIT / (numPts - 1);

        // If the number of points were three, the ellipse
        // would be tessellated like below:
        //
        //         *---*
        //       / | \ | \
        //     *---*---*---*
        //   / | \ | \ | \ | \
        // *---*---*---*---*---*
        // | \ | \ | \ | \ | \ |
        // *---*---*---*---*---*
        //   \ | \ | \ | \ | /
        //     *---*---*---*
        //       \ | \ | /
        //         *---*
        // Notice each vertical column contains an even number of positions.
        // The sum of the first n even numbers is n * (n + 1). Double it for the number of points
        // for the whole ellipse. Note: this is just an estimate and may actually be less depending
        // on the number of iterations before the angle reaches pi/2.
        var size = 2 * numPts * (numPts + 1);
        var positions = (addFillPositions) ? new Array(size * 3) : undefined;
        var positionIndex = 0;
        var position = scratchCartesian1;
        var reflectedPosition = scratchCartesian2;

        var outerLeft = (addEdgePositions) ? [] : undefined;
        var outerRight = (addEdgePositions) ? [] : undefined;

        var i;
        var j;
        var numInterior;
        var t;
        var interiorPosition;

        // Compute points in the 'northern' half of the ellipse
        var theta = CesiumMath.PI_OVER_TWO;
        for (i = 0; i < numPts && theta > 0; ++i) {
            position = pointOnEllipsoid(theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(Math.PI - theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            if (addFillPositions) {
                positions[positionIndex++] = position.x;
                positions[positionIndex++] = position.y;
                positions[positionIndex++] = position.z;

                numInterior = 2 * i + 2;
                for (j = 1; j < numInterior - 1; ++j) {
                    t = j / (numInterior - 1);
                    interiorPosition = Cartesian3.lerp(position, reflectedPosition, t, scratchCartesian3);
                    positions[positionIndex++] = interiorPosition.x;
                    positions[positionIndex++] = interiorPosition.y;
                    positions[positionIndex++] = interiorPosition.z;
                }

                positions[positionIndex++] = reflectedPosition.x;
                positions[positionIndex++] = reflectedPosition.y;
                positions[positionIndex++] = reflectedPosition.z;
            }

            if (addEdgePositions) {
                outerRight.unshift(position.x, position.y, position.z);
                if (i !== 0) {
                    outerLeft.push(reflectedPosition.x, reflectedPosition.y, reflectedPosition.z);
                }
            }

            theta = CesiumMath.PI_OVER_TWO - (i + 1) * deltaTheta;
        }

        // Set numPts if theta reached zero
        numPts = i;

        // Compute points in the 'southern' half of the ellipse
        for (i = numPts; i > 0; --i) {
            theta = CesiumMath.PI_OVER_TWO - (i - 1) * deltaTheta;

            position = pointOnEllipsoid(-theta, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
            reflectedPosition = pointOnEllipsoid(theta + Math.PI, rotation, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

            if (addFillPositions) {
                positions[positionIndex++] = position.x;
                positions[positionIndex++] = position.y;
                positions[positionIndex++] = position.z;

                numInterior = 2 * (i - 1) + 2;
                for (j = 1; j < numInterior - 1; ++j) {
                    t = j / (numInterior - 1);
                    interiorPosition = Cartesian3.lerp(position, reflectedPosition, t, scratchCartesian3);
                    positions[positionIndex++] = interiorPosition.x;
                    positions[positionIndex++] = interiorPosition.y;
                    positions[positionIndex++] = interiorPosition.z;
                }

                positions[positionIndex++] = reflectedPosition.x;
                positions[positionIndex++] = reflectedPosition.y;
                positions[positionIndex++] = reflectedPosition.z;
            }

            if (addEdgePositions) {
                outerRight.unshift(position.x, position.y, position.z);
                if (i !== 1) {
                    outerLeft.push(reflectedPosition.x, reflectedPosition.y, reflectedPosition.z);
                }
            }
        }

        var r = {};
        if (addFillPositions) {
            // The original length may have been an over-estimate
            if (positions.length !== positionIndex) {
                size = positionIndex / 3;
                positions.length = positionIndex;
            }
            r.positions = positions;
            r.numPts = numPts;
        }

        if (addEdgePositions) {
            r.outerPositions = outerRight.concat(outerLeft);
        }

        return r;
    };

    return EllipseGeometryLibrary;
});
