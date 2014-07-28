/*global define*/
define([
        './BoundingRectangle',
        './BoundingSphere',
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
     * @param {Number} options.shapePositions An array of {@link Cartesian2} positions that define the shape to be extruded along the polyline
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
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
        this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        this._height = defaultValue(options.height, 0.0);
        this._cornerType = defaultValue(options.cornerType, CornerType.ROUNDED);
        this._vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        this._workerName = 'createPolylineVolumeGeometry';
    };

    var brScratch = new BoundingRectangle();

    /**
     * Computes the geometric representation of a polyline with a volume, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolylineVolumeGeometry} polylineVolumeGeometry A description of the polyline volume.
     * @returns {Geometry} The computed vertices and indices.
     *
     * @exception {DeveloperError} Count of unique polyline positions must be greater than 1.
     * @exception {DeveloperError} Count of unique shape positions must be at least 3.
     */
    PolylineVolumeGeometry.createGeometry = function(polylineVolumeGeometry) {
        var positions = polylineVolumeGeometry._positions;
        var cleanPositions = PolylineVolumeGeometryLibrary.removeDuplicatesFromPositions(positions, polylineVolumeGeometry._ellipsoid);
        var shape2D = polylineVolumeGeometry._shape;
        shape2D = PolylineVolumeGeometryLibrary.removeDuplicatesFromShape(shape2D);

        //>>includeStart('debug', pragmas.debug);
        if (cleanPositions.length < 2) {
            throw new DeveloperError('Count of unique polyline positions must be greater than 1.');
        }
        if (shape2D.length < 3) {
            throw new DeveloperError('Count of unique shape positions must be at least 3.');
        }
        //>>includeEnd('debug');

        if (PolygonPipeline.computeWindingOrder2D(shape2D) === WindingOrder.CLOCKWISE) {
            shape2D.reverse();
        }
        var boundingRectangle = BoundingRectangle.fromPoints(shape2D, brScratch);

        var computedPositions = PolylineVolumeGeometryLibrary.computePositions(cleanPositions, shape2D, boundingRectangle, polylineVolumeGeometry, true);
        return computeAttributes(computedPositions, shape2D, boundingRectangle, polylineVolumeGeometry._vertexFormat);
    };

    return PolylineVolumeGeometry;
});