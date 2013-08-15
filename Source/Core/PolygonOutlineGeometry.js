/*global define*/
define([
        './defaultValue',
        './defined',
        './BoundingSphere',
        './Cartesian3',
        './ComponentDatatype',
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
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        defaultValue,
        defined,
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
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
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        Queue,
        WindingOrder) {
    "use strict";
    var createGeometryFromPositionsPositions = [];

    function createGeometryFromPositions(ellipsoid, positions, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            throw new DeveloperError('Duplicate positions result in not enough positions to form a polygon.');
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }
        var subdividedPositions = [];
        var length = cleanedPositions.length;
        var i;
        for (i = 0; i < length-1; i++) {
            subdividedPositions = subdividedPositions.concat(PolygonGeometryLibrary.subdivideLine(cleanedPositions[i], cleanedPositions[i+1], granularity));
        }
        subdividedPositions = subdividedPositions.concat(PolygonGeometryLibrary.subdivideLine(cleanedPositions[length-1], cleanedPositions[0], granularity));

        length = subdividedPositions.length/3;
        var indicesSize = length*2;
        var indices = IndexDatatype.createTypedArray(subdividedPositions.length/3, indicesSize);
        var index = 0;
        for (i = 0; i < length-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
        }
        indices[index++] = length-1;
        indices[index++] = 0;

        return new GeometryInstance({
            geometry : new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array(subdividedPositions)
                    })
                }),
                indices: indices,
                primitiveType: PrimitiveType.LINES
            })
        });
    }

    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchBoundingSphere = new BoundingSphere();

    function createGeometryFromPositionsExtruded(ellipsoid, positions, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            throw new DeveloperError('Duplicate positions result in not enough positions to form a polygon.');
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }
        var subdividedPositions = [];
        var length = cleanedPositions.length;
        var i;
        var corners = new Array(length);
        corners[0] = 0;
        for (i = 0; i < length-1; i++) {
            subdividedPositions = subdividedPositions.concat(PolygonGeometryLibrary.subdivideLine(cleanedPositions[i], cleanedPositions[i+1], granularity));
            corners[i+1] = subdividedPositions.length/3;
        }
        subdividedPositions = subdividedPositions.concat(PolygonGeometryLibrary.subdivideLine(cleanedPositions[length-1], cleanedPositions[0], granularity));

        length = subdividedPositions.length/3;
        var indicesSize = ((length * 2) + corners.length)*2;
        var indices = IndexDatatype.createTypedArray(subdividedPositions.length/3, indicesSize);
        var index = 0;
        for (i = 0; i < length-1; i++) {
            indices[index++] = i;
            indices[index++] = i+1;
            indices[index++] = i + length;
            indices[index++] = i+1 + length;
        }
        indices[index++] = length-1;
        indices[index++] = 0;
        indices[index++] = length + length-1;
        indices[index++] = length;

        for (i = 0; i < corners.length; i++) {
            var corner = corners[i];
            indices[index++] = corner;
            indices[index++] = corner + length;
        }

        subdividedPositions = subdividedPositions.concat(subdividedPositions);

        return new GeometryInstance({
            geometry : new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : new Float64Array(subdividedPositions)
                    })
                }),
                indices: indices,
                primitiveType: PrimitiveType.LINES
            })
        });
    }

    /**
     * A {@link Geometry} that represents vertices and indices for the outline of a polygon on the ellipsoid. The polygon is defined
     * by a polygon hierarchy.
     *
     * @alias PolygonOutlineGeometry
     * @constructor
     *
     * @param {Object} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     *
     * @exception {DeveloperError} polygonHierarchy is required.
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} Duplicate positions result in not enough positions to form a polygon.
     *
     * @example
     * // create a polygon from points
     * var geometry = new PolygonOutlineGeometry({
     *     polygonHierarchy : {
     *         positions : ellipsoid.cartographicArrayToCartesianArray([
     *             Cartographic.fromDegrees(-72.0, 40.0),
     *             Cartographic.fromDegrees(-70.0, 35.0),
     *             Cartographic.fromDegrees(-75.0, 30.0),
     *             Cartographic.fromDegrees(-70.0, 30.0),
     *             Cartographic.fromDegrees(-68.0, 40.0)
     *         ])
     *     }
     * });
     *
     * // create a nested polygon with holes
     * var geometryWithHole = new PolygonOutlineGeometry({
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
     * //create extruded polygon
     * var geometry = new Cesium.PolygonOutlineGeometry({
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
    var PolygonOutlineGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var height = defaultValue(options.height, 0.0);

        var extrudedHeight = defaultValue(options.extrudedHeight, undefined);
        var extrude = (defined(extrudedHeight) && !CesiumMath.equalsEpsilon(height, extrudedHeight, CesiumMath.EPSILON6));
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, height);
            height = Math.max(h, height);
        }

        var polygonHierarchy = options.polygonHierarchy;
        if (!defined(polygonHierarchy)) {
            throw new DeveloperError('options.polygonHierarchy is required.');
        }

        var boundingSphere;
        var outerPositions;

        // create from a polygon hierarchy
        // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
        var polygons = [];
        var queue = new Queue();
        queue.enqueue(polygonHierarchy);
        var i;
        while (queue.length !== 0) {
            var outerNode = queue.dequeue();
            var outerRing = outerNode.positions;

            if (outerRing.length < 3) {
                throw new DeveloperError('At least three positions are required.');
            }

            var numChildren = outerNode.holes ? outerNode.holes.length : 0;
            // The outer polygon contains inner polygons
            for (i = 0; i < numChildren; i++) {
                var hole = outerNode.holes[i];
                polygons.push(hole.positions);

                var numGrandchildren = 0;
                if (defined(hole.holes)) {
                    numGrandchildren = hole.holes.length;
                }

                for (var j = 0; j < numGrandchildren; j++) {
                    queue.enqueue(hole.holes[j]);
                }
            }

            polygons.push(outerRing);
        }

        outerPositions =  polygons[0];
        // The bounding volume is just around the boundary points, so there could be cases for
        // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
        // volume doesn't cover the polygon.
        boundingSphere = BoundingSphere.fromPoints(outerPositions);

        var geometry;
        var geometries = [];

        if (extrude) {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], granularity);
                if (defined(geometry)) {
                    geometry.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(geometry.geometry, height, extrudedHeight, ellipsoid);
                    geometries.push(geometry);
                }
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositions(ellipsoid, polygons[i], granularity);
                if (defined(geometry)) {
                    geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, height, ellipsoid);
                    geometries.push(geometry);
                }
            }
        }

        geometry = GeometryPipeline.combine(geometries);

        var center = boundingSphere.center;
        scratchNormal = ellipsoid.geodeticSurfaceNormal(center, scratchNormal);
        scratchPosition = Cartesian3.multiplyByScalar(scratchNormal, height, scratchPosition);
        center = Cartesian3.add(center, scratchPosition, center);

        if (extrude) {
            scratchBoundingSphere = boundingSphere.clone(scratchBoundingSphere);
            center = scratchBoundingSphere.center;
            scratchPosition = Cartesian3.multiplyByScalar(scratchNormal, extrudedHeight, scratchPosition);
            center = Cartesian3.add(center, scratchPosition, center);
            boundingSphere = BoundingSphere.union(boundingSphere, scratchBoundingSphere, boundingSphere);
        }

        var attributes = geometry.attributes;

        /**
         * An object containing {@link GeometryAttribute} position property.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = geometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.LINES}.
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

    /**
     * Creates a polygon outline from an array of positions.
     *
     * @memberof PolygonOutlineGeometry
     *
     * @param {Array} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} Duplicate positions result in not enough positions to form a polygon.
     *
     * @example
     * // create a polygon from points
     * var geometry = new PolygonOutlineGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0),
     *         Cartographic.fromDegrees(-75.0, 30.0),
     *         Cartographic.fromDegrees(-70.0, 30.0),
     *         Cartographic.fromDegrees(-68.0, 40.0)
     *     ])
     * });
     */
    PolygonOutlineGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        if (!defined(options.positions)) {
            throw new DeveloperError('options.positions is required.');
        }

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            ellipsoid : options.ellipsoid,
            granularity : options.granularity
        };
        return new PolygonOutlineGeometry(newOptions);
    };

    return PolygonOutlineGeometry;
});