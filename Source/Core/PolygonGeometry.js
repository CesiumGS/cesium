/*global define*/
define([
        './defaultValue',
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './ComponentDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryPipeline',
        './Intersect',
        './Math',
        './Matrix3',
        './PolygonPipeline',
        './Quaternion',
        './Queue',
        './VertexFormat',
        './WindingOrder',
        './PrimitiveType'
    ], function(
        defaultValue,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        ComponentDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryPipeline,
        Intersect,
        CesiumMath,
        Matrix3,
        PolygonPipeline,
        Quaternion,
        Queue,
        VertexFormat,
        WindingOrder,
        PrimitiveType) {
    "use strict";

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var p1 = new Cartesian3();
    var p2 = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    function computeWallAttributes(vertexFormat, geometry, outerPositions, ellipsoid, stRotation) {
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.removeDuplicates(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
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
            var normalIndex = 0;
            var tangentIndex = 0;
            var binormalIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;
            var binormal = scratchBinormal;
            var recomputeNormal = true;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            length /= 2;
            var stOffset = length * 2 / 3;
            for (var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);
                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    textureCoordinates[textureCoordIndex + stOffset] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex + stOffset + 1] = st.y / boundingRectangle.height;

                    textureCoordinates[textureCoordIndex++] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex++] = st.y / boundingRectangle.height;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {

                    p1 = Cartesian3.fromArray(flatPositions, i + 3, p1);
                    if (recomputeNormal) {
                        p2 = Cartesian3.fromArray(flatPositions, i + length, p2);
                        p1.subtract(position, p1);
                        p2.subtract(position, p2);
                        normal = Cartesian3.cross(p1, p2, normal);
                        recomputeNormal = false;
                        if (vertexFormat.tangent || vertexFormat.binormal) {
                            Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                            Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                            Cartesian3.normalize(tangent, tangent);
                        }
                        if (vertexFormat.binormal) {
                            binormal = Cartesian3.cross(tangent, normal, binormal);
                            Cartesian3.normalize(binormal, binormal);
                        }
                    }

                    if (p1.equalsEpsilon(position, CesiumMath.EPSILON10)) { // if we've reached a corner
                        recomputeNormal = true;
                    }

                    if (vertexFormat.normal) {
                        normals[normalIndex + length] = normal.x;
                        normals[normalIndex + length + 1] = normal.y;
                        normals[normalIndex + length + 2] = normal.z;

                        normals[normalIndex++] = normal.x;
                        normals[normalIndex++] = normal.y;
                        normals[normalIndex++] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        tangents[tangentIndex + length] = tangent.x;
                        tangents[tangentIndex + length + 1] = tangent.y;
                        tangents[tangentIndex + length + 2] = tangent.z;

                        tangents[tangentIndex++] = tangent.x;
                        tangents[tangentIndex++] = tangent.y;
                        tangents[tangentIndex++] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        binormals[binormalIndex + length] = binormal.x;
                        binormals[binormalIndex + length + 1] = binormal.y;
                        binormals[binormalIndex + length + 2] = binormal.z;


                        binormals[binormalIndex++] = binormal.x;
                        binormals[binormalIndex++] = binormal.y;
                        binormals[binormalIndex++] = binormal.z;
                    }
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

    function computeTopBottomAttributes(vertexFormat, geometry, outerPositions, ellipsoid, stRotation, top, bottom) {
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.removeDuplicates(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
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
            var normalIndex = 0;
            var tangentIndex = 0;
            var binormalIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            var bottomOffset = (top) ? length / 2 : 0;
            var bottomOffset2 = bottomOffset * 2 / 3;

            if (top && bottom) {
                length /= 2;
            }

            for (var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    if (bottom){
                        textureCoordinates[textureCoordIndex + bottomOffset2] = st.x / boundingRectangle.width;
                        textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = st.y / boundingRectangle.height;
                    }

                    if (top){
                        textureCoordinates[textureCoordIndex] = st.x / boundingRectangle.width;
                        textureCoordinates[textureCoordIndex + 1] = st.y / boundingRectangle.height;
                    }

                    textureCoordIndex += 2;
                }

                if (vertexFormat.normal) {
                    normal = ellipsoid.geodeticSurfaceNormal(position, normal);

                    if (bottom) {
                        normals[normalIndex + bottomOffset] = -normal.x;
                        normals[normalIndex + bottomOffset + 1] = -normal.y;
                        normals[normalIndex + bottomOffset + 2] = -normal.z;
                    }

                    if (top) {
                        normals[normalIndex] = normal.x;
                        normals[normalIndex + 1] = normal.y;
                        normals[normalIndex + 2] = normal.z;
                    }
                    normalIndex += 3;
                }

                if (vertexFormat.tangent) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    Cartesian3.normalize(tangent, tangent);

                    if (bottom) {
                        tangents[tangentIndex + bottomOffset] = -tangent.x;
                        tangents[tangentIndex + bottomOffset + 1] = -tangent.y;
                        tangents[tangentIndex + bottomOffset + 2] = -tangent.z;
                    }

                    if (top) {
                        tangents[tangentIndex] = tangent.x;
                        tangents[tangentIndex + 1] = tangent.y;
                        tangents[tangentIndex + 2] = tangent.z;
                    }
                    tangentIndex += 3;
                }

                if (vertexFormat.binormal) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    if (!vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    }

                    var binormal = Cartesian3.cross(tangent, normal, scratchBinormal);
                    Cartesian3.normalize(binormal, binormal);

                    if (bottom) {
                        binormals[binormalIndex + bottomOffset] = binormal.x;
                        binormals[binormalIndex + bottomOffset + 1] = binormal.y;
                        binormals[binormalIndex + bottomOffset + 2] = binormal.z;
                    }

                    if (top) {
                        binormals[binormalIndex] = binormal.x;
                        binormals[binormalIndex + 1] = binormal.y;
                        binormals[binormalIndex + 2] = binormal.z;
                    }
                    binormalIndex += 3;
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

            if (typeof st !== 'undefined') {
                minX = Math.min(minX, st.x);
                maxX = Math.max(maxX, st.x);

                minY = Math.min(minY, st.y);
                maxY = Math.max(maxY, st.y);
            }
        }

        if (typeof result === 'undefined') {
            result = new BoundingRectangle();
        }

        result.x = minX;
        result.y = minY;
        result.width = maxX - minX;
        result.height = maxY - minY;
        return result;
    }

    var scaleToGeodeticHeightN1 = new Cartesian3();
    var scaleToGeodeticHeightN2 = new Cartesian3();
    var scaleToGeodeticHeightP = new Cartesian3();
    function scaleToGeodeticHeightExtruded(mesh, maxHeight, minHeight, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n1 = scaleToGeodeticHeightN1;
        var n2 = scaleToGeodeticHeightN2;
        var p = scaleToGeodeticHeightP;

        if (typeof mesh !== 'undefined' && typeof mesh.attributes !== 'undefined' && typeof mesh.attributes.position !== 'undefined') {
            var positions = mesh.attributes.position.values;
            var length = positions.length / 2;

            for ( var i = 0; i < length; i += 3) {
                p.x = positions[i];
                p.y = positions[i + 1];
                p.z = positions[i + 2];

                ellipsoid.scaleToGeodeticSurface(p, p);
                ellipsoid.geodeticSurfaceNormal(p, n1);
                Cartesian3.multiplyByScalar(n1, maxHeight, n1);
                Cartesian3.add(p, n1, n1);

                ellipsoid.geodeticSurfaceNormal(p, n2);
                Cartesian3.multiplyByScalar(n2, minHeight, n2);
                Cartesian3.add(p, n2, n2);

                positions[i] = n1.x;
                positions[i + 1] = n1.y;
                positions[i + 2] = n1.z;

                positions[i + length] = n2.x;
                positions[i + 1 + length] = n2.y;
                positions[i + 2 + length] = n2.z;
            }
        }
        return mesh;
    }

    function subdivideLine(p0, p1, granularity) {
        var edges = new Queue();
        edges.enqueue({
            v0: p0,
            v1: p1
        });
        var subdividedPositions = [p0, p1];
        while(edges.length > 0) {
            var edge = edges.dequeue();
            var v0 = edge.v0;
            var v1 = edge.v1;

            if (v0.angleBetween(v1) > granularity) {
                var v2 = v0.add(v1).multiplyByScalar(0.5);
                subdividedPositions.splice(subdividedPositions.indexOf(edge.v1), 0, v2);

                edges.enqueue({
                    v0: v0,
                    v1: v2
                });

                edges.enqueue({
                    v0: v2,
                    v1: v1
                });
            }
        }
        var length = subdividedPositions.length;
        var flattenedPositions = new Array(length * 3);
        var index = 0;
        for (var i = 0; i < length; i++) {
            flattenedPositions[index++] = subdividedPositions[i].x;
            flattenedPositions[index++] = subdividedPositions[i].y;
            flattenedPositions[index++] = subdividedPositions[i].z;
        }
        return flattenedPositions;
    }

    var createGeometryFromPositionsPositions = [];
    function createGeometryFromPositionsExtruded(ellipsoid, positions, boundingSphere, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var edgePoints = cleanedPositions;

        var indices = PolygonPipeline.earClip2D(positions2D);

        // Checking bounding sphere with plane for quick reject
        var minX = boundingSphere.center.x - boundingSphere.radius;
        if ((minX < 0) && (BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) === Intersect.INTERSECTING)) {
            indices = PolygonPipeline.wrapLongitude(cleanedPositions, indices);
        }

        var topAndBottomGeo = PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity);
        indices = topAndBottomGeo.indices;
        cleanedPositions = topAndBottomGeo.attributes.position.values;
        var length = cleanedPositions.length/3;
        var ilength = indices.length;
        cleanedPositions = cleanedPositions.concat(cleanedPositions);
        var i;
        for (i = 0 ; i < ilength; i += 3) {
            var i0 = indices[i] + length;
            var i1 = indices[i + 1] + length;
            var i2 = indices[i + 2] + length;
            indices.push(i2, i1, i0);
        }
        topAndBottomGeo.indices = indices;
        topAndBottomGeo.attributes.position.values = cleanedPositions;

        var edgePositions = [];
        length = edgePoints.length;
        for (i = 0; i < length; i++) {
            var subdividedEdge = subdivideLine(edgePoints[i], edgePoints[(i+1)%length], granularity);
            edgePositions = edgePositions.concat(subdividedEdge);
        }
        edgePositions = edgePositions.concat(edgePositions);
        length = edgePositions.length / 3 / 2;
        indices = new Array(length * 3);
        var edgeIndex = 0;
        for (i = 0 ; i < length; i++) {
            var UL = i;
            var LL = UL + length;
            var UR = UL + 1;
            var LR = LL + 1;
            indices[edgeIndex++] = UL;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = UR;
            indices[edgeIndex++] = LL;
            indices[edgeIndex++] = LR;
        }

        var wallsGeo = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : edgePositions
                })
            },
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        return {
            topAndBottom: new GeometryInstance({
                geometry : topAndBottomGeo
            }),
            walls: new GeometryInstance({
                geometry: wallsGeo
            })
        };
    }

    function createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var indices = PolygonPipeline.earClip2D(positions2D);

        // Checking bounding sphere with plane for quick reject
        var minX = boundingSphere.center.x - boundingSphere.radius;
        if ((minX < 0) && (BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) === Intersect.INTERSECTING)) {
            indices = PolygonPipeline.wrapLongitude(cleanedPositions, indices);
        }
        return new GeometryInstance({
            geometry : PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity)
        });
    }

    /**
     * Computes vertices and indices for a polygon on the ellipsoid. The polygon is either defined
     * by an array of Cartesian points, or a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Array} [options.positions] An array of positions that defined the corner points of the polygon.
     * @param {Object} [options.polygonHierarchy] A polygon hierarchy that can include holes.
     * @param {Number} [options.surfaceHeight=0.0] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.toRadians(1.0)] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.extrudedHeight] Height of extruded surface
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} positions or polygonHierarchy must be supplied.
     *
     * @example
     * // create a polygon from points
     * var geometry = new PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0),
     *         Cartographic.fromDegrees(-75.0, 30.0),
     *         Cartographic.fromDegrees(-70.0, 30.0),
     *         Cartographic.fromDegrees(-68.0, 40.0)
     *     ])
     * });
     *
     * // create a nested polygon with holes
     * var geometryWithHole = new PolygonGeometry({
     *     polygonHierarchy : {
     *         positions : ellipsoid.cartographicArrayToCartesianArray([
     *             Cartographic.fromDegrees(-109.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 40.0),
     *             Cartographic.fromDegrees(-109.0, 40.0)
     *         ]),
     *         holes : [{
     *             positions : ellipsoid.cartographicArrayToCartesianArray([
     *                 Cartographic.fromDegrees(-107.0, 31.0),
     *                 Cartographic.fromDegrees(-107.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 31.0)
     *             ]),
     *             holes : [{
     *                 positions : ellipsoid.cartographicArrayToCartesianArray([
     *                     Cartographic.fromDegrees(-105.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 37.0),
     *                     Cartographic.fromDegrees(-105.0, 37.0)
     *                     ]),
     *                 holes : [{
     *                     positions : ellipsoid.cartographicArrayToCartesianArray([
     *                         Cartographic.fromDegrees(-103.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 36.0),
     *                         Cartographic.fromDegrees(-103.0, 36.0)
     *                     ])
     *                 }]
     *              }]
     *         }]
     *     }
     * });
     *
     * create extruded polygon
     * var geometry = new Cesium.PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(-72.0, 40.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 35.0),
     *         Cesium.Cartographic.fromDegrees(-75.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-68.0, 40.0)
     *     ]),
     *     extrudedHeight: 300000
     * });
     *
     */
    var PolygonGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var stRotation = defaultValue(options.stRotation, 0.0);
        var surfaceHeight = defaultValue(options.surfaceHeight, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, surfaceHeight);
        var extrude = (surfaceHeight !== extrudedHeight);
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, surfaceHeight);
            surfaceHeight = Math.max(h, surfaceHeight);
        }

        var positions = options.positions;
        var polygonHierarchy = options.polygonHierarchy;

        var geometries = [];
        var geometry;
        var boundingSphere;
        var i;
        var walls, topAndBottom;

        var outerPositions;

        if (typeof positions !== 'undefined') {
            // create from positions
            outerPositions = positions;

            boundingSphere = BoundingSphere.fromPoints(positions);
            if (extrude) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, positions, boundingSphere, granularity);
                if (typeof geometry !== 'undefined') {
                    walls = geometry.walls;
                    topAndBottom = geometry.topAndBottom;
                    walls.geometry = scaleToGeodeticHeightExtruded(walls.geometry, surfaceHeight, extrudedHeight, ellipsoid);
                    topAndBottom.geometry = scaleToGeodeticHeightExtruded(topAndBottom.geometry, surfaceHeight, extrudedHeight, ellipsoid);
                    if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                        walls.geometry = computeWallAttributes(vertexFormat, walls.geometry, outerPositions, ellipsoid, stRotation);
                        topAndBottom.geometry = computeTopBottomAttributes(vertexFormat, topAndBottom.geometry, outerPositions, ellipsoid, stRotation, true, true);
                    }
                    geometries.push(walls, topAndBottom);
                }
            } else {
                geometry = createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity);
                geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, surfaceHeight, ellipsoid);

                if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    geometry.geometry = computeTopBottomAttributes(vertexFormat, geometry.geometry, outerPositions, ellipsoid, stRotation, true, false);
                }

                if (typeof geometry !== 'undefined') {
                    geometries.push(geometry);
                }
            }
        } else if (typeof polygonHierarchy !== 'undefined') {
            // create from a polygon hierarchy
            // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            var polygons = [];
            var queue = new Queue();
            queue.enqueue(polygonHierarchy);

            while (queue.length !== 0) {
                var outerNode = queue.dequeue();
                var outerRing = outerNode.positions;

                if (outerRing.length < 3) {
                    throw new DeveloperError('At least three positions are required.');
                }

                var numChildren = outerNode.holes ? outerNode.holes.length : 0;
                if (numChildren === 0) {
                    // The outer polygon is a simple polygon with no nested inner polygon.
                    polygons.push(outerNode.positions);
                } else {
                    // The outer polygon contains inner polygons
                    var holes = [];
                    for (i = 0; i < numChildren; i++) {
                        var hole = outerNode.holes[i];
                        holes.push(hole.positions);

                        var numGrandchildren = 0;
                        if (typeof hole.holes !== 'undefined') {
                            numGrandchildren = hole.holes.length;
                        }

                        for (var j = 0; j < numGrandchildren; j++) {
                            queue.enqueue(hole.holes[j]);
                        }
                    }
                    var combinedPolygon = PolygonPipeline.eliminateHoles(outerRing, holes);
                    polygons.push(combinedPolygon);
                }
            }

            polygonHierarchy = polygons;

            outerPositions =  polygonHierarchy[0];
            // The bounding volume is just around the boundary points, so there could be cases for
            // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
            // volume doesn't cover the polygon.
            boundingSphere = BoundingSphere.fromPoints(outerPositions);

            for (i = 0; i < polygonHierarchy.length; i++) {
                if (extrude) {
                    geometry = createGeometryFromPositionsExtruded(ellipsoid, polygonHierarchy[i], boundingSphere, granularity);
                    if (typeof geometry !== 'undefined') {
                        walls = geometry.walls;
                        topAndBottom = geometry.topAndBottom;
                        walls.geometry = scaleToGeodeticHeightExtruded(walls.geometry, surfaceHeight, extrudedHeight, ellipsoid);
                        topAndBottom.geometry = scaleToGeodeticHeightExtruded(topAndBottom.geometry, surfaceHeight, extrudedHeight, ellipsoid);
                        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                            walls.geometry = computeWallAttributes(vertexFormat, walls.geometry, outerPositions, ellipsoid, stRotation);
                            topAndBottom.geometry = computeTopBottomAttributes(vertexFormat, topAndBottom.geometry, outerPositions, ellipsoid, stRotation, true, true);
                        }
                        geometries.push(walls, topAndBottom);
                    }
                } else {
                    geometry = createGeometryFromPositions(ellipsoid, polygonHierarchy[i], boundingSphere, granularity);
                    geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, surfaceHeight, ellipsoid);
                    if (typeof geometry !== 'undefined') {
                        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                            geometry.geometry = computeTopBottomAttributes(vertexFormat, geometry.geometry, outerPositions, ellipsoid, stRotation, true, false);
                        }

                        if (typeof geometry !== 'undefined') {
                            geometries.push(geometry);
                        }
                    }
                }
            }
        } else {
            throw new DeveloperError('positions or hierarchy must be supplied.');
        }

        var attributes = {};

        geometry = GeometryPipeline.combine(geometries);

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(geometry.attributes.position.values)
            });
        }

        if (vertexFormat.st) {
            attributes.st = geometry.attributes.st;
        }

        if (vertexFormat.normal) {
            attributes.normal = geometry.attributes.normal;
        }

        if (vertexFormat.tangent) {
            attributes.tangent = geometry.attributes.tangent;
        }

        if (vertexFormat.binormal) {
            attributes.binormal = geometry.attributes.binormal;
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry.attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = geometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = geometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return PolygonGeometry;
});

