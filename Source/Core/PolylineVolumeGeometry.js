/*global define*/
define([
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './ComponentDatatype',
        './CornerType',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './PolygonPipeline',
        './PolylineVolumeGeometryLibrary',
        './PrimitiveType',
        './VertexFormat',
        './WindingOrder'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        CornerType,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        PolygonPipeline,
        PolylineVolumeGeometryLibrary,
        PrimitiveType,
        VertexFormat,
        WindingOrder) {
    "use strict";

    function computeAttributes(combinedPositions, shape, boundingRectangle, vertexFormat) {
        var attributes = new GeometryAttributes();
        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : combinedPositions
            });
        }
        var shapeLength = shape.length;
        var vertexCount = combinedPositions.length / 3;
        var length = (vertexCount - shapeLength * 2) / (shapeLength * 2);
        var firstEndIndices = PolygonPipeline.triangulate(shape);

        var indicesCount = (length - 1) * (shapeLength) * 6 + firstEndIndices.length * 2;
        var indices = IndexDatatype.createTypedArray(vertexCount, indicesCount);
        var i, j;
        var ll, ul, ur, lr;
        var offset = shapeLength * 2;
        var index = 0;
        for (i = 0; i < length - 1; i++) {
            for (j = 0; j < shapeLength - 1; j++) {
                ll = j * 2 + i * shapeLength * 2;
                lr = ll + offset;
                ul = ll + 1;
                ur = ul + offset;

                indices[index++] = ul;
                indices[index++] = ll;
                indices[index++] = ur;
                indices[index++] = ur;
                indices[index++] = ll;
                indices[index++] = lr;
            }
            ll = shapeLength * 2 - 2 + i * shapeLength * 2;
            ul = ll + 1;
            ur = ul + offset;
            lr = ll + offset;

            indices[index++] = ul;
            indices[index++] = ll;
            indices[index++] = ur;
            indices[index++] = ur;
            indices[index++] = ll;
            indices[index++] = lr;
        }

        if (vertexFormat.st || vertexFormat.tangent || vertexFormat.binormal) { // st required for tangent/binormal calculation
            var st = new Float32Array(vertexCount * 2);
            var lengthSt = 1 / (length - 1);
            var heightSt = 1 / (boundingRectangle.height);
            var heightOffset = boundingRectangle.height / 2;
            var s, t;
            var stindex = 0;
            for (i = 0; i < length; i++) {
                s = i * lengthSt;
                t = heightSt * (shape[0].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
                for (j = 1; j < shapeLength; j++) {
                    t = heightSt * (shape[j].y + heightOffset);
                    st[stindex++] = s;
                    st[stindex++] = t;
                    st[stindex++] = s;
                    st[stindex++] = t;
                }
                t = heightSt * (shape[0].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }
            for (j = 0; j < shapeLength; j++) {
                s = 0;
                t = heightSt * (shape[j].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }
            for (j = 0; j < shapeLength; j++) {
                s = (length - 1) * lengthSt;
                t = heightSt * (shape[j].y + heightOffset);
                st[stindex++] = s;
                st[stindex++] = t;
            }

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : new Float32Array(st)
            });
        }

        var endOffset = vertexCount - shapeLength * 2;
        for (i = 0; i < firstEndIndices.length; i += 3) {
            var v0 = firstEndIndices[i] + endOffset;
            var v1 = firstEndIndices[i + 1] + endOffset;
            var v2 = firstEndIndices[i + 2] + endOffset;

            indices[index++] = v0;
            indices[index++] = v1;
            indices[index++] = v2;
            indices[index++] = v2 + shapeLength;
            indices[index++] = v1 + shapeLength;
            indices[index++] = v0 + shapeLength;
        }

        var geometry = new Geometry({
            attributes : attributes,
            indices : indices,
            boundingSphere : BoundingSphere.fromVertices(combinedPositions),
            primitiveType : PrimitiveType.TRIANGLES
        });

        if (vertexFormat.normal) {
            geometry = GeometryPipeline.computeNormal(geometry);
        }

        if (vertexFormat.tangent || vertexFormat.binormal) {
            geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
            if (!vertexFormat.tangent) {
                geometry.attributes.tangent = undefined;
            }
            if (!vertexFormat.binormal) {
                geometry.attributes.binormal = undefined;
            }
            if (!vertexFormat.st) {
                geometry.attributes.st = undefined;
            }
        }

        return geometry;
    }

    /**
     * A description of a polyline with a volume (a 2D shape extruded along a polyline).
     *
     * @alias PolylineVolumeGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.polylinePositions An array of {@link Cartesain3} positions that define the center of the polyline volume.
     * @param {Cartesian2[]} options.shapePositions An array of {@link Cartesian2} positions that define the shape to be extruded along the polyline
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {CornerType} [options.cornerType=CornerType.ROUNDED] Determines the style of the corners.
     *
     * @see PolylineVolumeGeometry#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polyline%20Volume.html|Cesium Sandcastle Polyline Volume Demo}
     *
     * @example
     * function computeCircle(radius) {
     *   var positions = [];
     *   for (var i = 0; i < 360; i++) {
     *     var radians = Cesium.Math.toRadians(i);
     *     positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)));
     *   }
     *   return positions;
     * }
     *
     * var volume = new Cesium.PolylineVolumeGeometry({
     *   vertexFormat : Cesium.VertexFormat.POSITION_ONLY,
     *   polylinePositions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0
     *   ]),
     *   shapePositions : computeCircle(100000.0)
     * });
     */
    var PolylineVolumeGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.polylinePositions;
        var shape = options.shapePositions;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(positions)) {
            throw new DeveloperError('options.polylinePositions is required.');
        }
        if (!defined(shape)) {
            throw new DeveloperError('options.shapePositions is required.');
        }
        //>>includeEnd('debug');

        this._positions = positions;
        this._shape = shape;
        this._ellipsoid = Ellipsoid.clone(defaultValue(options.ellipsoid, Ellipsoid.WGS84));
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._vertexFormat = VertexFormat.clone(defaultValue(options.vertexFormat, VertexFormat.DEFAULT));
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createPolylineVolumeGeometry';

        var numComponents = 1 + positions.length * Cartesian3.packedLength;
        numComponents += 1 + shape.length * Cartesian2.packedLength;

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = numComponents + Ellipsoid.packedLength + VertexFormat.packedLength + 2;
    };

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {PolylineVolumeGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    PolylineVolumeGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var positions = value._positions;
        var length = positions.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            Cartesian3.pack(positions[i], array, startingIndex);
        }

        var shape = value._shape;
        length = shape.length;
        array[startingIndex++] = length;

        for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
            Cartesian2.pack(shape[i], array, startingIndex);
        }

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._cornerType;
        array[startingIndex]   = value._granularity;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        polylinePositions : undefined,
        shapePositions : undefined,
        ellipsoid : scratchEllipsoid,
        vertexFormat : scratchVertexFormat,
        cornerType : undefined,
        granularity : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolylineVolumeGeometry} [result] The object into which to store the result.
     * @returns {PolylineVolumeGeometry} The modified result parameter or a new PolylineVolumeGeometry instance if one was not provided.
     */
    PolylineVolumeGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var i;

        var length = array[startingIndex++];
        var positions = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian3.packedLength) {
            positions[i] = Cartesian3.unpack(array, startingIndex);
        }

        length = array[startingIndex++];
        var shape = new Array(length);

        for (i = 0; i < length; ++i, startingIndex += Cartesian2.packedLength) {
            shape[i] = Cartesian2.unpack(array, startingIndex);
        }

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var cornerType = array[startingIndex++];
        var granularity = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.polylinePositions = positions;
            scratchOptions.shapePositions = shape;
            scratchOptions.cornerType = cornerType;
            scratchOptions.granularity = granularity;
            return new PolylineVolumeGeometry(scratchOptions);
        }

        result._positions = positions;
        result._shape = shape;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._cornerType = cornerType;
        result._granularity = granularity;

        return result;
    };

    var brScratch = new BoundingRectangle();

    /**
     * Computes the geometric representation of a polyline with a volume, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polyline volume.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PolylineVolumeGeometry.createGeometry = function(polylineVolumeGeometry) {
        var positions = polylineVolumeGeometry._positions;
        var cleanPositions = PolylineVolumeGeometryLibrary.removeDuplicatesFromPositions(positions, polylineVolumeGeometry._ellipsoid);
        var shape2D = polylineVolumeGeometry._shape;
        shape2D = PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

        if (cleanPositions.length < 2 || shape2D.length < 3) {
            return undefined;
        }

        if (PolygonPipeline.computeWindingOrder2D(shape2D) === WindingOrder.CLOCKWISE) {
            shape2D.reverse();
        }
        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);

        var computedPositions = PolylineVolumeGeometryLibrary.computePositions(cleanPositions, shape2D, boundingRectangle, polylineVolumeGeometry, true);
        return computeAttributes(computedPositions, shape2D, boundingRectangle, polylineVolumeGeometry._vertexFormat);
    };

    return PolylineVolumeGeometry;
});