/*global define*/
define([
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PrimitiveType',
        './Quaternion',
        './Queue',
        './VertexFormat',
        './WindingOrder'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        Quaternion,
        Queue,
        VertexFormat,
        WindingOrder) {
    "use strict";

    var computeBoundingRectangleCartesian2 = new Cartesian2();
    var computeBoundingRectangleCartesian3 = new Cartesian3();
    var computeBoundingRectangleQuaternion = new Quaternion();
    var computeBoundingRectangleMatrix3 = new Matrix3();

    function computeBoundingRectangle(tangentPlane, positions, angle, result) {
        var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, angle, computeBoundingRectangleQuaternion);
        var textureMatrix = Matrix3.fromQuaternion(rotation, computeBoundingRectangleMatrix3);

        var minX = Number.POSITIVE_INFINITY;
        var maxX = Number.NEGATIVE_INFINITY;
        var minY = Number.POSITIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;

        var length = positions.length;
        for ( var i = 0; i < length; ++i) {
            var p = Cartesian3.clone(positions[i], computeBoundingRectangleCartesian3);
            Matrix3.multiplyByVector(textureMatrix, p, p);
            var st = tangentPlane.projectPointOntoPlane(p, computeBoundingRectangleCartesian2);

            if (defined(st)) {
                minX = Math.min(minX, st.x);
                maxX = Math.max(maxX, st.x);

                minY = Math.min(minY, st.y);
                maxY = Math.max(maxY, st.y);
            }
        }

        result.x = minX;
        result.y = minY;
        result.width = maxX - minX;
        result.height = maxY - minY;
        return result;
    }

    var createGeometryFromPositionsPositions = [];

    function createGeometryFromPositions(ellipsoid, positions, granularity, perPositionHeight) {
        var tangentPlane = EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(positions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            positions.reverse();
        }

        var indices = PolygonPipeline.triangulate(positions2D);
        /* If polygon is completely unrenderable, just use the first three vertices */
        if (indices.length < 3) {
            indices = [0, 1, 2];
        }

        var geo;
        if (!perPositionHeight) {
            geo = PolygonPipeline.computeSubdivision(ellipsoid, positions, indices, granularity);
        } else {
            var length = positions.length;
            var flattenedPositions = new Array(length * 3);
            var index = 0;
            for ( var i = 0; i < length; i++) {
                var p = positions[i];
                flattenedPositions[index++] = p.x;
                flattenedPositions[index++] = p.y;
                flattenedPositions[index++] = p.z;
            }
            geo = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : flattenedPositions
                    })
                },
                indices : indices,
                primitiveType : PrimitiveType.TRIANGLES
            });
        }

        return new GeometryInstance({
            geometry : geo
        });
    }

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    function computeAttributes(vertexFormat, geometry, outerPositions, ellipsoid, stRotation, bottom, wall) {
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var tangentPlane = EllipsoidTangentPlane.fromPoints(outerPositions, ellipsoid);
            var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var flatPositions = geometry.attributes.position.values;
            var length = flatPositions.length;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals = vertexFormat.normal ? new Float32Array(length) : undefined;
            var tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
            var binormals = vertexFormat.binormal ? new Float32Array(length) : undefined;

            var textureCoordIndex = 0;
            var attrIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;
            var binormal = scratchBinormal;
            var recomputeNormal = true;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            var bottomOffset = length / 2;
            var bottomOffset2 = length / 3;

            if (bottom) {
                length /= 2;
            }

            for ( var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    if (bottom) {
                        textureCoordinates[textureCoordIndex + bottomOffset2] = st.x / boundingRectangle.width;
                        textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = st.y / boundingRectangle.height;
                    }

                    textureCoordinates[textureCoordIndex] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex + 1] = st.y / boundingRectangle.height;

                    textureCoordIndex += 2;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    var attrIndex1 = attrIndex + 1;
                    var attrIndex2 = attrIndex + 2;

                    if (wall) {
                        if (i + 3 < length) {
                            var p1 = Cartesian3.fromArray(flatPositions, i + 3, p1Scratch);

                            if (recomputeNormal) {
                                var p2 = Cartesian3.fromArray(flatPositions, i + length, p2Scratch);
                                Cartesian3.subtract(p1, position, p1);
                                Cartesian3.subtract(p2, position, p2);
                                normal = Cartesian3.normalize(Cartesian3.cross(p2, p1, normal), normal);
                                recomputeNormal = false;
                            }

                            if (Cartesian3.equalsEpsilon(p1, position, CesiumMath.EPSILON10)) { // if we've reached a corner
                                recomputeNormal = true;
                            }
                        }

                        if (vertexFormat.tangent || vertexFormat.binormal) {
                            binormal = ellipsoid.geodeticSurfaceNormal(position, binormal);
                            if (vertexFormat.tangent) {
                                tangent = Cartesian3.normalize(Cartesian3.cross(binormal, normal, tangent), tangent);
                            }
                        }

                    } else {
                        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
                        if (vertexFormat.tangent || vertexFormat.binormal) {
                            tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                            tangent = Cartesian3.normalize(Matrix3.multiplyByVector(textureMatrix, tangent, tangent), tangent);
                            if (vertexFormat.binormal) {
                                binormal = Cartesian3.normalize(Cartesian3.cross(normal, tangent, binormal), binormal);
                            }
                        }
                    }

                    if (vertexFormat.normal) {
                        if (bottom && !wall) {
                            normals[attrIndex + bottomOffset] = -normal.x;
                            normals[attrIndex1 + bottomOffset] = -normal.y;
                            normals[attrIndex2 + bottomOffset] = -normal.z;
                        } else {
                            normals[attrIndex + bottomOffset] = normal.x;
                            normals[attrIndex1 + bottomOffset] = normal.y;
                            normals[attrIndex2 + bottomOffset] = normal.z;
                        }

                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        if (bottom && !wall) {
                            tangents[attrIndex + bottomOffset] = -tangent.x;
                            tangents[attrIndex1 + bottomOffset] = -tangent.y;
                            tangents[attrIndex2 + bottomOffset] = -tangent.z;
                        } else {
                            tangents[attrIndex + bottomOffset] = tangent.x;
                            tangents[attrIndex1 + bottomOffset] = tangent.y;
                            tangents[attrIndex2 + bottomOffset] = tangent.z;
                        }

                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        if (bottom) {
                            binormals[attrIndex + bottomOffset] = binormal.x;
                            binormals[attrIndex1 + bottomOffset] = binormal.y;
                            binormals[attrIndex2 + bottomOffset] = binormal.z;
                        }

                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
                    }
                    attrIndex += 3;
                }
            }

            if (vertexFormat.st) {
                geometry.attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : textureCoordinates
                });
            }

            if (vertexFormat.normal) {
                geometry.attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                geometry.attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.binormal) {
                geometry.attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }
        return geometry;
    }

    var computeWallIndicesSubdivided = [];

    function computeWallIndices(positions, ellipsoid, granularity, perPositionHeight){
        var edgePositions;
        var topEdgeLength;
        var i;
        var p1;
        var p2;

        var length = positions.length;
        var index = 0;

        if (!perPositionHeight) {
            var minDistance = CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);

            var numVertices = 0;
            for (i = 0; i < length; i++) {
                numVertices += PolygonGeometryLibrary.subdivideLineCount(positions[i], positions[(i + 1) % length], minDistance);
            }

            topEdgeLength = (numVertices + length) * 3;
            edgePositions = new Array(topEdgeLength * 2);
            for (i = 0; i < length; i++) {
                p1 = positions[i];
                p2 = positions[(i + 1) % length];

                var tempPositions = PolygonGeometryLibrary.subdivideLine(p1, p2, minDistance, computeWallIndicesSubdivided);
                var tempPositionsLength = tempPositions.length;
                for (var j = 0; j < tempPositionsLength; ++j, ++index) {
                    edgePositions[index] = tempPositions[j];
                    edgePositions[index + topEdgeLength] = tempPositions[j];
                }

                edgePositions[index] = p2.x;
                edgePositions[index + topEdgeLength] = p2.x;
                ++index;

                edgePositions[index] = p2.y;
                edgePositions[index + topEdgeLength] = p2.y;
                ++index;

                edgePositions[index] = p2.z;
                edgePositions[index + topEdgeLength] = p2.z;
                ++index;
            }
        } else {
            topEdgeLength = length * 3 * 2;
            edgePositions = new Array(topEdgeLength * 2);
            for (i = 0; i < length; i++) {
                p1 = positions[i];
                p2 = positions[(i + 1) % length];
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.x;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.y;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p1.z;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.x;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.y;
                ++index;
                edgePositions[index] = edgePositions[index + topEdgeLength] = p2.z;
                ++index;
            }
        }

        length = edgePositions.length;
        var indices = IndexDatatype.createTypedArray(length / 3, length - positions.length * 6);
        var edgeIndex = 0;
        length /= 6;

        for (i = 0; i < length; i++) {
            var UL = i;
            var UR = UL + 1;
            var LL = UL + length;
            var LR = LL + 1;

            p1 = Cartesian3.fromArray(edgePositions, UL * 3, p1Scratch);
            p2 = Cartesian3.fromArray(edgePositions, UR * 3, p2Scratch);
            if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON14)) {
                continue;
            }

            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = LR;
        }

        return new Geometry({
            attributes : new GeometryAttributes({
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : edgePositions
                })
            }),
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES
        });
    }

    var createGeometryFromPositionsExtrudedPositions = [];

    function createGeometryFromPositionsExtruded(ellipsoid, positions, granularity, hierarchy, perPositionHeight) {
        var topGeo = createGeometryFromPositions(ellipsoid, positions, granularity, perPositionHeight).geometry;

        var edgePoints = topGeo.attributes.position.values;
        var indices = topGeo.indices;

        var topBottomPositions = edgePoints.concat(edgePoints);
        var numPositions = topBottomPositions.length / 3;

        var newIndices = IndexDatatype.createTypedArray(numPositions, indices.length * 2);
        newIndices.set(indices);
        var ilength = indices.length;

        var i;
        var length = numPositions / 2;

        for (i = 0; i < ilength; i += 3) {
            var i0 = newIndices[i] + length;
            var i1 = newIndices[i + 1] + length;
            var i2 = newIndices[i + 2] + length;

            newIndices[i + ilength] = i2;
            newIndices[i + 1 + ilength] = i1;
            newIndices[i + 2 + ilength] = i0;
        }

        var topAndBottomGeo = new Geometry({
            attributes : new GeometryAttributes({
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : topBottomPositions
                })
            }),
            indices : newIndices,
            primitiveType : topGeo.primitiveType
        });

        var geos = {
            topAndBottom : new GeometryInstance({
                geometry : topAndBottomGeo
            }),
            walls : []
        };

        var outerRing = hierarchy.outerRing;
        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(outerRing, createGeometryFromPositionsExtrudedPositions);

        var windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (windingOrder === WindingOrder.CLOCKWISE) {
            outerRing.reverse();
        }

        var wallGeo = computeWallIndices(outerRing, ellipsoid, granularity, perPositionHeight);
        geos.walls.push(new GeometryInstance({
            geometry : wallGeo
        }));

        var holes = hierarchy.holes;
        for (i = 0; i < holes.length; i++) {
            var hole = holes[i];

            tangentPlane = EllipsoidTangentPlane.fromPoints(hole, ellipsoid);
            positions2D = tangentPlane.projectPointsOntoPlane(hole, createGeometryFromPositionsExtrudedPositions);

            windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (windingOrder === WindingOrder.COUNTER_CLOCKWISE) {
                hole.reverse();
            }

            wallGeo = computeWallIndices(hole, ellipsoid, granularity);
            geos.walls.push(new GeometryInstance({
                geometry : wallGeo
            }));
        }

        return geos;
    }

    /**
     * A description of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     *
     * @see PolygonGeometry#createGeometry
     * @see PolygonGeometry#fromPositions
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
     *
     * @example
     * // 1. create a polygon from points
     * var polygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   }
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     *
     * // 2. create a nested polygon with holes
     * var polygonWithHole = new Cesium.PolygonGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -109.0, 30.0,
     *       -95.0, 30.0,
     *       -95.0, 40.0,
     *       -109.0, 40.0
     *     ]),
     *     holes : [{
     *       positions : Cesium.Cartesian3.fromDegreesArray([
     *         -107.0, 31.0,
     *         -107.0, 39.0,
     *         -97.0, 39.0,
     *         -97.0, 31.0
     *       ]),
     *       holes : [{
     *         positions : Cesium.Cartesian3.fromDegreesArray([
     *           -105.0, 33.0,
     *           -99.0, 33.0,
     *           -99.0, 37.0,
     *           -105.0, 37.0
     *         ]),
     *         holes : [{
     *           positions : Cesium.Cartesian3.fromDegreesArray([
     *             -103.0, 34.0,
     *             -101.0, 34.0,
     *             -101.0, 36.0,
     *             -103.0, 36.0
     *           ])
     *         }]
     *       }]
     *     }]
     *   }
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygonWithHole);
     *
     * // 3. create extruded polygon
     * var extrudedPolygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : {
     *     positions : Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ]),
     *     extrudedHeight: 300000
     *   }
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(extrudedPolygon);
     */
    var PolygonGeometry = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.polygonHierarchy)) {
            throw new DeveloperError('options.polygonHierarchy is required.');
        }
        //>>includeEnd('debug');

        var polygonHierarchy = options.polygonHierarchy;
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var stRotation = defaultValue(options.stRotation, 0.0);
        var height = defaultValue(options.height, 0.0);
        var perPositionHeight = defaultValue(options.perPositionHeight, false);

        var extrudedHeight = options.extrudedHeight;
        var extrude = (defined(extrudedHeight) && (!CesiumMath.equalsEpsilon(height, extrudedHeight, CesiumMath.EPSILON6) || perPositionHeight));
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, height);
            height = Math.max(h, height);
        }

        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._granularity = granularity;
        this._stRotation = stRotation;
        this._height = height;
        this._extrudedHeight = defaultValue(extrudedHeight, 0.0);
        this._extrude = extrude;
        this._polygonHierarchy = polygonHierarchy;
        this._perPositionHeight = perPositionHeight;
        this._workerName = 'createPolygonGeometry';

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + Ellipsoid.packedLength + VertexFormat.packedLength + 7;
    };

    /**
     * A description of a polygon from an array of positions.
     *
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     *
     * @see PolygonGeometry#createGeometry
     *
     * @example
     * // create a polygon from points
     * var polygon = Cesium.PolygonGeometry.fromPositions({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0,
     *     -75.0, 30.0,
     *     -70.0, 30.0,
     *     -68.0, 40.0
     *   ])
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     */
    PolygonGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.positions)) {
            throw new DeveloperError('options.positions is required.');
        }
        //>>includeEnd('debug');

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            vertexFormat : options.vertexFormat,
            stRotation : options.stRotation,
            ellipsoid : options.ellipsoid,
            granularity : options.granularity,
            perPositionHeight : options.perPositionHeight
        };
        return new PolygonGeometry(newOptions);
    };

    /**
     * Stores the provided instance into the provided array.
     * @function
     *
     * @param {Object} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     */
    PolygonGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._stRotation;
        array[startingIndex++] = value._extrude ? 1.0 : 0.0;
        array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
        array[startingIndex] = value.packedLength;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();

    //Only used to avoid inaability to default construct.
    var dummyOptions = {
        polygonHierarchy : {}
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolygonGeometry} [result] The object into which to store the result.
     */
    PolygonGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
        startingIndex = polygonHierarchy.startingIndex;
        delete polygonHierarchy.startingIndex;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var granularity = array[startingIndex++];
        var stRotation = array[startingIndex++];
        var extrude = array[startingIndex++] === 1.0;
        var perPositionHeight = array[startingIndex++] === 1.0;
        var packedLength = array[startingIndex];

        if (!defined(result)) {
            result = new PolygonGeometry(dummyOptions);
        }

        result._polygonHierarchy = polygonHierarchy;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._height = height;
        result._extrudedHeight = extrudedHeight;
        result._granularity = granularity;
        result._stRotation = stRotation;
        result._extrude = extrude;
        result._perPositionHeight = perPositionHeight;
        result.packedLength = packedLength;
        return result;
    };

    /**
     * Computes the geometric representation of a polygon, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolygonGeometry} polygonGeometry A description of the polygon.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PolygonGeometry.createGeometry = function(polygonGeometry) {
        var vertexFormat = polygonGeometry._vertexFormat;
        var ellipsoid = polygonGeometry._ellipsoid;
        var granularity = polygonGeometry._granularity;
        var stRotation = polygonGeometry._stRotation;
        var height = polygonGeometry._height;
        var extrudedHeight = polygonGeometry._extrudedHeight;
        var extrude = polygonGeometry._extrude;
        var polygonHierarchy = polygonGeometry._polygonHierarchy;
        var perPositionHeight = polygonGeometry._perPositionHeight;

        var walls;
        var topAndBottom;
        var outerPositions;

        // create from a polygon hierarchy
        // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
        var polygons = [];
        var queue = new Queue();
        queue.enqueue(polygonHierarchy);
        polygonHierarchy = [];
        var i;
        while (queue.length !== 0) {
            var outerNode = queue.dequeue();
            var outerRing = outerNode.positions;
            var holes = outerNode.holes;
            outerRing = PolygonPipeline.removeDuplicates(outerRing);
            if (outerRing.length < 3) {
                continue;
            }

            var numChildren = defined(holes) ? holes.length : 0;
            var polygonHoles = [];
            for (i = 0; i < numChildren; i++) {
                var hole = holes[i];
                hole.positions = PolygonPipeline.removeDuplicates(hole.positions);
                if (hole.positions.length < 3) {
                    continue;
                }
                polygonHoles.push(hole.positions);

                var numGrandchildren = 0;
                if (defined(hole.holes)) {
                    numGrandchildren = hole.holes.length;
                }

                for ( var j = 0; j < numGrandchildren; j++) {
                    queue.enqueue(hole.holes[j]);
                }
            }

            polygonHierarchy.push({
                outerRing : outerRing,
                holes : polygonHoles
            });

            var combinedPolygon = polygonHoles.length > 0 ? PolygonPipeline.eliminateHoles(outerRing, polygonHoles) : outerRing;
            polygons.push(combinedPolygon);
        }

        if (polygons.length === 0) {
            return undefined;
        }

        outerPositions = polygons[0];

        var geometry;
        var geometries = [];

        if (extrude) {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], granularity, polygonHierarchy[i], perPositionHeight);
                topAndBottom = geometry.topAndBottom;
                topAndBottom.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(topAndBottom.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                topAndBottom.geometry = computeAttributes(vertexFormat, topAndBottom.geometry, outerPositions, ellipsoid, stRotation, true, false);
                geometries.push(topAndBottom);

                walls = geometry.walls;
                for ( var k = 0; k < walls.length; k++) {
                    var wall = walls[k];
                    wall.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(wall.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                    wall.geometry = computeAttributes(vertexFormat, wall.geometry, outerPositions, ellipsoid, stRotation, true, true);
                    geometries.push(wall);
                }
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositions(ellipsoid, polygons[i], granularity, perPositionHeight);
                geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, height, ellipsoid, !perPositionHeight);
                geometry.geometry = computeAttributes(vertexFormat, geometry.geometry, outerPositions, ellipsoid, stRotation, false, false);
                geometries.push(geometry);
            }
        }

        geometry = GeometryPipeline.combineInstances(geometries)[0];
        geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
        geometry.indices = IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

        var attributes = geometry.attributes;
        var boundingSphere = BoundingSphere.fromVertices(attributes.position.values);

        if (!vertexFormat.position) {
            delete attributes.position;
        }

        return new Geometry({
            attributes : attributes,
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });
    };

    return PolygonGeometry;
});
