/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './Geometry',
        './GeometryPipeline',
        './GeometryInstance',
        './GeometryAttribute',
        './GeometryAttributes',
        './Math',
        './Matrix2',
        './Matrix3',
        './PrimitiveType',
        './Quaternion',
        './VertexFormat'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        Geometry,
        GeometryPipeline,
        GeometryInstance,
        GeometryAttribute,
        GeometryAttributes,
        CesiumMath,
        Matrix2,
        Matrix3,
        PrimitiveType,
        Quaternion,
        VertexFormat) {
    "use strict";

    var rotAxis = new Cartesian3();
    var tempVec = new Cartesian3();
    var unitQuat = new Quaternion();
    var rotMtx = new Matrix3();

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var texCoordScratch = new Cartesian2();
    var textureMatrixScratch = new Matrix3();
    var quaternionScratch = new Quaternion();

    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();

    var unitPosScratch = new Cartesian3();
    var eastVecScratch = new Cartesian3();
    var northVecScratch = new Cartesian3();
    var scratchCartographic = new Cartographic();
    var projectedCenterScratch = new Cartesian3();

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

    function computeTopBottomAttributes(positions, options, extrude) {
        var vertexFormat = options.vertexFormat;
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var stRotation = options.stRotation;
        var size = (extrude) ? positions.length / 3 * 2 : positions.length / 3;

        var finalPositions = new Float64Array(size * 3);
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Raise positions to a height above the ellipsoid and compute the
        // texture coordinates, normals, tangents, and binormals.
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;

        var projection = new GeographicProjection(ellipsoid);
        var projectedCenter = projection.project(ellipsoid.cartesianToCartographic(center, scratchCartographic), projectedCenterScratch);

        var geodeticNormal = ellipsoid.scaleToGeodeticSurface(center, scratchCartesian1);
        ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
        var rotation = Quaternion.fromAxisAngle(geodeticNormal, stRotation, quaternionScratch);
        var textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrixScratch);

        var length = positions.length;
        var bottomOffset = (extrude) ? length : 0;
        var stOffset = bottomOffset / 3 * 2;
        for ( var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            if (vertexFormat.st) {
                var rotatedPoint = Matrix3.multiplyByVector(textureMatrix, position, scratchCartesian2);
                var projectedPoint = projection.project(ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic), scratchCartesian3);
                projectedPoint = Cartesian3.subtract(projectedPoint, projectedCenter, projectedPoint);

                texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                texCoordScratch.y = (projectedPoint.y + semiMajorAxis) / (2.0 * semiMajorAxis);

                if (extrude) {
                    textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
                    textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;
                }

                textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
            }

            position = ellipsoid.scaleToGeodeticSurface(position, position);
            extrudedPosition = position.clone(scratchCartesian2);
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian4);
            position = Cartesian3.add(position, scaledNormal, position);

            if (extrude) {
                scaledNormal = Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
                extrudedPosition = Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);
            }

            if (vertexFormat.position) {
                if (extrude) {
                    finalPositions[i + bottomOffset] = extrudedPosition.x;
                    finalPositions[i1 + bottomOffset] = extrudedPosition.y;
                    finalPositions[i2 + bottomOffset] = extrudedPosition.z;
                }
                finalPositions[i] = position.x;
                finalPositions[i1] = position.y;
                finalPositions[i2] = position.z;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                }
                if (vertexFormat.normal) {
                    normals[i] = normal.x;
                    normals[i + 1] = normal.y;
                    normals[i + 2] = normal.z;
                    if (extrude) {
                        normals[i + bottomOffset] = -normal.x;
                        normals[i1 + bottomOffset] = -normal.y;
                        normals[i2 + bottomOffset] = -normal.z;
                    }
                }

                if (vertexFormat.tangent) {
                    tangents[i] = tangent.x;
                    tangents[i + 1] = tangent.y;
                    tangents[i + 2] = tangent.z;
                    if (extrude) {
                        tangents[i + bottomOffset] = -tangent.x;
                        tangents[i1 + bottomOffset] = -tangent.y;
                        tangents[i2 + bottomOffset] = -tangent.z;
                    }
                }

                if (vertexFormat.binormal) {
                    binormal = Cartesian3.cross(normal, tangent, binormal);
                    binormals[i] = binormal.x;
                    binormals[i1] = binormal.y;
                    binormals[i2] = binormal.z;
                    if (extrude) {
                        binormals[i + bottomOffset] = binormal.x;
                        binormals[i1 + bottomOffset] = binormal.y;
                        binormals[i2 + bottomOffset] = binormal.z;
                    }
                }
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }
        return attributes;
    }

    function computeEllipsePositions(options, doPerimeter) {
        var semiMinorAxis = options.semiMinorAxis;
        var semiMajorAxis = options.semiMajorAxis;
        var rotation = options.rotation;
        var center = options.center;
        var granularity = options.granularity;

        var MAX_ANOMALY_LIMIT = 2.31;

        var aSqr = semiMinorAxis * semiMinorAxis;
        var bSqr = semiMajorAxis * semiMajorAxis;
        var ab = semiMajorAxis * semiMinorAxis;

        var mag = center.magnitude();

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
        var positions = new Array(size * 3);
        var positionIndex = 0;
        var position = scratchCartesian1;
        var reflectedPosition = scratchCartesian2;

        var outerLeft;
        var outerRight;
        if (doPerimeter) {
            outerLeft = [];
            outerRight = [];
        }

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

            if (doPerimeter) {
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

            if (doPerimeter) {
                outerRight.unshift(position.x, position.y, position.z);
                if (i !== 1) {
                    outerLeft.push(reflectedPosition.x, reflectedPosition.y, reflectedPosition.z);
                }
            }
        }

        // The original length may have been an over-estimate
        if (positions.length !== positionIndex) {
            size = positionIndex / 3;
            positions.length = positionIndex;
        }

        var r = {
            positions : positions,
            numPts : numPts
        };

        if (doPerimeter) {
            r.outerPositions = outerRight.concat(outerLeft);
        }

        return r;
    }

    function topIndices(numPts) {
        // The number of triangles in the ellipse on the positive x half-space and for
        // the column of triangles in the middle is:
        //
        // numTriangles = 4 + 8 + 12 + ... = 4 + (4 + 4) + (4 + 4 + 4) + ... = 4 * (1 + 2 + 3 + ...)
        //              = 4 * ((n * ( n + 1)) / 2)
        // numColumnTriangles = 2 * 2 * n
        // total = 2 * numTrangles + numcolumnTriangles
        //
        // Substitute (numPts - 1.0) for n above
        var indices = new Array(2 * numPts * (numPts + 1));
        var indicesIndex = 0;
        var prevIndex;
        var numInterior;
        var positionIndex;
        var i;
        var j;
        // Indices triangles to the 'left' of the north vector
        for (i = 1; i < numPts; ++i) {
            positionIndex = i * (i + 1);
            prevIndex = (i - 1) * i;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;

            numInterior = 2 * i;
            for (j = 0; j < numInterior - 1; ++j) {

                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = prevIndex;
                indices[indicesIndex++] = positionIndex;
            }

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;
        }

        // Indices for central column of triangles
        numInterior = numPts * 2;
        ++positionIndex;
        ++prevIndex;
        for (i = 0; i < numInterior - 1; ++i) {
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;
        }

        // Reverse the process creating indices to the 'right' of the north vector
        ++prevIndex;
        ++positionIndex;
        for (i = numPts - 1; i > 0; --i) {
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex;
            indices[indicesIndex++] = positionIndex;

            numInterior = 2 * i;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = prevIndex;
                indices[indicesIndex++] = positionIndex;
            }

            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex++;
        }
        return indices;
    }

    var boundingSphereCenter = new Cartesian3();
    function computeEllipse(options) {
        var center = options.center;
        boundingSphereCenter = Cartesian3.multiplyByScalar(options.ellipsoid.geodeticSurfaceNormal(center, boundingSphereCenter), options.height, boundingSphereCenter);
        boundingSphereCenter = Cartesian3.add(center, boundingSphereCenter, boundingSphereCenter);
        var boundingSphere = new BoundingSphere(boundingSphereCenter, options.semiMajorAxis);
        var cep = computeEllipsePositions(options);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var attributes = computeTopBottomAttributes(positions, options, false);
        var indices = topIndices(numPts);
        indices = IndexDatatype.createTypedArray(positions.length / 3, indices);
        return {
            boundingSphere : boundingSphere,
            attributes : attributes,
            indices : indices
        };
    }

    function computeWallAttributes(positions, options) {
        var vertexFormat = options.vertexFormat;
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var stRotation = options.stRotation;
        var size = positions.length / 3 * 2;

        var finalPositions = new Float64Array(size * 3);
        var textureCoordinates = (vertexFormat.st) ? new Float32Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Float32Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Float32Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Float32Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Raise positions to a height above the ellipsoid and compute the
        // texture coordinates, normals, tangents, and binormals.
        var normal = scratchNormal;
        var tangent = scratchTangent;
        var binormal = scratchBinormal;

        var projection = new GeographicProjection(ellipsoid);
        var projectedCenter = projection.project(ellipsoid.cartesianToCartographic(center, scratchCartographic), projectedCenterScratch);

        var geodeticNormal = ellipsoid.scaleToGeodeticSurface(center, scratchCartesian1);
        ellipsoid.geodeticSurfaceNormal(geodeticNormal, geodeticNormal);
        var rotation = Quaternion.fromAxisAngle(geodeticNormal, stRotation, quaternionScratch);
        var textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrixScratch);

        var length = positions.length;
        var stOffset = length / 3 * 2;
        for ( var i = 0; i < length; i += 3) {
            var i1 = i + 1;
            var i2 = i + 2;
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            if (vertexFormat.st) {
                var rotatedPoint = Matrix3.multiplyByVector(textureMatrix, position, scratchCartesian2);
                var projectedPoint = projection.project(ellipsoid.cartesianToCartographic(rotatedPoint, scratchCartographic), scratchCartesian3);
                projectedPoint = Cartesian3.subtract(projectedPoint, projectedCenter, projectedPoint);

                texCoordScratch.x = (projectedPoint.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                texCoordScratch.y = (projectedPoint.y + semiMajorAxis) / (2.0 * semiMajorAxis);

                textureCoordinates[textureCoordIndex + stOffset] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex + 1 + stOffset] = texCoordScratch.y;

                textureCoordinates[textureCoordIndex++] = texCoordScratch.x;
                textureCoordinates[textureCoordIndex++] = texCoordScratch.y;
            }

            position = ellipsoid.scaleToGeodeticSurface(position, position);
            extrudedPosition = position.clone(scratchCartesian2);
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
            var scaledNormal = Cartesian3.multiplyByScalar(normal, height, scratchCartesian4);
            position = Cartesian3.add(position, scaledNormal, position);
            scaledNormal = Cartesian3.multiplyByScalar(normal, extrudedHeight, scaledNormal);
            extrudedPosition = Cartesian3.add(extrudedPosition, scaledNormal, extrudedPosition);

            if (vertexFormat.position) {
                finalPositions[i + length] = extrudedPosition.x;
                finalPositions[i1 + length] = extrudedPosition.y;
                finalPositions[i2 + length] = extrudedPosition.z;

                finalPositions[i] = position.x;
                finalPositions[i1] = position.y;
                finalPositions[i2] = position.z;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {

                binormal = normal.clone(binormal);
                var next = Cartesian3.fromArray(positions, (i + 3) % length, scratchCartesian4);
                next = next.subtract(position, next);
                var bottom = extrudedPosition.subtract(position, scratchCartesian3);

                normal = bottom.cross(next, normal).normalize(normal);

                if (vertexFormat.normal) {
                    normals[i] = normal.x;
                    normals[i1] = normal.y;
                    normals[i2] = normal.z;

                    normals[i + length] = normal.x;
                    normals[i1 + length] = normal.y;
                    normals[i2 + length] = normal.z;
                }

                if (vertexFormat.tangent) {
                    tangent = Cartesian3.cross(binormal, normal, tangent).normalize(tangent);
                    tangents[i] = tangent.x;
                    tangents[i1] = tangent.y;
                    tangents[i2] = tangent.z;

                    tangents[i + length] = tangent.x;
                    tangents[i + 1 + length] = tangent.y;
                    tangents[i + 2 + length] = tangent.z;
                }

                if (vertexFormat.binormal) {
                    binormals[i] = binormal.x;
                    binormals[i1] = binormal.y;
                    binormals[i2] = binormal.z;

                    binormals[i + length] = binormal.x;
                    binormals[i1 + length] = binormal.y;
                    binormals[i2 + length] = binormal.z;
                }
            }
        }

        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.st) {
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : textureCoordinates
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : binormals
            });
        }
        return attributes;
    }

    function computeWallIndices(positions) {
        var UL;
        var UR;
        var LL;
        var LR;
        var length = positions.length / 3;
        var indices = IndexDatatype.createTypedArray(length, length * 6);
        var index = 0;
        for ( var i = 0; i < length - 1; i++) {
            UL = i;
            LL = i + length;
            UR = UL + 1;
            LR = UR + length;
            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;
        }

        UL = length - 1;
        LL = i + length;
        UR = 0;
        LR = UR + length;
        indices[index++] = UL;
        indices[index++] = LL;
        indices[index++] = UR;
        indices[index++] = UR;
        indices[index++] = LL;
        indices[index++] = LR;

        return indices;
    }

    var topBoundingSphere = new BoundingSphere();
    var bottomBoundingSphere = new BoundingSphere();
    function computeExtrudedEllipse(options) {
        var center = options.center;
        var ellipsoid = options.ellipsoid;
        var semiMajorAxis = options.semiMajorAxis;
        var scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scratchCartesian1), options.height, scratchCartesian1);
        topBoundingSphere.center = Cartesian3.add(center, scaledNormal, topBoundingSphere.center);
        topBoundingSphere.radius = semiMajorAxis;

        scaledNormal = Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center, scaledNormal), options.extrudedHeight, scaledNormal);
        bottomBoundingSphere.center = Cartesian3.add(center, scaledNormal, bottomBoundingSphere.center);
        bottomBoundingSphere.radius = semiMajorAxis;

        var cep = computeEllipsePositions(options, true);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var outerPositions = cep.outerPositions;
        var boundingSphere = BoundingSphere.union(topBoundingSphere, bottomBoundingSphere);
        var topBottomAttributes = computeTopBottomAttributes(positions, options, true);
        var indices = topIndices(numPts);
        var length = indices.length;
        indices.length = length * 2;
        var posLength = positions.length / 3;
        for ( var i = 0; i < length; i += 3) {
            indices[i + length] = indices[i + 2] + posLength;
            indices[i + 1 + length] = indices[i + 1] + posLength;
            indices[i + 2 + length] = indices[i] + posLength;
        }

        var topBottomIndices = IndexDatatype.createTypedArray(posLength * 2 / 3, indices);

        var topBottomGeo = new Geometry({
            attributes : topBottomAttributes,
            indices : topBottomIndices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        var wallAttributes = computeWallAttributes(outerPositions, options);
        indices = computeWallIndices(outerPositions);
        var wallIndices = IndexDatatype.createTypedArray(outerPositions.length * 2 / 3, indices);

        var wallGeo = new Geometry({
            attributes : wallAttributes,
            indices : wallIndices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        var geo = GeometryPipeline.combine([
            new GeometryInstance({
                geometry : topBottomGeo
            }),
            new GeometryInstance({
                geometry : wallGeo
            })
        ]);

        return {
            boundingSphere : boundingSphere,
            attributes : geo.attributes,
            indices : geo.indices
        };
    }

    /**
     *
     * A {@link Geometry} that represents geometry for an ellipse on an ellipsoid
     *
     * @alias EllipseGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.extrudedHeight] The height of the extrusion.
     * @param {Number} [options.rotation=0.0] The angle from north (clockwise) in radians. The default is zero.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} semiMajorAxis is required.
     * @exception {DeveloperError} semiMinorAxis is required.
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
     * @exception {DeveloperError} semiMajorAxis must be larger than the semiMajorAxis.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @example
     * // Create an ellipse.
     * var ellipsoid = Ellipsoid.WGS84;
     * var ellipse = new EllipseGeometry({
     *   ellipsoid : ellipsoid,
     *   center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *   semiMajorAxis : 500000.0,
     *   semiMinorAxis : 300000.0,
     *   rotation : CesiumMath.toRadians(60.0)
     * });
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;

        if (typeof center === 'undefined') {
            throw new DeveloperError('center is required.');
        }

        if (typeof semiMajorAxis === 'undefined') {
            throw new DeveloperError('semiMajorAxis is required.');
        }

        if (typeof semiMinorAxis === 'undefined') {
            throw new DeveloperError('semiMinorAxis is required.');
        }

        if (semiMajorAxis <= 0.0 || semiMinorAxis <= 0.0) {
            throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
        }

        if (semiMajorAxis < semiMinorAxis) {
            throw new DeveloperError('semiMajorAxis must be larger than the semiMajorAxis.');
        }


        var newOptions = {
            center : center,
            semiMajorAxis : semiMajorAxis,
            semiMinorAxis : semiMinorAxis,
            ellipsoid : defaultValue(options.ellipsoid, Ellipsoid.WGS84),
            rotation : defaultValue(options.rotation, 0.0),
            stRotation : defaultValue(options.stRotation, 0.0),
            height : defaultValue(options.height, 0.0),
            granularity : defaultValue(options.granularity, 0.02),
            vertexFormat : defaultValue(options.vertexFormat, VertexFormat.DEFAULT),
            extrudedHeight : options.extrudedHeight
        };

        if (newOptions.granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        var extrude = (typeof newOptions.extrudedHeight !== 'undefined' && !CesiumMath.equalsEpsilon(newOptions.height, newOptions.extrudedHeight, 1));

        var ellipseGeometry;
        if (extrude) {
            var h = newOptions.extrudedHeight;
            var height = newOptions.height;
            newOptions.extrudedHeight = Math.min(h, height);
            newOptions.height = Math.max(h, height);
            ellipseGeometry = computeExtrudedEllipse(newOptions);
        } else {
            ellipseGeometry = computeEllipse(newOptions);
        }


        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = ellipseGeometry.attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = ellipseGeometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = ellipseGeometry.boundingSphere;
    };

    return EllipseGeometry;
});