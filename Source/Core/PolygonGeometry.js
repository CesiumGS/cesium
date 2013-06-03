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
        './GeometryAttribute',
        './GeometryFilters',
        './Intersect',
        './Math',
        './Matrix3',
        './Matrix4',
        './PolygonPipeline',
        './Quaternion',
        './Queue',
        './VertexFormat',
        './WindingOrder'
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
        GeometryAttribute,
        GeometryFilters,
        Intersect,
        CesiumMath,
        Matrix3,
        Matrix4,
        PolygonPipeline,
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
        var textureMatrix = Matrix3.fromQuaternion(rotation,computeBoundingRectangleMatrix3);

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

    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    function appendTextureCoordinates(mesh, tangentPlane, boundingRectangle, angle) {
        var origin = new Cartesian2(boundingRectangle.x, boundingRectangle.y);

        var positions = mesh.attributes.position.values;
        var length = positions.length;

        var textureCoordinates = new Float32Array(2 * (length / 3));
        var j = 0;

        var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, angle, appendTextureCoordinatesQuaternion);
        var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

        for ( var i = 0; i < length; i += 3) {
            var p = appendTextureCoordinatesCartesian3;
            p.x = positions[i];
            p.y = positions[i + 1];
            p.z = positions[i + 2];
            Matrix3.multiplyByVector(textureMatrix, p, p);
            var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
            st.subtract(origin, st);

            textureCoordinates[j++] = st.x / boundingRectangle.width;
            textureCoordinates[j++] = st.y / boundingRectangle.height;
        }

        mesh.attributes.st = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 2,
            values : textureCoordinates
        });

        return mesh;
    }

    var createMeshFromPositionsPositions = [];

    function createMeshFromPositions(ellipsoid, positions, boundingSphere, granularity) {
        var cleanedPositions = PolygonPipeline.cleanUp(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createMeshFromPositionsPositions);

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
        return PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity);
    }

    var scratchBoundingRectangle = new BoundingRectangle();

    /**
     * Computes vertices and indices for a polygon on the ellipsoid. The polygon is either defined
     * by an array of Cartesian points, or a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Array} [options.positions] An array of positions that defined the corner points of the polygon.
     * @param {Object} [options.polygonHierarchy] A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.toRadians(1.0)] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Matrix4} [options.modelMatrix] The model matrix for this geometry.
     * @param {Color} [options.color] The color of the geometry when a per-geometry color appearance is used.
     * @param {DOC_TBA} [options.pickData] DOC_TBA
     *
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
        var height = defaultValue(options.height, 0.0);

        var positions = options.positions;
        var polygonHierarchy = options.polygonHierarchy;

        var meshes = [];
        var mesh;
        var boundingSphere;
        var i;

        var outerPositions;

        if (typeof options.positions !== 'undefined') {
            // create from positions
            outerPositions = positions;

            boundingSphere = BoundingSphere.fromPoints(positions);
            mesh = createMeshFromPositions(ellipsoid, positions, boundingSphere, granularity);
            if (typeof mesh !== 'undefined') {
                meshes.push(mesh);
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

                        for ( var j = 0; j < numGrandchildren; j++) {
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
                mesh = createMeshFromPositions(ellipsoid, polygonHierarchy[i], boundingSphere, granularity);
                if (typeof mesh !== 'undefined') {
                    meshes.push(mesh);
                }
            }
        } else {
            throw new DeveloperError('positions or hierarchy must be supplied.');
        }

        mesh = GeometryFilters.combine(meshes);
        mesh = PolygonPipeline.scaleToGeodeticHeight(mesh, height, ellipsoid);

        var attributes = {};

        if (vertexFormat.position) {
            attributes.position = mesh.attributes.position;
        }

        if (vertexFormat.st) {
            attributes.st = mesh.attributes.st;
        }

        if (vertexFormat.st) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createMeshFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.cleanUp(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
            var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);
            mesh = appendTextureCoordinates(mesh, tangentPlane, boundingRectangle, stRotation);

            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : mesh.attributes.st.values
            });
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         */
        this.attributes = attributes;

        /**
         * An array of {@link GeometryIndices} defining primitives.
         *
         * @type Array
         */
        this.indexLists = mesh.indexLists;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;

        /**
         * The 4x4 transformation matrix that transforms the geometry from model to world coordinates.
         * When this is the identity matrix, the geometry is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type Matrix4
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * The color of the geometry when a per-geometry color appearance is used.
         *
         * @type Color
         */
        this.color = options.color;

        /**
         * DOC_TBA
         */
        this.pickData = options.pickData;
    };

    return PolygonGeometry;
});

