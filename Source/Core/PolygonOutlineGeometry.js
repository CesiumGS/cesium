/*global define*/
define([
        './defaultValue',
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
        './PolygonPipeline',
        './PrimitiveType',
        './Queue',
        './WindingOrder'
    ], function(
        defaultValue,
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
        PolygonPipeline,
        PrimitiveType,
        Queue,
        WindingOrder) {
    "use strict";
    var createGeometryFromPositionsPositions = [];

    var distanceScratch = new Cartesian3();
    function getPointAtDistance(p0, p1, distance, length) {
        distanceScratch = p1.subtract(p0, distanceScratch);
        distanceScratch = distanceScratch.multiplyByScalar(distance/length, distanceScratch);
        distanceScratch = p0.add(distanceScratch, distanceScratch);
        return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
    }

    function subdivideLine(p0, p1, granularity) {
        var length = Cartesian3.distance(p0, p1);
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var n = angleBetween/granularity;
        var countDivide = Math.ceil(Math.log(n)/Math.log(2));
        if (countDivide < 1) {
            countDivide = 0;
        }
        var numVertices = Math.pow(2, countDivide);

        var distanceBetweenVertices = length / numVertices;

        var positions = new Array(numVertices * 3);
        var index = 0;
        positions[index++] = p0.x;
        positions[index++] = p0.y;
        positions[index++] = p0.z;
        for (var i = 1; i < numVertices; i++) {
            var p = getPointAtDistance(p0, p1, i*distanceBetweenVertices, length);
            positions[index++] = p[0];
            positions[index++] = p[1];
            positions[index++] = p[2];
        }

        return positions;
    }

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
            subdividedPositions = subdividedPositions.concat(subdivideLine(cleanedPositions[i], cleanedPositions[i+1], granularity));
        }
        subdividedPositions = subdividedPositions.concat(subdivideLine(cleanedPositions[length-1], cleanedPositions[0], granularity));

        length = subdividedPositions.length/3;
        var indices = [];
        for (i = 0; i < length-1; i++) {
            indices.push(i, i+1);
        }
        indices.push(length-1, 0);

        return new GeometryInstance({
            geometry : new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : subdividedPositions
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

    var scaleToGeodeticHeightN1 = new Cartesian3();
    var scaleToGeodeticHeightN2 = new Cartesian3();
    var scaleToGeodeticHeightP = new Cartesian3();
    function scaleToGeodeticHeightExtruded(geometry, maxHeight, minHeight, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n1 = scaleToGeodeticHeightN1;
        var n2 = scaleToGeodeticHeightN2;
        var p = scaleToGeodeticHeightP;

        if (typeof geometry !== 'undefined' && typeof geometry.attributes !== 'undefined' && typeof geometry.attributes.position !== 'undefined') {
            var positions = geometry.attributes.position.values;
            var length = positions.length / 2;

            for ( var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(positions, i, p);

                ellipsoid.scaleToGeodeticSurface(p, p);
                ellipsoid.geodeticSurfaceNormal(p, n1);

                Cartesian3.multiplyByScalar(n1, maxHeight, n2);
                Cartesian3.add(p, n2, n2);
                positions[i] = n2.x;
                positions[i + 1] = n2.y;
                positions[i + 2] = n2.z;

                Cartesian3.multiplyByScalar(n1, minHeight, n2);
                Cartesian3.add(p, n2, n2);
                positions[i + length] = n2.x;
                positions[i + 1 + length] = n2.y;
                positions[i + 2 + length] = n2.z;
            }
        }
        return geometry;
    }

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
        var corners = new Array(subdividedPositions.length);
        corners[0] = 0;
        for (i = 0; i < length-1; i++) {
            subdividedPositions = subdividedPositions.concat(subdivideLine(cleanedPositions[i], cleanedPositions[i+1], granularity));
            corners[i+1] = subdividedPositions.length/3;
        }
        subdividedPositions = subdividedPositions.concat(subdivideLine(cleanedPositions[length-1], cleanedPositions[0], granularity));

        length = subdividedPositions.length/3;
        var indices = [];
        for (i = 0; i < length-1; i++) {
            indices.push(i, i+1);
            indices.push(i + length, i+1 + length);
        }
        indices.push(length-1, 0);
        indices.push(length + length-1, length);

        for (i = 0; i < corners.length; i++) {
            var corner = corners[i];
            indices.push(corner, corner + length);
        }

        subdividedPositions = subdividedPositions.concat(subdividedPositions);

        return new GeometryInstance({
            geometry : new Geometry({
                attributes: new GeometryAttributes({
                    position: new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : subdividedPositions
                    })
                }),
                indices: indices,
                primitiveType: PrimitiveType.LINES
            })
        });
    }

    /**
     * A {@link Geometry} that represents vertices and indices for a polygon on the ellipsoid. The polygon is either defined
     * by an array of Cartesian points, or a polygon hierarchy.
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
        var extrude = (typeof extrudedHeight !== 'undefined' && !CesiumMath.equalsEpsilon(height, extrudedHeight, CesiumMath.EPSILON6));
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, height);
            height = Math.max(h, height);
        }

        var polygonHierarchy = options.polygonHierarchy;
        if (typeof polygonHierarchy === 'undefined') {
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
                if (typeof hole.holes !== 'undefined') {
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
                if (typeof geometry !== 'undefined') {
                    geometry.geometry = scaleToGeodeticHeightExtruded(geometry.geometry, height, extrudedHeight, ellipsoid);
                    geometries.push(geometry);
                }
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                geometry = createGeometryFromPositions(ellipsoid, polygons[i], granularity);
                if (typeof geometry !== 'undefined') {
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

        geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
        geometry.indices = IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

        var attributes = geometry.attributes;

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
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

    /**
     * Creates a polygon from an array of positions.
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

        if (typeof options.positions === 'undefined') {
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