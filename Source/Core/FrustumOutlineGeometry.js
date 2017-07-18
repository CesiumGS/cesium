define([
        './BoundingSphere',
        './Cartesian3',
        './Cartesian4',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './Matrix3',
        './Matrix4',
        './OrthographicFrustum',
        './PerspectiveFrustum',
        './PrimitiveType',
        './Quaternion'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        Matrix3,
        Matrix4,
        OrthographicFrustum,
        PerspectiveFrustum,
        PrimitiveType,
        Quaternion) {
    'use strict';

    var PERSPECTIVE = 0;
    var ORTHOGRAPHIC = 1;

    /**
     * A description of the outline of a frustum with the given position and orientation.
     *
     * @alias FrustumOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PerspectiveFrustum|OrthographicFrustum} options.frustum The frustum.
     * @param {Cartesian3} options.position The position of the frustum.
     * @param {Quaternion} options.orientation The orientation of the frustum.
     */
    function FrustumOutlineGeometry(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.object('options.frustum', options.frustum);
        Check.typeOf.object('options.position', options.position);
        Check.typeOf.object('options.orientation', options.orientation);
        //>>includeEnd('debug');

        var frustum = options.frustum;
        var orientation = options.orientation;
        var position = options.position;
        var drawNearPlane = defaultValue(options._drawNearPlane, true);

        var frustumType;
        var frustumPackedLength;
        if (frustum instanceof PerspectiveFrustum) {
            frustumType = PERSPECTIVE;
            frustumPackedLength = PerspectiveFrustum.packedLength;
        } else if (frustum instanceof OrthographicFrustum) {
            frustumType = ORTHOGRAPHIC;
            frustumPackedLength = OrthographicFrustum.packedLength;
        }

        this._frustumType = frustumType;
        this._frustum = frustum.clone();
        this._position = Cartesian3.clone(position);
        this._orientation = Quaternion.clone(orientation);
        this._drawNearPlane = drawNearPlane;
        this._workerName = 'createFrustumOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 2 + frustumPackedLength + Cartesian3.packedLength + Quaternion.packedLength;
    }

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {FrustumOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    FrustumOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var frustumType = value._frustumType;
        var frustum = value._frustum;

        array[startingIndex++] = frustumType;

        if (frustumType === PERSPECTIVE) {
            PerspectiveFrustum.pack(frustum, array, startingIndex);
            startingIndex += PerspectiveFrustum.packedLength;
        } else {
            OrthographicFrustum.pack(frustum, array, startingIndex);
            startingIndex += OrthographicFrustum.packedLength;
        }

        Cartesian3.pack(value._position, array, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Quaternion.pack(value._orientation, array, startingIndex);
        startingIndex += Quaternion.packedLength;
        array[startingIndex] = value._drawNearPlane ? 1.0 : 0.0;

        return array;
    };

    var scratchPackPerspective = new PerspectiveFrustum();
    var scratchPackOrthographic = new OrthographicFrustum();
    var scratchPackQuaternion = new Quaternion();
    var scratchPackPosition = new Cartesian3();

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {FrustumOutlineGeometry} [result] The object into which to store the result.
     */
    FrustumOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var frustumType = array[startingIndex++];

        var frustum;
        if (frustumType === PERSPECTIVE) {
            frustum = PerspectiveFrustum.unpack(array, startingIndex, scratchPackPerspective);
            startingIndex += PerspectiveFrustum.packedLength;
        } else {
            frustum = OrthographicFrustum.unpack(array, startingIndex, scratchPackOrthographic);
            startingIndex += OrthographicFrustum.packedLength;
        }

        var position = Cartesian3.unpack(array, startingIndex, scratchPackPosition);
        startingIndex += Cartesian3.packedLength;
        var orientation = Quaternion.unpack(array, startingIndex, scratchPackQuaternion);
        startingIndex += Quaternion.packedLength;
        var drawNearPlane = array[startingIndex] === 1.0;

        if (!defined(result)) {
            return new FrustumOutlineGeometry({
                frustum : frustum,
                position : position,
                orientation : orientation,
                _drawNearPlane : drawNearPlane
            });
        }

        var frustumResult = frustumType === result._frustumType ? result._frustum : undefined;
        result._frustum = frustum.clone(frustumResult);

        result._frustumType = frustumType;
        result._position = Cartesian3.clone(position, result._position);
        result._orientation = Quaternion.clone(orientation, result._orientation);
        result._drawNearPlane = drawNearPlane;

        return result;
    };

    var scratchRotationMatrix = new Matrix3();
    var scratchViewMatrix = new Matrix4();
    var scratchInverseMatrix = new Matrix4();

    var scratchXDirection = new Cartesian3();
    var scratchYDirection = new Cartesian3();
    var scratchZDirection = new Cartesian3();

    var frustumSplits = new Array(3);

    var frustumCornersNDC = new Array(4);
    frustumCornersNDC[0] = new Cartesian4(-1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[1] = new Cartesian4(1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[2] = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    frustumCornersNDC[3] = new Cartesian4(-1.0, 1.0, 1.0, 1.0);

    var scratchFrustumCorners = new Array(4);
    for (var i = 0; i < 4; ++i) {
        scratchFrustumCorners[i] = new Cartesian4();
    }

    /**
     * Computes the geometric representation of a frustum outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {FrustumOutlineGeometry} frustumGeometry A description of the frustum.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    FrustumOutlineGeometry.createGeometry = function(frustumGeometry) {
        var frustumType = frustumGeometry._frustumType;
        var frustum = frustumGeometry._frustum;
        var position = frustumGeometry._position;
        var orientation = frustumGeometry._orientation;
        var drawNearPlane = frustumGeometry._drawNearPlane;

        var rotationMatrix = Matrix3.fromQuaternion(orientation, scratchRotationMatrix);
        var x = Matrix3.getColumn(rotationMatrix, 0, scratchXDirection);
        var y = Matrix3.getColumn(rotationMatrix, 1, scratchYDirection);
        var z = Matrix3.getColumn(rotationMatrix, 2, scratchZDirection);

        Cartesian3.normalize(x, x);
        Cartesian3.normalize(y, y);
        Cartesian3.normalize(z, z);

        Cartesian3.negate(x, x);

        var view = Matrix4.computeView(position, z, y, x, scratchViewMatrix);

        var inverseView;
        var inverseViewProjection;
        if (frustumType === PERSPECTIVE) {
            var projection = frustum.projectionMatrix;
            var viewProjection = Matrix4.multiply(projection, view, scratchInverseMatrix);
            inverseViewProjection = Matrix4.inverse(viewProjection, scratchInverseMatrix);
        } else {
            inverseView = Matrix4.inverseTransformation(view, scratchInverseMatrix);
        }

        if (defined(inverseViewProjection)) {
            frustumSplits[0] = frustum.near;
            frustumSplits[1] = frustum.far;
        } else {
            frustumSplits[0] = 0.0;
            frustumSplits[1] = frustum.near;
            frustumSplits[2] = frustum.far;
        }

        var i;
        var positions = new Float64Array(3 * 4 * 2);

        for (i = 0; i < 2; ++i) {
            for (var j = 0; j < 4; ++j) {
                var corner = Cartesian4.clone(frustumCornersNDC[j], scratchFrustumCorners[j]);

                if (!defined(inverseViewProjection)) {
                    if (defined(frustum._offCenterFrustum)) {
                        frustum = frustum._offCenterFrustum;
                    }

                    var near = frustumSplits[i];
                    var far = frustumSplits[i + 1];

                    corner.x = (corner.x * (frustum.right - frustum.left) + frustum.left + frustum.right) * 0.5;
                    corner.y = (corner.y * (frustum.top - frustum.bottom) + frustum.bottom + frustum.top) * 0.5;
                    corner.z = (corner.z * (near - far) - near - far) * 0.5;
                    corner.w = 1.0;

                    Matrix4.multiplyByVector(inverseView, corner, corner);
                } else {
                    corner = Matrix4.multiplyByVector(inverseViewProjection, corner, corner);

                    // Reverse perspective divide
                    var w = 1.0 / corner.w;
                    Cartesian3.multiplyByScalar(corner, w, corner);

                    Cartesian3.subtract(corner, position, corner);
                    Cartesian3.normalize(corner, corner);

                    var fac = Cartesian3.dot(z, corner);
                    Cartesian3.multiplyByScalar(corner, frustumSplits[i] / fac, corner);
                    Cartesian3.add(corner, position, corner);
                }

                positions[12 * i + j * 3] = corner.x;
                positions[12 * i + j * 3 + 1] = corner.y;
                positions[12 * i + j * 3 + 2] = corner.z;
            }
        }

        var attributes = new GeometryAttributes({
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            })
        });

        var offset;
        var index;

        var numberOfPlanes = drawNearPlane ? 2 : 1;
        var indices = new Uint16Array(8 * (numberOfPlanes + 1));

        // Build the near/far planes
        i = drawNearPlane ? 0 : 1;
        for (; i < 2; ++i) {
            offset = drawNearPlane ? i * 8 : 0;
            index = i * 4;

            indices[offset] = index;
            indices[offset + 1] = index + 1;
            indices[offset + 2] = index + 1;
            indices[offset + 3] = index + 2;
            indices[offset + 4] = index + 2;
            indices[offset + 5] = index + 3;
            indices[offset + 6] = index + 3;
            indices[offset + 7] = index;
        }

        // Build the sides of the frustums
        for (i = 0; i < 2; ++i) {
            offset = (numberOfPlanes + i) * 8;
            index = i * 4;

            indices[offset] = index;
            indices[offset + 1] = index + 4;
            indices[offset + 2] = index + 1;
            indices[offset + 3] = index + 5;
            indices[offset + 4] = index + 2;
            indices[offset + 5] = index + 6;
            indices[offset + 6] = index + 3;
            indices[offset + 7] = index + 7;
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : BoundingSphere.fromVertices(positions)
        });
    };

    return FrustumOutlineGeometry;
});
