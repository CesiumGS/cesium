/*global define*/
define([
        './defaultValue',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './GeographicProjection',
        './GeometryAttribute',
        './GeometryIndices',
        './Math',
        './Matrix2',
        './Matrix4',
        './PrimitiveType',
        './VertexFormat'
    ], function(
        defaultValue,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        GeometryAttribute,
        GeometryIndices,
        CesiumMath,
        Matrix2,
        Matrix4,
        PrimitiveType,
        VertexFormat) {
    "use strict";

    var position = new Cartesian3();
    var reflectedPosition = new Cartesian3();
    var interiorPosition = new Cartesian3();
    var scratchCart = new Cartographic();

    /**
     * Computes boundary points for an ellipse on the ellipsoid.
     * <br /><br />
     * The <code>granularity</code> determines the number of points
     * in the boundary.  A lower granularity results in more points and a more
     * exact circle.
     * <br /><br />
     * An outlined ellipse is rendered by passing the result of this function call to
     * {@link Polyline#setPositions}.  A filled ellipse is rendered by passing
     * the result to {@link Polygon#setPositions}.
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid the ellipse will be on.
     * @param {Cartesian3} center The ellipse's center point in the fixed frame.
     * @param {Number} semiMajorAxis The length of the ellipse's semi-major axis in meters.
     * @param {Number} semiMinorAxis The length of the ellipse's semi-minor axis in meters.
     * @param {Number} [bearing] The angle from north (clockwise) in radians. The default is zero.
     * @param {Number} [granularity] The angular distance between points on the circle.
     *
     * @exception {DeveloperError} ellipsoid, center, semiMajorAxis, and semiMinorAxis are required.
     * @exception {DeveloperError} Semi-major and semi-minor axes must be greater than zero.
     * @exception {DeveloperError} granularity must be greater than zero.
     *
     * @see Polyline#setPositions
     * @see Polygon#setPositions
     *
     * @return The set of points that form the ellipse's boundary.
     *
     * @example
     * // Create a filled ellipse.
     * var polygon = new Polygon();
     * polygon.setPositions(Shapes.computeEllipseBoundary(
     *   ellipsoid, ellipsoid.cartographicToCartesian(
     *      Cartographic.fromDegrees(-75.59777, 40.03883)), 500000.0, 300000.0, Math.toRadians(60)));
     */
    var EllipseGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var center = options.center;

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var semiMajorAxis = defaultValue(options.semiMajorAxis, 1.0);
        var semiMinorAxis = defaultValue(options.semiMinorAxis, 1.0);
        var bearing = defaultValue(options.bearing, 0.0);
        var granularity = defaultValue(options.granularity, 0.02);

        if (typeof center === 'undefined') {
            throw new DeveloperError('center is required.');
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

        var numPts = Math.ceil(CesiumMath.PI_OVER_TWO / granularity) + 1;
        var deltaTheta = CesiumMath.PI_OVER_TWO / (numPts - 1);
        var size = 2 * numPts * numPts;

        var reachedPiOverTwo = false;
        if (deltaTheta * (numPts - 1) > CesiumMath.PI_OVER_TWO) {
            size -= 2 * numPts - 1;
            reachedPiOverTwo = true;
        }

        var i;
        var j;
        var numInterior;

        var positions = (vertexFormat.position) ? new Array(size * 3) : undefined;
        positions[0] = semiMajorAxis;
        positions[1] = 0.0;
        positions[2] = 0.0;
        var positionIndex = 3;

        for (i = 1; i < numPts; ++i) {
            var angle = Math.min(i * deltaTheta, CesiumMath.PI_OVER_TWO);

            position.x = Math.cos(angle) * semiMajorAxis;
            position.y = Math.sin(angle) * semiMinorAxis;

            reflectedPosition.x =  position.x;
            reflectedPosition.y = -position.y;

            positions[positionIndex++] = position.x;
            positions[positionIndex++] = position.y;
            positions[positionIndex++] = position.z;

            numInterior = 2 * i + 1;
            for (j = 1; j < numInterior - 1; ++j) {
                var t = j / (numInterior - 1);
                Cartesian3.lerp(position, reflectedPosition, t, interiorPosition);
                positions[positionIndex++] = interiorPosition.x;
                positions[positionIndex++] = interiorPosition.y;
                positions[positionIndex++] = interiorPosition.z;
            }

            positions[positionIndex++] = reflectedPosition.x;
            positions[positionIndex++] = reflectedPosition.y;
            positions[positionIndex++] = reflectedPosition.z;
        }

        var reverseIndex;
        if (reachedPiOverTwo) {
            i = numPts - 1;
            reverseIndex = positionIndex - (numPts * 2 - 1) * 3;
        } else {
            i = numPts;
            reverseIndex = positionIndex;
        }

        for (; i > 0; --i) {
            numInterior = 2 * i - 1;
            reverseIndex -= numInterior * 3;
            for (j = 0; j < numInterior; ++j) {
                var index = reverseIndex  + j * 3;
                positions[positionIndex++] = -positions[index];
                positions[positionIndex++] =  positions[index + 1];
                positions[positionIndex++] =  positions[index + 2];
            }
        }

        var projection = new GeographicProjection(ellipsoid);
        var centerCart = ellipsoid.cartesianToCartographic(center, scratchCart);
        var projectedCenter = projection.project(centerCart);
        var rotation = Matrix2.fromRotation(bearing);

        var length = positions.length;
        for (i = 0; i < length; i += 3) {
            Cartesian3.fromArray(positions, i, position);
            Matrix2.multiplyByVector(rotation, position, position);
            Cartesian2.add(projectedCenter, position, position);

            var unprojected = projection.unproject(position, scratchCart);
            ellipsoid.cartographicToCartesian(unprojected, position);

            positions[i] = position.x;
            positions[i + 1] = position.y;
            positions[i + 2] = position.z;
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        // TODO: compute correct indices array size
        //var indicesSize = size * 2 * 3;
        //var indices = new Array(indicesSize);
        var indices = [];
        var indicesIndex = 0;
        var prevIndex;

        for (i = 0; i < numPts - 1; ++i) {
            positionIndex = i + 1;
            positionIndex *= positionIndex;
            prevIndex = i * i;

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;

            numInterior = 2 * i + 1;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }

            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;
        }

        if (!reachedPiOverTwo) {
            numInterior = numPts * 2 - 1;
            ++positionIndex;
            ++prevIndex;
            for (i = 0; i < numInterior - 1; ++i) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }
        }

        ++prevIndex;
        ++positionIndex;
        for (i = numPts - 1; i > 0; --i) {
            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex;
            indices[indicesIndex++] = prevIndex;

            numInterior = 2 * (i - 1) + 1;
            for (j = 0; j < numInterior - 1; ++j) {
                indices[indicesIndex++] = prevIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;

                indices[indicesIndex++] = positionIndex++;
                indices[indicesIndex++] = positionIndex;
                indices[indicesIndex++] = prevIndex;
            }

            indices[indicesIndex++] = prevIndex++;
            indices[indicesIndex++] = positionIndex++;
            indices[indicesIndex++] = prevIndex++;
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = [
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : indices
            })
        ];

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = new BoundingSphere(center, semiMajorAxis);

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         */
        //this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());
        this.modelMatrix = Matrix4.IDENTITY.clone();

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return EllipseGeometry;
});