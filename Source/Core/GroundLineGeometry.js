define([
        './BoundingSphere',
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
     * @alias GroundLineGeometry
     * @constructor
     *
     * @private
     *
     * @see GroundLineGeometry#createGeometry
     */
    function GroundLineGeometry() {
        this._startBottom = new Cartesian3();
        this._startTop = new Cartesian3();
        this._startNormal = new Cartesian3();

        this._endBottom = new Cartesian3();
        this._endTop = new Cartesian3();
        this._endNormal = new Cartesian3();

        this._workerName = 'createGroundLineGeometry';
        this._segmentBottomLength = undefined;
    }

    GroundLineGeometry.fromArrays = function(index, normalsArray, bottomPositionsArray, topPositionsArray) {
        var geometry = new GroundLineGeometry();

        Cartesian3.unpack(bottomPositionsArray, index, geometry._startBottom);
        Cartesian3.unpack(topPositionsArray, index, geometry._startTop);
        Cartesian3.unpack(normalsArray, index, geometry._startNormal);

        Cartesian3.unpack(bottomPositionsArray, index + 3, geometry._endBottom);
        Cartesian3.unpack(topPositionsArray, index + 3, geometry._endTop);
        Cartesian3.unpack(normalsArray, index + 3, geometry._endNormal);

        breakMiter(geometry);

        return geometry;
    }

    // TODO: add function to lower the bottom or raise the top to a specific altitude

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

        dot = Cartesian3.dot(lineDirection, geometry._endNormal)
        if (dot > MITER_BREAK_SMALL || dot < MITER_BREAK_LARGE) {
            vertexUp = direction(geometry._endTop, geometry._endBottom, vertexUpScratch);
            angle = dot < MITER_BREAK_LARGE ? CesiumMath.PI_OVER_TWO : -CesiumMath.PI_OVER_TWO;
            quaternion = Quaternion.fromAxisAngle(vertexUp, angle, quaternionScratch);
            rotationMatrix = Matrix3.fromQuaternion(quaternion, matrix3Scratch);
            Matrix3.multiplyByVector(rotationMatrix, geometry._endNormal, geometry._endNormal);
        }
    }

    defineProperties(GroundLineGeometry.prototype, {
        // TODO: doc
        segmentBottomLength : {
            get : function() {
                if (!defined(this._segmentBottomLength)) {
                    this._segmentBottomLength = Cartesian3.distance(this._startBottom, this._endBottom);
                }
                return this._segmentBottomLength;
            }
        }
    });

    /**
     * The number of elements used to pack the object into an packArray.
     * @type {Number}
     */
    GroundLineGeometry.packedLength = Cartesian3.packedLength * 6;

    /**
     * Stores the provided instance into the provided packArray.
     *
     * @param {GroundLineGeometry} value The value to pack.
     * @param {Number[]} packArray The packArray to pack into.
     * @param {Number} [startingIndex=0] The index into the packArray at which to start packing the elements.
     *
     * @returns {Number[]} The packArray that was packed into
     */
    GroundLineGeometry.pack = function(value, packArray, startingIndex) {
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
    }

    /**
     * Retrieves an instance from a packed packArray.
     *
     * @param {Number[]} packArray The packed packArray.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {GroundLineGeometry} [result] The object into which to store the result.
     * @returns {GroundLineGeometry} The modified result parameter or a new RectangleGeometry instance if one was not provided.
     */
    GroundLineGeometry.unpack = function(packArray, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('packArray', packArray);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);
        result = defaultValue(result, new GroundLineGeometry());

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
    }

    var startBottomScratch = new Cartesian3();
    var endBottomScratch = new Cartesian3();
    var endTopScratch = new Cartesian3();
    var startTopScratch = new Cartesian3();
    /**
     *
     * @param {GroundLineGeometry} groundPolylineSegmentGeometry
     */
    GroundLineGeometry.createGeometry = function(groundPolylineSegmentGeometry) {
        var startBottom = groundPolylineSegmentGeometry._startBottom;
        var endBottom = groundPolylineSegmentGeometry._endBottom;
        var endTop = groundPolylineSegmentGeometry._endTop;
        var startTop = groundPolylineSegmentGeometry._startTop;
        var startNormal = groundPolylineSegmentGeometry._startNormal;
        var endNormal = groundPolylineSegmentGeometry._endNormal;

        var positions = new Float64Array(24); // 8 vertices

        // Push out by 1.0 in the right direction
        var startBottom = Cartesian3.add(groundPolylineSegmentGeometry._startBottom, startNormal, startBottomScratch);
        var endBottom = Cartesian3.add(groundPolylineSegmentGeometry._endBottom, endNormal, endBottomScratch);
        var endTop = Cartesian3.add(groundPolylineSegmentGeometry._endTop, endNormal, endTopScratch);
        var startTop = Cartesian3.add(groundPolylineSegmentGeometry._startTop, startNormal, startTopScratch);
        Cartesian3.pack(startBottom, positions, 0);
        Cartesian3.pack(endBottom, positions, 1 * 3);
        Cartesian3.pack(endTop, positions, 2 * 3);
        Cartesian3.pack(startTop, positions, 3 * 3);

        // Push out by 1.0 in the left direction
        startBottom = Cartesian3.subtract(groundPolylineSegmentGeometry._startBottom, startNormal, startBottomScratch);
        endBottom = Cartesian3.subtract(groundPolylineSegmentGeometry._endBottom, endNormal, endBottomScratch);
        endTop = Cartesian3.subtract(groundPolylineSegmentGeometry._endTop, endNormal, endTopScratch);
        startTop = Cartesian3.subtract(groundPolylineSegmentGeometry._startTop, startNormal, startTopScratch);
        Cartesian3.pack(startBottom, positions, 4 * 3);
        Cartesian3.pack(endBottom, positions, 5 * 3);
        Cartesian3.pack(endTop, positions, 6 * 3);
        Cartesian3.pack(startTop, positions, 7 * 3);

        var indices = [
            0, 1, 2, 0, 2, 3, // right
            0, 3, 7, 0, 7, 4, // start
            0, 4, 5, 0, 5, 1, // bottom
            5, 4, 7, 5, 7, 6, // left
            5, 6, 2, 5, 2, 1, // end
            3, 2, 6, 3, 6, 7 // top
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
    }

    GroundLineGeometry.prototype.segmentLength = function() {
        return Cartesian3.distance(this._startBottom, this._endBottom);
    }

    var encodeScratch = new EncodedCartesian3();
    var offsetScratch = new Cartesian3();
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
     * @param {GroundLineGeometry} geometry GroundLineGeometry
     * @param {MapProjection} projection The MapProjection used for 2D and Columbus View.
     * @param {Number} lengthSoFar Distance of the segment's start point along the line
     * @param {Number} segmentLength Length of the segment
     * @param {Number} totalLength Total length of the entire line
     * @returns {Object} An object containing GeometryInstanceAttributes for the input geometry
     */
    GroundLineGeometry.getAttributes = function(geometry, projection, lengthSoFar, segmentLength, totalLength) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('geometry', geometry);
        Check.typeOf.object('projection', projection);
        Check.typeOf.number('lengthSoFar', lengthSoFar);
        Check.typeOf.number('segmentLength', segmentLength);
        Check.typeOf.number('totalLength', totalLength);
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

        // Right vector is computed as cross of startTop - startBottom and direction to segment end end point
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

        // Normal planes need to miter, so cross startTop - startBottom with geometry normal at start
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

        return {
            startHi_and_forwardOffsetX : startHi_and_forwardOffsetX_Attribute,
            startLo_and_forwardOffsetY : startLo_and_forwardOffsetY_Attribute,
            startNormal_and_forwardOffsetZ : startNormal_and_forwardOffsetZ_attribute,
            endNormal : endNormal_attribute,
            rightNormal : rightNormal_attribute,
            texcoordNormalization : texcoordNormalization_attribute
        };
    };

    return GroundLineGeometry;
});
