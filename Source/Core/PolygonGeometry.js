/*global define*/
define([
        './DeveloperError',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './Matrix3',
        './Cartographic',
        './Ellipsoid',
        './Math',
        './Matrix4',
        './ComponentDatatype',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryIndices',
        './PolygonPipeline',
        './EllipsoidTangentPlane',
        './WindingOrder',
        './BoundingRectangle',
        './Quaternion',
        './GeometryFilters',
        './ExtentTessellator',
        './Queue',
        './Intersect',
        '../Scene/sampleTerrain',
        '../ThirdParty/when'
    ], function(
        DeveloperError,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Matrix3,
        Cartographic,
        Ellipsoid,
        CesiumMath,
        Matrix4,
        ComponentDatatype,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryIndices,
        PolygonPipeline,
        EllipsoidTangentPlane,
        WindingOrder,
        BoundingRectangle,
        Quaternion,
        GeometryFilters,
        ExtentTessellator,
        Queue,
        Intersect,
        sampleTerrain,
        when) {
    "use strict";

    /**
     * Creates a PolygonGeometry. The polygon itself is either defined by an array of Cartesian points,
     * an extent or a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {array of Cartesian} [positions] an array of positions that defined the corner points of the polygon
     * @param {Extent} [extent] an extent that defines a polygon. if a rotation attribute is supplied, the extent
     *                 is also rotated
     * @param {polygon hierarchy} [polygonHierarchy] a polygon hierarchy that can include holes
     * @param {number} [height=0,0] the height of the polygon,
     * @param {radians} [rotation=0.0] if supplied with an extent, the extent is rotated by this angle
     * @param {object} [pickData] the geometry pick data
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] the ellipsoid to be used as a reference
     *
     * @exception {DeveloperError} All dimensions components must be greater than or equal to zero.
     *
     * @example
     *
     *  // create a polygon from points
     *  var polygon = new Cesium.PolygonGeometry({
     *      positions : ellipsoid.cartographicArrayToCartesianArray([
     *                      Cesium.Cartographic.fromDegrees(-72.0, 40.0),
     *                      Cesium.Cartographic.fromDegrees(-70.0, 35.0),
     *                      Cesium.Cartographic.fromDegrees(-75.0, 30.0),
     *                      Cesium.Cartographic.fromDegrees(-70.0, 30.0),
     *                      Cesium.Cartographic.fromDegrees(-68.0, 40.0)
     *                  ]),
     *      pickData : 'polygon1'
     *  });
     *
     *  // create a polygon from an extent with rotation
     *  polygon = new Cesium.PolygonGeometry({
     *      extent : new Cesium.Extent(Cesium.Math.toRadians(-110.0),
     *                                 Cesium.Math.toRadians(0.0),
     *                                 Cesium.Math.toRadians(-90.0),
     *                                 Cesium.Math.toRadians(20.0)),
     *      height   : 0.0,
     *      rotation : Cesium.Math.toRadians(45),
     *      pickData : 'polygon2'
     *  });
     *
     *  // create a nested polygon with holes
     *  polygon = new Cesium.PolygonGeometry({
     *      polygonHierarchy : {
     *          positions : ellipsoid.cartographicArrayToCartesianArray(
     *                          [
     *                          Cesium.Cartographic.fromDegrees(-109.0, 30.0),
     *                          Cesium.Cartographic.fromDegrees(-95.0, 30.0),
     *                          Cesium.Cartographic.fromDegrees(-95.0, 40.0),
     *                          Cesium.Cartographic.fromDegrees(-109.0, 40.0)
     *                          ]),
     *          holes : [{
     *              positions : ellipsoid.cartographicArrayToCartesianArray(
     *                              [
     *                              Cesium.Cartographic.fromDegrees(-107.0, 31.0),
     *                              Cesium.Cartographic.fromDegrees(-107.0, 39.0),
     *                              Cesium.Cartographic.fromDegrees(-97.0, 39.0),
     *                              Cesium.Cartographic.fromDegrees(-97.0, 31.0)
     *                              ]),
     *              holes : [{
     *                  positions : ellipsoid.cartographicArrayToCartesianArray(
     *                                  [
     *                                  Cesium.Cartographic.fromDegrees(-105.0, 33.0),
     *                                  Cesium.Cartographic.fromDegrees(-99.0, 33.0),
     *                                  Cesium.Cartographic.fromDegrees(-99.0, 37.0),
     *                                  Cesium.Cartographic.fromDegrees(-105.0, 37.0)
     *                                  ]),
     *                  holes : [{
     *                      positions : ellipsoid.cartographicArrayToCartesianArray(
     *                                      [
     *                                      Cesium.Cartographic.fromDegrees(-103.0, 34.0),
     *                                      Cesium.Cartographic.fromDegrees(-101.0, 34.0),
     *                                      Cesium.Cartographic.fromDegrees(-101.0, 36.0),
     *                                      Cesium.Cartographic.fromDegrees(-103.0, 36.0)
     *                                      ])
     *                  }]
     *              }]
     *          }]
     *      },
     *      pickData : 'polygon3'
     *  });
     */
    var PolygonGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var meshes = [];
        var mesh;
        var boundingVolume;
        var i;

        if (typeof options.positions !== 'undefined') {
            // create from positions
            this.positions = options.positions;

            boundingVolume = BoundingSphere.fromPoints(this.positions);
            mesh = this.createMeshFromPositions(this.positions, boundingVolume);
            if (typeof mesh !== 'undefined') {
                meshes.push(mesh);
            }

        } else if (typeof options.extent !== 'undefined') {
            // create from an extent
            this.extent   = options.extent;
            this.rotation = options.rotation;

            boundingVolume = BoundingSphere.fromExtent3D(this.extent, ellipsoid);

            mesh = ExtentTessellator.compute({
                extent   : this.extent,
                rotation : this.rotation,
                generateTextureCoordinates : true
            });
            if (typeof mesh !== 'undefined') {
                meshes.push(mesh);
            }

        } else if (typeof options.polygonHierarchy !== 'undefined') {
            // create from a polygon hierarchy
            this.polygonHierarchy = options.polygonHierarchy;

            // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            var polygons = [];
            var queue = new Queue();
            queue.enqueue(this.polygonHierarchy);

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
                        if (hole.holes) {
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

            this.polygonHierarchy = polygons;

            var outerPositions =  this.polygonHierarchy[0];
            // The bounding volume is just around the boundary points, so there could be cases for
            // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
            // volume doesn't cover the polygon.
            boundingVolume = BoundingSphere.fromPoints(outerPositions);

            for (i = 0; i < this.polygonHierarchy.length; i++) {
                mesh = this.createMeshFromPositions(this.polygonHierarchy[i], boundingVolume);
                if (typeof mesh !== 'undefined') {
                    meshes.push(mesh);
                }
            }

        } else {
            throw new DeveloperError('positions, extent or hierarchy must be supplied.');
        }

        var attributes = {};
        var indexLists = [];

        mesh = GeometryFilters.combine(meshes);
        mesh = PolygonPipeline.scaleToGeodeticHeight(mesh, defaultValue(options.height, 0.0), ellipsoid);
        mesh = GeometryFilters.reorderForPostVertexCache(mesh);
        mesh = GeometryFilters.reorderForPreVertexCache(mesh);

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : mesh.attributes.position.values
        });

        indexLists.push(
            new GeometryIndices({
                primitiveType : PrimitiveType.TRIANGLES,
                values : mesh.indexLists[0].values
        }));

        /**
         * The height of the polygon.
         */
        this.height = defaultValue(options.height, 0.0);

        /**
         * The attributes (vertices)
         */
        this.attributes = attributes;

        /**
         * The indexes used for GL rendering
         */
        this.indexLists = indexLists;

        /**
         * The bounding sphere for the whole geometry
         */
        this.boundingSphere = boundingVolume;

        /**
         * The model matrix, simply the identity
         */
        this.modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY.clone());

        /**
         * Pick data used for selection
         */
        this.pickData = options.pickData;
    };

    PolygonGeometry.prototype.createMeshFromPositions = function(positions, boundingSphere, outerPositions) {
        var cleanedPositions = PolygonPipeline.cleanUp(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, this.ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions);

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
        var mesh = PolygonPipeline.computeSubdivision(cleanedPositions, indices, this._granularity);

        return mesh;
    };

    return PolygonGeometry;
});

