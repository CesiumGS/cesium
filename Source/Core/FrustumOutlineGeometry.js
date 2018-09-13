define([
        './BoundingSphere',
        './Cartesian3',
        './Check',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './FrustumGeometry',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './OrthographicFrustum',
        './PerspectiveFrustum',
        './PolylineGeometry',
        './PrimitiveType',
        './Quaternion'
    ], function(
        BoundingSphere,
        Cartesian3,
        Check,
        ComponentDatatype,
        defaultValue,
        defined,
        FrustumGeometry,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        OrthographicFrustum,
        PerspectiveFrustum,
        PolylineGeometry,
        PrimitiveType,
        Quaternion) {
    'use strict';

    var PERSPECTIVE = 0;
    var ORTHOGRAPHIC = 1;

    /**
     * A description of the outline of a frustum with the given the origin and orientation.
     *
     * @alias FrustumOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PerspectiveFrustum|OrthographicFrustum} options.frustum The frustum.
     * @param {Cartesian3} options.origin The origin of the frustum.
     * @param {Quaternion} options.orientation The orientation of the frustum.
     * @param {Number} [options.width=2] The outline width in pixels.
     */
    function FrustumOutlineGeometry(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.object('options.frustum', options.frustum);
        Check.typeOf.object('options.origin', options.origin);
        Check.typeOf.object('options.orientation', options.orientation);
        //>>includeEnd('debug');

        var frustum = options.frustum;
        var orientation = options.orientation;
        var origin = options.origin;
        var width = defaultValue(options.width, 2.0);

        // This is private because it is used by DebugCameraPrimitive to draw a multi-frustum by
        // creating multiple FrustumOutlineGeometrys. This way the near plane of one frustum doesn't overlap
        // the far plane of another.
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
        this._origin = Cartesian3.clone(origin);
        this._orientation = Quaternion.clone(orientation);
        this._drawNearPlane = drawNearPlane;
        this._width = width;
        this._workerName = 'createFrustumOutlineGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = 3 + frustumPackedLength + Cartesian3.packedLength + Quaternion.packedLength;
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

        Cartesian3.pack(value._origin, array, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Quaternion.pack(value._orientation, array, startingIndex);
        startingIndex += Quaternion.packedLength;
        array[startingIndex++] = value._drawNearPlane ? 1.0 : 0.0;
        array[startingIndex] = value._width;

        return array;
    };

    var scratchPackPerspective = new PerspectiveFrustum();
    var scratchPackOrthographic = new OrthographicFrustum();
    var scratchPackQuaternion = new Quaternion();
    var scratchPackorigin = new Cartesian3();

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

        var origin = Cartesian3.unpack(array, startingIndex, scratchPackorigin);
        startingIndex += Cartesian3.packedLength;
        var orientation = Quaternion.unpack(array, startingIndex, scratchPackQuaternion);
        startingIndex += Quaternion.packedLength;
        var drawNearPlane = array[startingIndex++] === 1.0;
        var width = array[startingIndex];

        if (!defined(result)) {
            return new FrustumOutlineGeometry({
                frustum : frustum,
                origin : origin,
                orientation : orientation,
                _drawNearPlane : drawNearPlane,
                width : width
            });
        }

        var frustumResult = frustumType === result._frustumType ? result._frustum : undefined;
        result._frustum = frustum.clone(frustumResult);

        result._frustumType = frustumType;
        result._origin = Cartesian3.clone(origin, result._origin);
        result._orientation = Quaternion.clone(orientation, result._orientation);
        result._drawNearPlane = drawNearPlane;
        result._width = width;

        return result;
    };

    var nearFarScratch = new Array(5);
    var sidesScratch = new Array(2);

    /**
     * Computes the geometric representation of a frustum outline, including its vertices, indices, and a bounding sphere.
     *
     * @param {FrustumOutlineGeometry} frustumGeometry A description of the frustum.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    FrustumOutlineGeometry.createGeometry = function(frustumGeometry) {
        var frustumType = frustumGeometry._frustumType;
        var frustum = frustumGeometry._frustum;
        var origin = frustumGeometry._origin;
        var orientation = frustumGeometry._orientation;
        var drawNearPlane = frustumGeometry._drawNearPlane;
        var width = frustumGeometry._width;

        var positions = new Float64Array(3 * 4 * 2);
        FrustumGeometry._computeNearFarPlanes(origin, orientation, frustumType, frustum, positions);

        var index;
        var instances = [];

        // Build the near/far planes
        var i = drawNearPlane ? 0 : 1;
        for (; i < 2; ++i) {
            index = i * 4;

            var nearFarPositions = nearFarScratch;
            nearFarPositions[0] = Cartesian3.unpack(positions, index * 3, nearFarPositions[0]);
            nearFarPositions[1] = Cartesian3.unpack(positions, (index + 1) * 3, nearFarPositions[1]);
            nearFarPositions[2] = Cartesian3.unpack(positions, (index + 2) * 3, nearFarPositions[2]);
            nearFarPositions[3] = Cartesian3.unpack(positions, (index + 3) * 3, nearFarPositions[3]);
            nearFarPositions[4] = Cartesian3.unpack(positions, index * 3, nearFarPositions[4]);

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : nearFarPositions,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        // Build the sides of the frustums
        for (i = 0; i < 4; ++i) {
            var sidePositions = sidesScratch;
            sidePositions[0] = Cartesian3.unpack(positions, i * 3, sidePositions[0]);
            sidePositions[1] = Cartesian3.unpack(positions, (i + 4) * 3, sidePositions[1]);

            instances.push(new GeometryInstance({
                geometry : PolylineGeometry.createGeometry(new PolylineGeometry({
                    positions : sidePositions,
                    followSurface : false,
                    width : width
                }))
            }));
        }

        return GeometryPipeline.combineInstances(instances)[0];
    };

    return FrustumOutlineGeometry;
});
