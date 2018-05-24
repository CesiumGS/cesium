define([
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './Check',
        './ComponentDatatype',
        './Math',
        './defaultValue',
        './defined',
        './defineProperties',
        './Ellipsoid',
        './EncodedCartesian3',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstanceAttribute',
        './Matrix3',
        './Quaternion'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Check,
        ComponentDatatype,
        CesiumMath,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        EncodedCartesian3,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstanceAttribute,
        Matrix3,
        Quaternion) {
    'use strict';

    var MITER_BREAK_SMALL = Math.cos(CesiumMath.toRadians(30));
    var MITER_BREAK_LARGE = Math.cos(CesiumMath.toRadians(150));

    /**
     * Description of the volume used to draw a line segment on terrain.
     *
     * @alias GroundLineSegmentGeometry
     * @constructor
     *
     * @private
     *
     * @see GroundLineSegmentGeometry#createGeometry
     */
    function GroundLineSegmentGeometry() {
        this._startBottom = new Cartesian3();
        this._startTop = new Cartesian3();
        this._startNormal = new Cartesian3();

        this._endBottom = new Cartesian3();
        this._endTop = new Cartesian3();
        this._endNormal = new Cartesian3();

        this._segmentBottomLength = 0.0;
        this._segmentBottomLength2D = 0.0;

        this._workerName = 'createGroundLineSegmentGeometry';
    }

    var pos1_2dScratch = new Cartesian3();
    var pos2_2dScratch = new Cartesian3();
    function computeDistance2D(projection, carto1, carto2) {
        var pos1_2d = projection.project(carto1, pos1_2dScratch);
        var pos2_2d = projection.project(carto2, pos2_2dScratch);
        return Cartesian3.distance(pos1_2d, pos2_2d);
    }

    var startCartographicScratch = new Cartographic();
    var endCartographicScratch = new Cartographic();
    GroundLineSegmentGeometry.fromArrays = function(projection, index, normalsArray, bottomPositionsArray, topPositionsArray) {
        var geometry = new GroundLineSegmentGeometry();

        Cartesian3.unpack(bottomPositionsArray, index, geometry._startBottom);
        Cartesian3.unpack(topPositionsArray, index, geometry._startTop);
        Cartesian3.unpack(normalsArray, index, geometry._startNormal);

        Cartesian3.unpack(bottomPositionsArray, index + 3, geometry._endBottom);
        Cartesian3.unpack(topPositionsArray, index + 3, geometry._endTop);
        Cartesian3.unpack(normalsArray, index + 3, geometry._endNormal);

        breakMiter(geometry);

        geometry._segmentBottomLength = Cartesian3.distance(geometry._startBottom, geometry._endBottom);

        var ellipsoid = projection.ellipsoid;
        var startCartographic = ellipsoid.cartesianToCartographic(geometry._startBottom, startCartographicScratch);
        var endCartographic = ellipsoid.cartesianToCartographic(geometry._endBottom, endCartographicScratch);
        startCartographic.height = 0.0;
        endCartographic.height = 0.0;

        geometry._segmentBottomLength2D = computeDistance2D(projection, startCartographic, endCartographic);

        // TODO: slide wall positions to match height and depth.
        // Note that this has to happen after the length computations

        return geometry;
    };

    function direction(end, start, result) {
        Cartesian3.subtract(end, start, result);
        Cartesian3.normalize(result, result);
        return result;
    }

    // If either of the normal angles is too steep compared to the direction of the line segment,
    // "break" the miter by rotating the normal 90 degrees around the "up" direction at the point
    // For ultra precision we would want to project into a plane, but in practice this is sufficient.
    var lineDirectionScratch = new Cartesian3();
    var vertexUpScratch = new Cartesian3();
    var matrix3Scratch = new Matrix3();
    var quaternionScratch = new Quaternion();
    function breakMiter(geometry) {
        var lineDirection = direction(geometry._endBottom, geometry._startBottom, lineDirectionScratch);
        var quaternion;
        var rotationMatrix;
        var vertexUp;
        var dot;
        var angle;

        dot = Cartesian3.dot(lineDirection, geometry._startNormal);
        if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
            vertexUp = direction(geometry._startTop, geometry._startBottom, vertexUpScratch);
            angle = dot < MITER_BREAK_LARGE ? CesiumMath.PI_OVER_TWO : -CesiumMath.PI_OVER_TWO;
            quaternion = Quaternion.fromAxisAngle(vertexUp, angle, quaternionScratch);
            rotationMatrix = Matrix3.fromQuaternion(quaternion, matrix3Scratch);
            Matrix3.multiplyByVector(rotationMatrix, geometry._startNormal, geometry._startNormal);
        }

        dot = Cartesian3.dot(lineDirection, geometry._endNormal);
        if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
            vertexUp = direction(geometry._endTop, geometry._endBottom, vertexUpScratch);
            angle = dot < MITER_BREAK_LARGE ? CesiumMath.PI_OVER_TWO : -CesiumMath.PI_OVER_TWO;
            quaternion = Quaternion.fromAxisAngle(vertexUp, angle, quaternionScratch);
            rotationMatrix = Matrix3.fromQuaternion(quaternion, matrix3Scratch);
            Matrix3.multiplyByVector(rotationMatrix, geometry._endNormal, geometry._endNormal);
        }
    }

    defineProperties(GroundLineSegmentGeometry.prototype, {
        // TODO: doc
        segmentBottomLength : {
            get : function() {
                return this._segmentBottomLength;
                }
        },
        segmentBottomLength2D : {
            get : function() {
                return this._segmentBottomLength2D;
            }
        }
    });

    /**
     * The number of elements used to pack the object into an packArray.
     * @type {Number}
     */
    GroundLineSegmentGeometry.packedLength = Cartesian3.packedLength * 6 + 2;

    /**
     * Stores the provided instance into the provided packArray.
     *
     * @param {GroundLineSegmentGeometry} value The value to pack.
     * @param {Number[]} packArray The packArray to pack into.
     * @param {Number} [startingIndex=0] The index into the packArray at which to start packing the elements.
     *
     * @returns {Number[]} The packArray that was packed into
     */
    GroundLineSegmentGeometry.pack = function(value, packArray, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('packArray', packArray);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        Cartesian3.pack(value._startBottom, packArray, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.pack(value._endBottom, packArray, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.pack(value._startTop, packArray, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.pack(value._endTop, packArray, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.pack(value._startNormal, packArray, startingIndex);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.pack(value._endNormal, packArray, startingIndex);

        return packArray;
    };

    /**
     * Retrieves an instance from a packed packArray.
     *
     * @param {Number[]} packArray The packed packArray.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {GroundLineSegmentGeometry} [result] The object into which to store the result.
     * @returns {GroundLineSegmentGeometry} The modified result parameter or a new RectangleGeometry instance if one was not provided.
     */
    GroundLineSegmentGeometry.unpack = function(packArray, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('packArray', packArray);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);
        result = defaultValue(result, new GroundLineSegmentGeometry());

        Cartesian3.unpack(packArray, startingIndex, result._startBottom);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.unpack(packArray, startingIndex, result._endBottom);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.unpack(packArray, startingIndex, result._startTop);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.unpack(packArray, startingIndex, result._endTop);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.unpack(packArray, startingIndex, result._startNormal);
        startingIndex += Cartesian3.packedLength;
        Cartesian3.unpack(packArray, startingIndex, result._endNormal);

        return result;
    };

    var startBottomScratch = new Cartesian3();
    var endBottomScratch = new Cartesian3();
    var endTopScratch = new Cartesian3();
    var startTopScratch = new Cartesian3();
    /**
     *
     * @param {GroundLineSegmentGeometry} groundPolylineSegmentGeometry
     */
    GroundLineSegmentGeometry.createGeometry = function(groundPolylineSegmentGeometry) {
        var startBottom = groundPolylineSegmentGeometry._startBottom;
        var endBottom = groundPolylineSegmentGeometry._endBottom;
        var endTop = groundPolylineSegmentGeometry._endTop;
        var startTop = groundPolylineSegmentGeometry._startTop;
        var startNormal = groundPolylineSegmentGeometry._startNormal;
        var endNormal = groundPolylineSegmentGeometry._endNormal;

        var positions = new Float64Array(24); // 8 vertices

        // Push out by 1.0 in the right direction
        var pushedStartBottom = Cartesian3.add(startBottom, startNormal, startBottomScratch);
        var pushedEndBottom = Cartesian3.add(endBottom, endNormal, endBottomScratch);
        var pushedEndTop = Cartesian3.add(endTop, endNormal, endTopScratch);
        var pushedStartTop = Cartesian3.add(startTop, startNormal, startTopScratch);
        Cartesian3.pack(pushedStartBottom, positions, 0);
        Cartesian3.pack(pushedEndBottom, positions, 1 * 3);
        Cartesian3.pack(pushedEndTop, positions, 2 * 3);
        Cartesian3.pack(pushedStartTop, positions, 3 * 3);

        // Push out by 1.0 in the left direction
        pushedStartBottom = Cartesian3.subtract(startBottom, startNormal, startBottomScratch);
        pushedEndBottom = Cartesian3.subtract(endBottom, endNormal, endBottomScratch);
        pushedEndTop = Cartesian3.subtract(endTop, endNormal, endTopScratch);
        pushedStartTop = Cartesian3.subtract(startTop, startNormal, startTopScratch);
        Cartesian3.pack(pushedStartBottom, positions, 4 * 3);
        Cartesian3.pack(pushedEndBottom, positions, 5 * 3);
        Cartesian3.pack(pushedEndTop, positions, 6 * 3);
        Cartesian3.pack(pushedStartTop, positions, 7 * 3);

        // Winding order is reversed so the volume is inside-out
        var indices = [
            0, 2, 1, 0, 3, 2, // right
            0, 7, 3, 0, 4, 7, // start
            0, 5, 4, 0, 1, 5, // bottom
            5, 7, 4, 5, 6, 7, // left
            5, 2, 6, 5, 1, 2, // end
            3, 6, 2, 3, 7, 6 // top
        ];
        var geometryAttributes = new GeometryAttributes({
            position : new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                normalize : false,
                values : positions
            })
        });

        return new Geometry({
            attributes : geometryAttributes,
            indices : new Uint16Array(indices),
            boundingSphere : BoundingSphere.fromPoints([startBottom, endBottom, endTop, startTop])
        });
    };

    GroundLineSegmentGeometry.prototype.segmentLength = function() {
        return Cartesian3.distance(this._startBottom, this._endBottom);
    };

    var positionCartographicScratch = new Cartographic();
    var normalEndpointScratch = new Cartesian3();
    function projectNormal(projection, position, normal, projectedPosition, result) {
        var normalEndpoint = Cartesian3.add(position, normal, normalEndpointScratch);

        var ellipsoid = projection.ellipsoid;
        var normalEndpointCartographic = ellipsoid.cartesianToCartographic(normalEndpoint, positionCartographicScratch);
        normalEndpointCartographic.height = 0.0;
        var normalEndpointProjected = projection.project(normalEndpointCartographic, result);
        result = Cartesian3.subtract(normalEndpointProjected, projectedPosition, result);
        result.z = 0.0;
        result = Cartesian3.normalize(result, result);
        return result;
    }

    var encodeScratch2D = new EncodedCartesian3();
    var projectedStartPositionScratch = new Cartesian3();
    var projectedEndPositionScratch = new Cartesian3();
    var projectedStartNormalScratch = new Cartesian3();
    var projectedEndNormalScratch = new Cartesian3();
    var forwardOffset2DScratch = new Cartesian3();
    var forwardNormal2DScratch = new Cartesian3();
    function add2DAttributes(attributes, geometry, projection, lengthSoFar2D, segmentLength2D, totalLength2D) {
        var startBottom = geometry._startBottom;
        var endBottom = geometry._endBottom;
        var ellipsoid = projection.ellipsoid;

        // Project positions
        var startCartographic = ellipsoid.cartesianToCartographic(startBottom, startCartographicScratch);
        var endCartographic = ellipsoid.cartesianToCartographic(endBottom, endCartographicScratch);
        startCartographic.height = 0.0;
        endCartographic.height = 0.0;
        var projectedStartPosition = projection.project(startCartographic, projectedStartPositionScratch);
        var projectedEndPosition = projection.project(endCartographic, projectedEndPositionScratch);

        // Project mitering normals
        var projectedStartNormal = projectNormal(projection, startBottom, geometry._startNormal, projectedStartPosition, projectedStartNormalScratch);
        var projectedEndNormal = projectNormal(projection, endBottom, geometry._endNormal, projectedEndPosition, projectedEndNormalScratch);

        // Right direction is just forward direction rotated by -90 degrees around Z
        var forwardOffset = Cartesian3.subtract(projectedEndPosition, projectedStartPosition, forwardOffset2DScratch);
        var forwardDirection = Cartesian3.normalize(forwardOffset, forwardNormal2DScratch);
        var right2D = [forwardDirection.y, -forwardDirection.x];

        // Similarly with plane normals
        var startPlane2D = [-projectedStartNormal.y, projectedStartNormal.x];
        var endPlane2D = [projectedEndNormal.y, -projectedEndNormal.x];

        var encodedStart = EncodedCartesian3.fromCartesian(projectedStartPosition, encodeScratch2D);

        var startHighLow2D_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : [encodedStart.high.x, encodedStart.high.y, encodedStart.low.x, encodedStart.low.y]
        });

        var startEndNormals2D_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : startPlane2D.concat(endPlane2D)
        });

        var offsetAndRight2D_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : [forwardOffset.x, forwardOffset.y, right2D[0], right2D[1]]
        });

        var texcoordNormalization2D_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            normalize: false,
            value : [lengthSoFar2D, segmentLength2D, totalLength2D] // TODO: some floating point problems with this at huge distances!
        });

        attributes.startHighLow2D = startHighLow2D_attribute;
        attributes.startEndNormals2D = startEndNormals2D_attribute;
        attributes.offsetAndRight2D = offsetAndRight2D_attribute;
        attributes.texcoordNormalization2D = texcoordNormalization2D_attribute;
    }

    var encodeScratch = new EncodedCartesian3();
    var offsetScratch = new Cartesian3();
    var normal1Scratch = new Cartesian3();
    var normal2Scratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    /**
     * Gets GeometrtyInstanceAttributes for culling fragments that aren't part of the line and
     * for computing texture coordinates along the line, enabling material support.
     *
     * Computing whether or not a fragment is part of the line requires:
     * - plane at the beginning of the segment (rotated for miter)
     * - plane at the end of the segment (rotated for miter)
     * - right plane for the segment
     *
     * We encode the planes as normals, the start position in high precision, and an offset to the end position.
     * This also gets us planes normal to the line direction that can be used for computing the linear
     * texture coordinate local to the line. This texture coordinate then needs to be mapped to the entire line,
     * which requires an additional set of attributes.
     *
     * @param {GroundLineSegmentGeometry} geometry GroundLineSegmentGeometry
     * @param {MapProjection} projection The MapProjection used for 2D and Columbus View.
     * @param {Number} lengthSoFar Distance of the segment's start point along the line
     * @param {Number} segmentLength Length of the segment
     * @param {Number} totalLength Total length of the entire line
     * @param {Number} lengthSoFar2D Distance of the segment's start point along the line in 2D
     * @param {Number} segmentLength2D Length of the segment in 2D
     * @param {Number} totalLength2D Total length of the entire line in 2D
     * @returns {Object} An object containing GeometryInstanceAttributes for the input geometry
     */
    GroundLineSegmentGeometry.getAttributes = function(geometry, projection, lengthSoFar, segmentLength, totalLength, lengthSoFar2D, segmentLength2D, totalLength2D) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('geometry', geometry);
        Check.typeOf.object('projection', projection);
        Check.typeOf.number('lengthSoFar', lengthSoFar);
        Check.typeOf.number('segmentLength', segmentLength);
        Check.typeOf.number('totalLength', totalLength);
        Check.typeOf.number('lengthSoFar2D', lengthSoFar2D);
        Check.typeOf.number('segmentLength2D', segmentLength2D);
        Check.typeOf.number('totalLength2D', totalLength2D);
        //>>includeEnd('debug');

        // Unpack values from geometry
        var startBottom = geometry._startBottom;
        var endBottom = geometry._endBottom;
        var endTop = geometry._endTop;
        var startTop = geometry._startTop;

        var startCartesianRightNormal = geometry._startNormal;
        var endCartesianRightNormal = geometry._endNormal;

        // Encode start position and end position as high precision point + offset
        var encodedStart = EncodedCartesian3.fromCartesian(startBottom, encodeScratch);

        var forwardOffset = Cartesian3.subtract(endBottom, startBottom, offsetScratch);

        var startHi_and_forwardOffsetX_Attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : Cartesian3.pack(encodedStart.high, [0, 0, 0, forwardOffset.x])
        });

        var startLo_and_forwardOffsetY_Attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : Cartesian3.pack(encodedStart.low, [0, 0, 0, forwardOffset.y])
        });

        var packArray = [0, 0, 0, forwardOffset.z];
        var forward = Cartesian3.normalize(forwardOffset, forwardOffset);

        // Right vector is computed as cross of (startTop - startBottom) and direction to segment end point
        var startUp = Cartesian3.subtract(startTop, startBottom, normal1Scratch);
        startUp = Cartesian3.normalize(startUp, startUp);

        var right = Cartesian3.cross(forward, startUp, rightScratch);
        right = Cartesian3.normalize(right, right);

        var rightNormal_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            normalize: false,
            value : Cartesian3.pack(right, [0, 0, 0])
        });

        // Normal planes need to miter, so cross (startTop - startBottom) with geometry normal at start
        var startNormal = Cartesian3.cross(startUp, startCartesianRightNormal, normal1Scratch);
        startNormal = Cartesian3.normalize(startNormal, startNormal);

        var startNormal_and_forwardOffsetZ_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 4,
            normalize: false,
            value : Cartesian3.pack(startNormal, packArray)
        });

        var endUp = Cartesian3.subtract(endTop, endBottom, normal2Scratch);
        endUp = Cartesian3.normalize(endUp, endUp);
        var endNormal = Cartesian3.cross(endCartesianRightNormal, endUp, normal2Scratch);
        endNormal = Cartesian3.normalize(endNormal, endNormal);

        var endNormal_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            normalize: false,
            value : Cartesian3.pack(endNormal, [0, 0, 0])
        });

        // Texture coordinate localization parameters
        var texcoordNormalization_attribute = new GeometryInstanceAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            normalize: false,
            value : [lengthSoFar, segmentLength, totalLength]
        });

        var attributes = {
            startHi_and_forwardOffsetX : startHi_and_forwardOffsetX_Attribute,
            startLo_and_forwardOffsetY : startLo_and_forwardOffsetY_Attribute,
            startNormal_and_forwardOffsetZ : startNormal_and_forwardOffsetZ_attribute,
            endNormal : endNormal_attribute,
            rightNormal : rightNormal_attribute,
            texcoordNormalization : texcoordNormalization_attribute
        };

        add2DAttributes(attributes, geometry, projection, lengthSoFar2D, segmentLength2D, totalLength2D);
        return attributes;
    };

    return GroundLineSegmentGeometry;
});
