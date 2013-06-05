/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryIndices',
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
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryIndices,
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

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();

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
     *     ellipsoid : ellipsoid,
     *     center : ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883)),
     *     semiMajorAxis : 500000.0,
     *     semiMinorAxis : 300000.0,
     *     bearing : CesiumMath.toRadians(60.0)
     * });
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options.semiMinorAxis;

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var bearing = defaultValue(options.bearing, 0.0);
        var height = defaultValue(options.height, 0.0);
        var granularity = defaultValue(options.granularity, 0.02);

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

        if (granularity <= 0.0) {
            throw new DeveloperError('granularity must be greater than zero.');
        }

        if (semiMajorAxis < semiMinorAxis) {
           var temp = semiMajorAxis;
           semiMajorAxis = semiMinorAxis;
           semiMinorAxis = temp;
        }

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

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
        positions.length = positionIndex;
        size = positions.length / 3;

        var textureCoordinates = (vertexFormat.st) ? new Array(size * 2) : undefined;
        var normals = (vertexFormat.normal) ? new Array(size * 3) : undefined;
        var tangents = (vertexFormat.tangent) ? new Array(size * 3) : undefined;
        var binormals = (vertexFormat.binormal) ? new Array(size * 3) : undefined;

        var textureCoordIndex = 0;

        // Raise positions to a height above the ellipsoid and compute the
        // texture coordinates, normals, tangents, and binormals.
        var normal;
        var tangent;
        var binormal;

        var length = positions.length;
        for (i = 0; i < length; i += 3) {
            position = Cartesian3.fromArray(positions, i, scratchCartesian2);

            if (vertexFormat.st) {
                var relativeToCenter = Cartesian3.subtract(position, center);
                textureCoordinates[textureCoordIndex++] = (relativeToCenter.x + semiMajorAxis) / (2.0 * semiMajorAxis);
                textureCoordinates[textureCoordIndex++] = (relativeToCenter.y + semiMinorAxis) / (2.0 * semiMinorAxis);
            }

            ellipsoid.scaleToGeodeticSurface(position, position);
            Cartesian3.add(position, Cartesian3.multiplyByScalar(ellipsoid.geodeticSurfaceNormal(position), height), position);

            if (vertexFormat.position) {
                positions[i] = position.x;
                positions[i + 1] = position.y;
                positions[i + 2] = position.z;
            }

            if (vertexFormat.normal) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);

                normals[i] = normal.x;
                normals[i + 1] = normal.y;
                normals[i + 2] = normal.z;
            }

            if (vertexFormat.tangent) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);
                tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, scratchCartesian3);

                tangents[i] = tangent.x;
                tangents[i + 1] = tangent.y;
                tangents[i + 2] = tangent.z;
            }

            if (vertexFormat.binormal) {
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchCartesian3);
                tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, scratchCartesian4);
                binormal = Cartesian3.cross(normal, tangent, scratchCartesian3);

                binormals[i] = binormal.x;
                binormals[i + 1] = binormal.y;
                binormals[i + 2] = binormal.z;
            }
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : positions
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

        indices.length = indicesIndex;

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * The geometry indices.
         *
         * @type GeometryIndices
         */
        this.indexList = new GeometryIndices({
            primitiveType : PrimitiveType.TRIANGLES,
            values : indices
        });

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere(center, semiMajorAxis);
    };

    /**
     * DOC_TBA
     */
    EllipseGeometry.prototype.clone = Geometry.prototype.clone;

    return EllipseGeometry;
});