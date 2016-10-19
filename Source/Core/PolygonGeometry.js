/*global define*/
define([
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './defineProperties',
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
        './Quaternion',
        './Rectangle',
        './VertexFormat',
        './WindingOrder'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartographic,
        ComponentDatatype,
        defaultValue,
        defined,
        defineProperties,
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
        Quaternion,
        Rectangle,
        VertexFormat,
        WindingOrder) {
    'use strict';

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

    var scratchCarto1 = new Cartographic();
    var scratchCarto2 = new Cartographic();
    function adjustPosHeightsForNormal(position, p1, p2, ellipsoid) {
        var carto1 = ellipsoid.cartesianToCartographic(position, scratchCarto1);
        var height = carto1.height;
        var p1Carto = ellipsoid.cartesianToCartographic(p1, scratchCarto2);
        p1Carto.height = height;
        ellipsoid.cartographicToCartesian(p1Carto, p1);

        var p2Carto = ellipsoid.cartesianToCartographic(p2, scratchCarto2);
        p2Carto.height = height - 100;
        ellipsoid.cartographicToCartesian(p2Carto, p2);
    }

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();
    var scratchPerPosNormal = new Cartesian3();
    var scratchPerPosTangent = new Cartesian3();
    var scratchPerPosBinormal = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    function computeAttributes(options) {
        var vertexFormat = options.vertexFormat;
        var geometry = options.geometry;
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var boundingRectangle = options.boundingRectangle;
            var tangentPlane = options.tangentPlane;
            var ellipsoid = options.ellipsoid;
            var stRotation = options.stRotation;
            var wall = options.wall;
            var top = options.top || wall;
            var bottom = options.bottom || wall;
            var perPositionHeight = options.perPositionHeight;

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var flatPositions = geometry.attributes.position.values;
            var length = flatPositions.length;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals;
            if (vertexFormat.normal) {
                if (perPositionHeight && top && !wall) {
                    normals = geometry.attributes.normal.values;
                } else {
                    normals = new Float32Array(length);
                }
            }
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

            var bottomOffset = 0;
            var bottomOffset2 = 0;

            if (top && bottom) {
                bottomOffset = length / 2;
                bottomOffset2 = length / 3;

                length /= 2;
            }

            for ( var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    p = ellipsoid.scaleToGeodeticSurface(p,p);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    var stx = CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
                    var sty = CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
                    if (bottom) {
                        textureCoordinates[textureCoordIndex + bottomOffset2] = stx;
                        textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = sty;
                    }
                    if (top) {
                        textureCoordinates[textureCoordIndex] = stx;
                        textureCoordinates[textureCoordIndex + 1] = sty;
                    }

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
                                if (perPositionHeight) {
                                    adjustPosHeightsForNormal(position, p1, p2, ellipsoid);
                                }
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
                            if (perPositionHeight) {
                                scratchPerPosNormal = Cartesian3.fromArray(normals, attrIndex, scratchPerPosNormal);
                                scratchPerPosTangent = Cartesian3.cross(Cartesian3.UNIT_Z, scratchPerPosNormal, scratchPerPosTangent);
                                scratchPerPosTangent = Cartesian3.normalize(Matrix3.multiplyByVector(textureMatrix, scratchPerPosTangent, scratchPerPosTangent), scratchPerPosTangent);
                                if (vertexFormat.binormal) {
                                    scratchPerPosBinormal = Cartesian3.normalize(Cartesian3.cross(scratchPerPosNormal, scratchPerPosTangent, scratchPerPosBinormal), scratchPerPosBinormal);
                                }
                            }

                            tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                            tangent = Cartesian3.normalize(Matrix3.multiplyByVector(textureMatrix, tangent, tangent), tangent);
                            if (vertexFormat.binormal) {
                                binormal = Cartesian3.normalize(Cartesian3.cross(normal, tangent, binormal), binormal);
                            }
                        }
                    }

                    if (vertexFormat.normal) {
                        if (options.wall) {
                            normals[attrIndex + bottomOffset] = normal.x;
                            normals[attrIndex1 + bottomOffset] = normal.y;
                            normals[attrIndex2 + bottomOffset] = normal.z;
                        } else if (bottom){
                            normals[attrIndex + bottomOffset] = -normal.x;
                            normals[attrIndex1 + bottomOffset] = -normal.y;
                            normals[attrIndex2 + bottomOffset] = -normal.z;
                        }

                        if ((top && !perPositionHeight) || wall) {
                            normals[attrIndex] = normal.x;
                            normals[attrIndex1] = normal.y;
                            normals[attrIndex2] = normal.z;
                        }
                    }

                    if (vertexFormat.tangent) {
                        if (options.wall) {
                            tangents[attrIndex + bottomOffset] = tangent.x;
                            tangents[attrIndex1 + bottomOffset] = tangent.y;
                            tangents[attrIndex2 + bottomOffset] = tangent.z;
                        } else if (bottom) {
                            tangents[attrIndex + bottomOffset] = -tangent.x;
                            tangents[attrIndex1 + bottomOffset] = -tangent.y;
                            tangents[attrIndex2 + bottomOffset] = -tangent.z;
                        }

                        if(top) {
                            if (perPositionHeight) {
                                tangents[attrIndex] = scratchPerPosTangent.x;
                                tangents[attrIndex1] = scratchPerPosTangent.y;
                                tangents[attrIndex2] = scratchPerPosTangent.z;
                            } else {
                                tangents[attrIndex] = tangent.x;
                                tangents[attrIndex1] = tangent.y;
                                tangents[attrIndex2] = tangent.z;
                            }
                        }
                    }

                    if (vertexFormat.binormal) {
                        if (bottom) {
                            binormals[attrIndex + bottomOffset] = binormal.x;
                            binormals[attrIndex1 + bottomOffset] = binormal.y;
                            binormals[attrIndex2 + bottomOffset] = binormal.z;
                        }
                        if (top) {
                            if (perPositionHeight) {
                                binormals[attrIndex] = scratchPerPosBinormal.x;
                                binormals[attrIndex1] = scratchPerPosBinormal.y;
                                binormals[attrIndex2] = scratchPerPosBinormal.z;
                            } else {
                                binormals[attrIndex] = binormal.x;
                                binormals[attrIndex1] = binormal.y;
                                binormals[attrIndex2] = binormal.z;
                            }
                        }
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

    var createGeometryFromPositionsExtrudedPositions = [];

    function createGeometryFromPositionsExtruded(ellipsoid, polygon, granularity, hierarchy, perPositionHeight, closeTop, closeBottom, vertexFormat) {
        var geos = {
            walls : []
        };
        var i;

        if (closeTop || closeBottom) {
            var topGeo = PolygonGeometryLibrary.createGeometryFromPositions(ellipsoid, polygon, granularity, perPositionHeight, vertexFormat);

            var edgePoints = topGeo.attributes.position.values;
            var indices = topGeo.indices;
            var numPositions;
            var newIndices;

            if (closeTop && closeBottom) {
                var topBottomPositions = edgePoints.concat(edgePoints);
                numPositions = topBottomPositions.length / 3;

                newIndices = IndexDatatype.createTypedArray(numPositions, indices.length * 2);
                newIndices.set(indices);
                var ilength = indices.length;


                var length = numPositions / 2;

                for (i = 0; i < ilength; i += 3) {
                    var i0 = newIndices[i] + length;
                    var i1 = newIndices[i + 1] + length;
                    var i2 = newIndices[i + 2] + length;

                    newIndices[i + ilength] = i2;
                    newIndices[i + 1 + ilength] = i1;
                    newIndices[i + 2 + ilength] = i0;
                }

                topGeo.attributes.position.values = topBottomPositions;
                if (perPositionHeight) {
                    var normals = topGeo.attributes.normal.values;
                    topGeo.attributes.normal.values = new Float32Array(topBottomPositions.length);
                    topGeo.attributes.normal.values.set(normals);
                }
                topGeo.indices = newIndices;
            } else if (closeBottom) {
                numPositions = edgePoints.length / 3;
                newIndices = IndexDatatype.createTypedArray(numPositions, indices.length);

                for (i = 0; i < indices.length; i += 3) {
                    newIndices[i] = indices[i + 2];
                    newIndices[i + 1] = indices[i + 1];
                    newIndices[i + 2] = indices[i];
                }

                topGeo.indices = newIndices;
            }

            geos.topAndBottom = new GeometryInstance({
                geometry : topGeo
            });

        }

        var outerRing = hierarchy.outerRing;
        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(outerRing, createGeometryFromPositionsExtrudedPositions);

        var windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (windingOrder === WindingOrder.CLOCKWISE) {
            outerRing = outerRing.slice().reverse();
        }

        var wallGeo = PolygonGeometryLibrary.computeWallGeometry(outerRing, ellipsoid, granularity, perPositionHeight);
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
                hole = hole.slice().reverse();
            }

            wallGeo = PolygonGeometryLibrary.computeWallGeometry(hole, ellipsoid, granularity);
            geos.walls.push(new GeometryInstance({
                geometry : wallGeo
            }));
        }

        return geos;
    }

    /**
     * A description of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The distance in meters between the polygon and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the polygon's extruded face and the ellipsoid surface.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
     * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
     *
     * @see PolygonGeometry#createGeometry
     * @see PolygonGeometry#fromPositions
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
     *
     * @example
     * // 1. create a polygon from points
     * var polygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   )
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     *
     * // 2. create a nested polygon with holes
     * var polygonWithHole = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -109.0, 30.0,
     *       -95.0, 30.0,
     *       -95.0, 40.0,
     *       -109.0, 40.0
     *     ]),
     *     [new Cesium.PolygonHierarchy(
     *       Cesium.Cartesian3.fromDegreesArray([
     *         -107.0, 31.0,
     *         -107.0, 39.0,
     *         -97.0, 39.0,
     *         -97.0, 31.0
     *       ]),
     *       [new Cesium.PolygonHierarchy(
     *         Cesium.Cartesian3.fromDegreesArray([
     *           -105.0, 33.0,
     *           -99.0, 33.0,
     *           -99.0, 37.0,
     *           -105.0, 37.0
     *         ]),
     *         [new Cesium.PolygonHierarchy(
     *           Cesium.Cartesian3.fromDegreesArray([
     *             -103.0, 34.0,
     *             -101.0, 34.0,
     *             -101.0, 36.0,
     *             -103.0, 36.0
     *           ])
     *         )]
     *       )]
     *     )]
     *   )
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygonWithHole);
     *
     * // 3. create extruded polygon
     * var extrudedPolygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   ),
     *   extrudedHeight: 300000
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(extrudedPolygon);
     */
    function PolygonGeometry(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.polygonHierarchy)) {
            throw new DeveloperError('options.polygonHierarchy is required.');
        }
        if (defined(options.perPositionHeight) && options.perPositionHeight && defined(options.height)) {
            throw new DeveloperError('Cannot use both options.perPositionHeight and options.height');
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
        var extrude = defined(extrudedHeight);

        if (!perPositionHeight && extrude) {
            //Ignore extrudedHeight if it matches height
            if (CesiumMath.equalsEpsilon(height, extrudedHeight, CesiumMath.EPSILON10)) {
                extrudedHeight = undefined;
                extrude = false;
            } else {
                var h = extrudedHeight;
                extrudedHeight = Math.min(h, height);
                height = Math.max(h, height);
            }
        }

        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._granularity = granularity;
        this._stRotation = stRotation;
        this._height = height;
        this._extrudedHeight = defaultValue(extrudedHeight, 0.0);
        this._extrude = extrude;
        this._closeTop = defaultValue(options.closeTop, true);
        this._closeBottom = defaultValue(options.closeBottom, true);
        this._polygonHierarchy = polygonHierarchy;
        this._perPositionHeight = perPositionHeight;
        this._workerName = 'createPolygonGeometry';

        var positions = polygonHierarchy.positions;
        if (!defined(positions) || positions.length < 3) {
            this._rectangle = new Rectangle();
        } else {
            this._rectangle = Rectangle.fromCartesianArray(positions, ellipsoid);
        }

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + Ellipsoid.packedLength + VertexFormat.packedLength + Rectangle.packedLength + 9;
    }

    /**
     * A description of a polygon from an array of positions. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
     * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
     * @returns {PolygonGeometry}
     *
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
     *
     * @see PolygonGeometry#createGeometry
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
            perPositionHeight : options.perPositionHeight,
            closeTop : options.closeTop,
            closeBottom: options.closeBottom
        };
        return new PolygonGeometry(newOptions);
    };

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PolygonGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
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

        Rectangle.pack(value._rectangle, array, startingIndex);
        startingIndex += Rectangle.packedLength;

        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._stRotation;
        array[startingIndex++] = value._extrude ? 1.0 : 0.0;
        array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
        array[startingIndex++] = value._closeTop ? 1.0 : 0.0;
        array[startingIndex++] = value._closeBottom ? 1.0 : 0.0;
        array[startingIndex] = value.packedLength;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();
    var scratchRectangle = new Rectangle();

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

        var rectangle = Rectangle.unpack(array, startingIndex, scratchRectangle);
        startingIndex += Rectangle.packedLength;

        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var granularity = array[startingIndex++];
        var stRotation = array[startingIndex++];
        var extrude = array[startingIndex++] === 1.0;
        var perPositionHeight = array[startingIndex++] === 1.0;
        var closeTop = array[startingIndex++] === 1.0;
        var closeBottom = array[startingIndex++] === 1.0;
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
        result._closeTop = closeTop;
        result._closeBottom = closeBottom;
        result._rectangle = Rectangle.clone(rectangle);
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
        var closeTop = polygonGeometry._closeTop;
        var closeBottom = polygonGeometry._closeBottom;

        var outerPositions = polygonHierarchy.positions;
        if (outerPositions.length < 3) {
            return;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerPositions, ellipsoid);

        var results = PolygonGeometryLibrary.polygonsFromHierarchy(polygonHierarchy, perPositionHeight, tangentPlane, ellipsoid);
        var hierarchy = results.hierarchy;
        var polygons = results.polygons;

        if (hierarchy.length === 0) {
            return;
        }

        outerPositions = hierarchy[0].outerRing;
        var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);

        var geometry;
        var geometries = [];

        var options = {
            perPositionHeight: perPositionHeight,
            vertexFormat: vertexFormat,
            geometry: undefined,
            tangentPlane: tangentPlane,
            boundingRectangle: boundingRectangle,
            ellipsoid: ellipsoid,
            stRotation: stRotation,
            bottom: false,
            top: true,
            wall: false
        };

        var i;

        if (extrude) {
            options.top = closeTop;
            options.bottom = closeBottom;
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], granularity, hierarchy[i], perPositionHeight, closeTop, closeBottom, vertexFormat);

                var topAndBottom;
                if (closeTop && closeBottom) {
                    topAndBottom = geometry.topAndBottom;
                    options.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(topAndBottom.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                } else if (closeTop) {
                    topAndBottom = geometry.topAndBottom;
                    topAndBottom.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(topAndBottom.geometry.attributes.position.values, height, ellipsoid, !perPositionHeight);
                    options.geometry = topAndBottom.geometry;
                } else if (closeBottom) {
                    topAndBottom = geometry.topAndBottom;
                    topAndBottom.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(topAndBottom.geometry.attributes.position.values, extrudedHeight, ellipsoid, true);
                    options.geometry = topAndBottom.geometry;
                }
                if (closeTop || closeBottom) {
                    options.wall = false;
                    topAndBottom.geometry = computeAttributes(options);
                    geometries.push(topAndBottom);
                }

                var walls = geometry.walls;
                options.wall = true;
                for ( var k = 0; k < walls.length; k++) {
                    var wall = walls[k];
                    options.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(wall.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                    wall.geometry = computeAttributes(options);
                    geometries.push(wall);
                }
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                geometry = new GeometryInstance({
                    geometry : PolygonGeometryLibrary.createGeometryFromPositions(ellipsoid, polygons[i], granularity, perPositionHeight, vertexFormat)
                });
                geometry.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry.attributes.position.values, height, ellipsoid, !perPositionHeight);
                options.geometry = geometry.geometry;
                geometry.geometry = computeAttributes(options);
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

    /**
     * @private
     */
    PolygonGeometry.createShadowVolume = function(polygonGeometry, minHeightFunc, maxHeightFunc) {
        var granularity = polygonGeometry._granularity;
        var ellipsoid = polygonGeometry._ellipsoid;

        var minHeight = minHeightFunc(granularity, ellipsoid);
        var maxHeight = maxHeightFunc(granularity, ellipsoid);

        return new PolygonGeometry({
            polygonHierarchy : polygonGeometry._polygonHierarchy,
            ellipsoid : ellipsoid,
            stRotation : polygonGeometry._stRotation,
            granularity : granularity,
            perPositionHeight : false,
            extrudedHeight : minHeight,
            height : maxHeight,
            vertexFormat : VertexFormat.POSITION_ONLY
        });
    };

    defineProperties(PolygonGeometry.prototype, {
        /**
         * @private
         */
        rectangle : {
            get : function() {
                return this._rectangle;
            }
        }
    });

    return PolygonGeometry;
});
