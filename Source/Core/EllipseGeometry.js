/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './Math',
        './Matrix3',
        './PrimitiveType',
        './Quaternion',
        './VertexFormat'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        CesiumMath,
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

    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();

    function pointOnEllipsoid(theta, bearing, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, result) {
        var azimuth = theta + bearing;

        Cartesian3.multiplyByScalar(eastVec,  Math.cos(azimuth), rotAxis);
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
        var semiMinorAxis = options.semiMinorAxis;
        var ellipsoid = options.ellipsoid;
        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var size = (extrude) ? positions.length/3*2 : positions.length/3;

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

        var length = positions.length;
        var bottomOffset = 0;
        if (extrude) {
            length /= 2;
            bottomOffset = length;
        }
        for (var i = 0; i < length; i += 3) {
            var position = Cartesian3.fromArray(positions, i, scratchCartesian1);
            var extrudedPosition;

            if (vertexFormat.st) {
                var relativeToCenter = Cartesian3.subtract(position, center);
                if (extrude) {
                    textureCoordinates[textureCoordIndex + length] = (relativeToCenter.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                    textureCoordinates[textureCoordIndex + 1 + length] = (relativeToCenter.y + semiMinorAxis) / (2.0 * semiMinorAxis);
                }

                textureCoordinates[textureCoordIndex++] = (relativeToCenter.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                textureCoordinates[textureCoordIndex++] = (relativeToCenter.y + semiMinorAxis) / (2.0 * semiMinorAxis);
            }

            ellipsoid.scaleToGeodeticSurface(position, position);
            position = Cartesian3.add(position, Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(position), height), position);
            if (extrude) {
                extrudedPosition = Cartesian3.add(position, Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(position), extrudedHeight), position);
            }

            if (vertexFormat.position) {
                if (extrude) {
                    finalPositions[i + bottomOffset] = extrudedPosition.x;
                    finalPositions[i + 1 + bottomOffset] = extrudedPosition.y;
                    finalPositions[i + 2 + bottomOffset] = extrudedPosition.z;
                }

                finalPositions[i] = position.x;
                finalPositions[i + 1] = position.y;
                finalPositions[i + 2] = position.z;
            }

            if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                normal = ellipsoid.geodeticSurfaceNormal(position, normal);
                if (vertexFormat.tangent || vertexFormat.binormal) {
                    tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                }
                if (vertexFormat.normal) {
                    normals[i] = normal.x;
                    normals[i + 1] = normal.y;
                    normals[i + 2] = normal.z;
                    if (extrude) {
                        normals[i + bottomOffset] = -normal.x;
                        normals[i + 1 + bottomOffset] = -normal.y;
                        normals[i + 2 + bottomOffset] = -normal.z;
                    }
                }

                if (vertexFormat.tangent) {
                    tangents[i] = tangent.x;
                    tangents[i + 1] = tangent.y;
                    tangents[i + 2] = tangent.z;
                    if (extrude) {
                        tangents[i + bottomOffset] = -tangent.x;
                        tangents[i + 1 + bottomOffset] = -tangent.y;
                        tangents[i + 2 + bottomOffset] = -tangent.z;
                    }
                }

                if (vertexFormat.binormal) {
                    binormal = Cartesian3.cross(normal, tangent, binormal);
                    binormals[i] = binormal.x;
                    binormals[i + 1] = binormal.y;
                    binormals[i + 2] = binormal.z;
                    if (extrude) {
                        binormals[i + bottomOffset] = binormal.x;
                        binormals[i + 1 + bottomOffset] = binormal.y;
                        binormals[i + 2 + bottomOffset] = binormal.z;
                    }
                }
            }
        }

        var attributes = {};

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

    function computeEllipsePositions(options) {
        var semiMinorAxis = options.semiMinorAxis;
        var semiMajorAxis = options.semiMajorAxis;
        var bearing = options.bearing;
        var center = options.center;
        var granularity = options.granularity;

        if (semiMajorAxis < semiMinorAxis) {
            var temp = semiMajorAxis;
            semiMajorAxis = semiMinorAxis;
            semiMinorAxis = temp;
         }

         var MAX_ANOMALY_LIMIT = 2.31;

         var aSqr = semiMinorAxis * semiMinorAxis;
         var bSqr = semiMajorAxis * semiMajorAxis;
         var ab = semiMajorAxis * semiMinorAxis;

         var mag = center.magnitude();

         var unitPos = Cartesian3.normalize(center);
         var eastVec = Cartesian3.cross(Cartesian3.UNIT_Z, center);
         Cartesian3.normalize(eastVec, eastVec);
         var northVec = Cartesian3.cross(unitPos, eastVec);

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

         var i;
         var j;
         var theta;
         var numInterior;
         var t;
         var interiorPosition;

         // Compute points in the 'northern' half of the ellipse
         for (i = 0, theta = CesiumMath.PI_OVER_TWO; i < numPts && theta > 0; ++i, theta -= deltaTheta) {
             pointOnEllipsoid(theta, bearing, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
             pointOnEllipsoid(Math.PI - theta, bearing, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

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

         // Set numPts if theta reached zero
         numPts = i;

         // Compute points in the 'northern' half of the ellipse
         for (i = numPts; i > 0; --i) {
             theta = CesiumMath.PI_OVER_TWO - (i - 1) * deltaTheta;

             pointOnEllipsoid(-theta, bearing, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, position);
             pointOnEllipsoid( theta + Math.PI, bearing, northVec, eastVec, aSqr, ab, bSqr, mag, unitPos, reflectedPosition);

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

         // The original length may have been an over-estimate
         if (positions.length !== positionIndex) {
             size = positionIndex / 3;
             positions.length = positionIndex;
         }

         return {
             positions: positions,
             numPts: numPts
         };
    }

    function topIndices(positions, numPts) {
        // The number of triangles in the ellipse on the positive x half-space and for
        // the column of triangles in the middle is:
        //
        // numTriangles = 4 + 8 + 12 + ... = 4 + (4 + 4) + (4 + 4 + 4) + ... = 4 * (1 + 2 + 3 + ...)
        //              = 4 * ((n * ( n + 1)) / 2)
        // numColumnTriangles = 2 * 2 * n
        // total = 2 * numTrangles + numcolumnTriangles
        //
        // Substitute (numPts - 1.0) for n above
        var indicesSize = 2 * numPts * (numPts + 1);
        var indices = new Array(indicesSize);
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

    function computeEllipse(options) {
        var center = options.center;
        center = Cartesian3.add(center, Cartesian3.multiplyByScalar(options.ellipsoid.geodeticSurfaceNormal(center), options.height), center);
        var boundingSphere = new BoundingSphere(center, options.semiMajorAxis);
        var cep = computeEllipsePositions(options);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var attributes = computeTopBottomAttributes(positions, options, false);
        var indices = topIndices(positions, numPts);
        indices = IndexDatatype.createTypedArray(positions.length / 3, indices);
        return {
            boundingSphere: boundingSphere,
            attributes: attributes,
            indices: indices
        };
    }

    function computeWallAttributes(positions, options) {
        return {};
    }

    function computeWallIndices(positions) {
        return [];
    }

    var topBoundingSphere = new BoundingSphere();
    var bottomBoundingSphere = new BoundingSphere();
    function computeExtrudedEllipse(options) {
        var center = options.center;
        var ellipsoid = options.ellipsoid;
        var semiMajorAxis = options.semiMajorAxis;
        center = Cartesian3.add(center, Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center), options.height), center);
        topBoundingSphere.center = center.clone();
        topBoundingSphere.radius = semiMajorAxis;
        center = Cartesian3.add(center, Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(center), options.extrudedHeight), center);
        bottomBoundingSphere.center = center.clone();
        bottomBoundingSphere.radius = semiMajorAxis;

        var cep = computeEllipsePositions(options);
        var positions = cep.positions;
        var numPts = cep.numPts;
        var boundingSphere = BoundingSphere.union(topBoundingSphere, bottomBoundingSphere);
        var topBottomAttributes = computeTopBottomAttributes(positions, options, true);
        var indices = topIndices(positions, numPts);
        var length = indices.length;
        indices = indices.concat(new Array(indices.length));

        for (var i = 0; i < length; i+=3) {
            indices[i + length] = indices[i + 2];
            indices[i + 1 + length] = indices[i + 1];
            indices[i + 2 + length] = indices[i];
        }

        var topBotomIndices = IndexDatatype.createTypedArray(positions.length * 2 / 3, indices);

        var topBottomGeo = new Geometry({
            attributes: topBottomAttributes,
            indices: topBotomIndices
        });

        var wallAttributes = computeWallAttributes(positions, options);
        var wallIndices = computeWallIndices(positions);

        var wallGeo = new Geometry({
            attributes: wallAttributes,
            indices: wallIndices
        });

        var geo = Geometry.combine(topBottomGeo, wallGeo);
        return {
            boundingSphere: boundingSphere,
            attributes: geo.attributes,
            indices: geo.indices
        };
    }

    /**
     * Computes vertices and indices for an ellipse on the ellipsoid.
     *
     * @alias EllipseGeometry
     * @constructor
     *
     * @param {Cartesian3} options.center The ellipse's center point in the fixed frame.
     * @param {Number} options.semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} options.semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid the ellipse will be on.
     * @param {Number} [options.height=0.0] The height above the ellipsoid.
     * @param {Number} [options.extrudedHeight=0.0] The height of the extrusion.
     * @param {Number} [options.bearing=0.0] The angle from north (clockwise) in radians. The default is zero.
     * @param {Number} [options.granularity=0.02] The angular distance between points on the ellipse in radians.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} center is required.
     * @exception {DeveloperError} semiMajorAxis is required.
     * @exception {DeveloperError} semiMinorAxis is required.
     * @exception {DeveloperError} semiMajorAxis and semiMinorAxis must be greater than zero.
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
     *   bearing : CesiumMath.toRadians(60.0)
     * });
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        options.ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        options.bearing = defaultValue(options.bearing, 0.0);
        options.height = defaultValue(options.height, 0.0);
        options.extrudedHeight = defaultValue(options.extrudedHeight, options.height);
        options.granularity = defaultValue(options.granularity, 0.02);
        options.vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        if (typeof options.center === 'undefined') {
            throw new DeveloperError('center is required.');
        }

        if (typeof options.semiMajorAxis === 'undefined') {
            throw new DeveloperError('semiMajorAxis is required.');
        }

        if (typeof options.semiMinorAxis === 'undefined') {
            throw new DeveloperError('semiMinorAxis is required.');
        }

        if (options.semiMajorAxis <= 0.0 || options.semiMinorAxis <= 0.0) {
            throw new DeveloperError('Semi-major and semi-minor axes must be greater than zero.');
        }

        if (options.granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        var extrude = (options.height !== options.extrudedHeight);
        var o;
        if (extrude) {
            var h = options.extrudedHeight;
            var height = options.height;
            options.extrudedHeight = Math.min(h, height);
            options.height = Math.max(h, height);
            o = computeExtrudedEllipse(options);
        } else {
            o = computeEllipse(options);
        }


        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = o.attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = o.indices;

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
        this.boundingSphere = o.boundingSphere;
    };

    return EllipseGeometry;
});