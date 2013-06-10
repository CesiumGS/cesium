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

    function subdivideLine(positions, indices) {
        return new Geometry({});
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

        var indices = PolygonPipeline.earClip2D(positions2D);

        // Checking bounding sphere with plane for quick reject
        var minX = boundingSphere.center.x - boundingSphere.radius;
        if ((minX < 0) && (BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) === Intersect.INTERSECTING)) {
            indices = PolygonPipeline.wrapLongitude(cleanedPositions, indices);
        }

        var geo = PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity);
        indices = geo.indexList;
        cleanedPositions = geo.attributes.position.values;

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

        geo.indexList = indices;
        geo.attributes.position.values = cleanedPositions;

        return new GeometryInstance({
            geometry : geo
        });
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

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

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
     * @param {Object} [options.extrudedOptions] Extruded options
     * @param {Number} [options.extrudedOptions.height] Height of extruded surface
     * @param {Boolean} [options.extrudedOptions.closeTop=true] Render top of extrusion
     * @param {Number} [options.extrudedOptions.closeBottom=true] Render bottom of extrusion
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} positions or polygonHierarchy must be supplied.
     *
     * @example
     * // create a polygon from points
     * var geometry = new Cesium.PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(-72.0, 40.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 35.0),
     *         Cesium.Cartographic.fromDegrees(-75.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-68.0, 40.0)
     *     ])
     * });
     *
     * // create a nested polygon with holes
     * var geometryWithHole = new Cesium.PolygonGeometry({
     *     polygonHierarchy : {
     *         positions : ellipsoid.cartographicArrayToCartesianArray([
     *             Cesium.Cartographic.fromDegrees(-109.0, 30.0),
     *             Cesium.Cartographic.fromDegrees(-95.0, 30.0),
     *             Cesium.Cartographic.fromDegrees(-95.0, 40.0),
     *             Cesium.Cartographic.fromDegrees(-109.0, 40.0)
     *         ]),
     *         holes : [{
     *             positions : ellipsoid.cartographicArrayToCartesianArray([
     *                 Cesium.Cartographic.fromDegrees(-107.0, 31.0),
     *                 Cesium.Cartographic.fromDegrees(-107.0, 39.0),
     *                 Cesium.Cartographic.fromDegrees(-97.0, 39.0),
     *                 Cesium.Cartographic.fromDegrees(-97.0, 31.0)
     *             ]),
     *             holes : [{
     *                 positions : ellipsoid.cartographicArrayToCartesianArray([
     *                     Cesium.Cartographic.fromDegrees(-105.0, 33.0),
     *                     Cesium.Cartographic.fromDegrees(-99.0, 33.0),
     *                     Cesium.Cartographic.fromDegrees(-99.0, 37.0),
     *                     Cesium.Cartographic.fromDegrees(-105.0, 37.0)
     *                     ]),
     *                 holes : [{
     *                     positions : ellipsoid.cartographicArrayToCartesianArray([
     *                         Cesium.Cartographic.fromDegrees(-103.0, 34.0),
     *                         Cesium.Cartographic.fromDegrees(-101.0, 34.0),
     *                         Cesium.Cartographic.fromDegrees(-101.0, 36.0),
     *                         Cesium.Cartographic.fromDegrees(-103.0, 36.0)
     *                     ])
     *                 }]
     *              }]
     *         }]
     *     }
     * });
     */
    var PolygonGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var stRotation = defaultValue(options.stRotation, 0.0);
        var surfaceHeight = defaultValue(options.surfaceHeight, 0.0);
        var extrudedHeight = surfaceHeight;
        var extrudedOptions = options.extrudedOptions;
        if (typeof extrudedOptions !== 'undefined') {
            var h = defaultValue(extrudedOptions.height, surfaceHeight);
            extrudedHeight = Math.min(h, surfaceHeight);
            surfaceHeight = Math.max(h, surfaceHeight);
        }
        var extrude = (surfaceHeight !== extrudedHeight);
        var positions = options.positions;
        var polygonHierarchy = options.polygonHierarchy;

        var geometries = [];
        var geometry;
        var boundingSphere;
        var i;

        var outerPositions;

        if (typeof positions !== 'undefined') {
            // create from positions
            outerPositions = positions;

            boundingSphere = BoundingSphere.fromPoints(positions);
            if (extrude) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, positions, boundingSphere, granularity);
            } else {
                geometry = createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity);
            }

            if (typeof geometry !== 'undefined') {
                geometries.push(geometry);
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
                geometry = createGeometryFromPositions(ellipsoid, polygonHierarchy[i], boundingSphere, granularity);
                if (typeof geometry !== 'undefined') {
                    geometries.push(geometry);
                }
            }
        } else {
            throw new DeveloperError('positions or hierarchy must be supplied.');
        }

        geometry = GeometryPipeline.combine(geometries);
        if (extrude) {
            geometry = scaleToGeodeticHeightExtruded(geometry, surfaceHeight, extrudedHeight, ellipsoid);
        } else {
            geometry = PolygonPipeline.scaleToGeodeticHeight(geometry, surfaceHeight, ellipsoid);
        }

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = geometry.attributes.position;
        }

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

            var textureCoordinates = vertexFormat.st ? new Array(2 * (length / 3)) : undefined;
            var normals = vertexFormat.normal ? new Array(length) : undefined;
            var tangents = vertexFormat.tangent ? new Array(length) : undefined;
            var binormals = vertexFormat.binormal ? new Array(length) : undefined;

            var textureCoordIndex = 0;
            var normalIndex = 0;
            var tangentIndex = 0;
            var binormalIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            for (i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    textureCoordinates[textureCoordIndex++] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex++] = st.y / boundingRectangle.height;
                }

                if (vertexFormat.normal) {
                    normal = ellipsoid.geodeticSurfaceNormal(position, normal);

                    normals[normalIndex++] = normal.x;
                    normals[normalIndex++] = normal.y;
                    normals[normalIndex++] = normal.z;
                }

                if (vertexFormat.tangent) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    Cartesian3.normalize(tangent, tangent);

                    tangents[tangentIndex++] = tangent.x;
                    tangents[tangentIndex++] = tangent.y;
                    tangents[tangentIndex++] = tangent.z;
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

                    binormals[binormalIndex++] = binormal.x;
                    binormals[binormalIndex++] = binormal.y;
                    binormals[binormalIndex++] = binormal.z;
                }
            }

            if (vertexFormat.st) {
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : textureCoordinates
                });
            }

            if (vertexFormat.normal) {
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.binormal) {
                attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * The geometry indices.
         *
         * @type Array
         */
        this.indexList = geometry.indexList;

        /**
         * DOC_TBA
         */
        this.primitiveType = geometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    /**
     * DOC_TBA
     */
    PolygonGeometry.prototype.cloneGeometry = Geometry.prototype.cloneGeometry;

    return PolygonGeometry;
});

