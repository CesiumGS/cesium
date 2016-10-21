/*global define*/
define([
    '../Core/BoundingRectangle',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/Color',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/destroyObject',
    '../Core/EllipsoidalOccluder',
    '../Core/Event',
    '../Core/Matrix4',
    '../Scene/Billboard',
    '../Scene/BillboardCollection',
    '../Scene/HeightReference',
    '../Scene/HorizontalOrigin',
    '../Scene/Label',
    '../Scene/LabelCollection',
    '../Scene/LabelStyle',
    '../Scene/PointPrimitive',
    '../Scene/PointPrimitiveCollection',
    '../Scene/SceneTransforms',
    '../Scene/VerticalOrigin',
    '../ThirdParty/kdbush',
    './Entity',
    './Property'
], function(
    BoundingRectangle,
    Cartesian2,
    Cartesian3,
    Color,
    defaultValue,
    defined,
    defineProperties,
    destroyObject,
    EllipsoidalOccluder,
    Event,
    Matrix4,
    Billboard,
    BillboardCollection,
    HeightReference,
    HorizontalOrigin,
    Label,
    LabelCollection,
    LabelStyle,
    PointPrimitive,
    PointPrimitiveCollection,
    SceneTransforms,
    VerticalOrigin,
    kdbush,
    Entity,
    Property) {
    'use strict';

    /**
     * Defines how screen space objects (billboards, points, labels) are clustered.
     *
     * @param {Object} [options] An object with the following properties:
     * @param {Boolean} [options.enabled=false] Whether or not to enable clustering.
     * @param {Number} [options.pixelRange=80] The pixel range to extend the screen space bounding box.
     * @param {Number} [options.minimumClusterSize=2] The minimum number of screen space objects that can be clustered.
     *
     * @alias EntityCluster
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Clustering.html|Cesium Sandcastle Clustering Demo}
     */
    function EntityCluster(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._enabled = defaultValue(options.enabled, false);
        this._pixelRange = defaultValue(options.pixelRange, 80);
        this._minimumClusterSize = defaultValue(options.minimumClusterSize, 2);

        this._labelCollection = undefined;
        this._billboardCollection = undefined;
        this._pointCollection = undefined;

        this._clusterBillboardCollection = undefined;
        this._clusterLabelCollection = undefined;
        this._clusterPointCollection = undefined;

        this._unusedLabelIndices = [];
        this._unusedBillboardIndices = [];
        this._unusedPointIndices = [];

        this._previousClusters = [];
        this._previousHeight = undefined;

        this._enabledDirty = false;
        this._pixelRangeDirty = false;
        this._minimumClusterSizeDirty = false;
        this._clusterDirty = false;

        this._cluster = undefined;
        this._removeEventListener = undefined;

        this._clusterEvent = new Event();
    }

    function getX(point) {
        return point.coord.x;
    }

    function getY(point) {
        return point.coord.y;
    }

    function expandBoundingBox(bbox, pixelRange) {
        bbox.x -= pixelRange;
        bbox.y -= pixelRange;
        bbox.width += pixelRange * 2.0;
        bbox.height += pixelRange * 2.0;
    }

    var labelBoundingBoxScratch = new BoundingRectangle();

    function getBoundingBox(item, coord, pixelRange, entityCluster, result) {
        if (defined(item._labelCollection)) {
            result = Label.getScreenSpaceBoundingBox(item, coord, result);
        } else if (defined(item._billboardCollection)) {
            result = Billboard.getScreenSpaceBoundingBox(item, coord, result);
        } else if (defined(item._pointPrimitiveCollection)) {
            result = PointPrimitive.getScreenSpaceBoundingBox(item, coord, result);
        }

        expandBoundingBox(result, pixelRange);

        if (!defined(item._labelCollection) && defined(item.id) && defined(item.id._label) && defined(entityCluster._labelCollection)) {
            var labelIndex = item.id._labelIndex;
            var label = entityCluster._labelCollection.get(labelIndex);
            var labelBBox = Label.getScreenSpaceBoundingBox(label, coord, labelBoundingBoxScratch);
            expandBoundingBox(labelBBox, pixelRange);
            result = BoundingRectangle.union(result, labelBBox, result);
        }

        return result;
    }

    function addNonClusteredItem(item, entityCluster) {
        item.clusterShow = true;

        if (!defined(item._labelCollection) && defined(item.id) && defined(item.id._label)) {
            var labelIndex = item.id._labelIndex;
            var label = entityCluster._labelCollection.get(labelIndex);
            label.clusterShow = true;
        }
    }

    function addCluster(position, numPoints, ids, entityCluster) {
        var cluster = {
            billboard : entityCluster._clusterBillboardCollection.add(),
            label : entityCluster._clusterLabelCollection.add(),
            point : entityCluster._clusterPointCollection.add()
        };

        cluster.billboard.show = false;
        cluster.point.show = false;
        cluster.label.show = true;
        cluster.label.text = numPoints.toLocaleString();
        cluster.billboard.position = cluster.label.position = cluster.point.position = position;
        
        entityCluster._clusterEvent.raiseEvent(ids, cluster);
    }

    function getScreenSpacePositions(collection, points, scene, occluder) {
        if (!defined(collection)) {
            return;
        }

        var length = collection.length;
        for (var i = 0; i < length; ++i) {
            var item = collection.get(i);
            item.clusterShow = false;

            if (!item.show || !occluder.isPointVisible(item.position)) {
                continue;
            }

            if (defined(item._labelCollection) && (defined(item.id._billboard) || defined(item.id._point))) {
                continue;
            }

            var coord = item.computeScreenSpacePosition(scene);
            if (!defined(coord)) {
                continue;
            }

            points.push({
                index : i,
                collection : collection,
                clustered : false,
                coord : coord
            });
        }
    }

    var pointBoundinRectangleScratch = new BoundingRectangle();
    var totalBoundingRectangleScratch = new BoundingRectangle();
    var neighborBoundingRectangleScratch = new BoundingRectangle();

    function createDeclutterCallback(entityCluster) {
        return function(amount) {
            if ((defined(amount) && amount < 0.05) || !entityCluster.enabled) {
                return;
            }

            var scene = entityCluster._scene;

            var labelCollection = entityCluster._labelCollection;
            var billboardCollection = entityCluster._billboardCollection;
            var pointCollection = entityCluster._pointCollection;

            if (!defined(labelCollection) && !defined(billboardCollection) && !defined(pointCollection)) {
                return;
            }

            var clusteredLabelCollection = entityCluster._clusterLabelCollection;
            var clusteredBillboardCollection = entityCluster._clusterBillboardCollection;
            var clusteredPointCollection = entityCluster._clusterPointCollection;

            if (defined(clusteredLabelCollection)) {
                clusteredLabelCollection.removeAll();
            } else {
                clusteredLabelCollection = entityCluster._clusterLabelCollection = new LabelCollection({
                    scene : scene
                });
            }

            if (defined(clusteredBillboardCollection)) {
                clusteredBillboardCollection.removeAll();
            } else {
                clusteredBillboardCollection = entityCluster._clusterBillboardCollection = new BillboardCollection({
                    scene : scene
                });
            }

            if (defined(clusteredPointCollection)) {
                clusteredPointCollection.removeAll();
            } else {
                clusteredPointCollection = entityCluster._clusterPointCollection = new PointPrimitiveCollection();
            }

            var pixelRange = entityCluster._pixelRange;
            var minimumClusterSize = entityCluster._minimumClusterSize;

            var clusters = entityCluster._previousClusters;
            var newClusters = [];

            var previousHeight = entityCluster._previousHeight;
            var currentHeight = scene.camera.positionCartographic.height;

            var ellipsoid = scene.mapProjection.ellipsoid;
            var cameraPosition = scene.camera.positionWC;
            var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);

            var points = [];
            getScreenSpacePositions(labelCollection, points, scene, occluder);
            getScreenSpacePositions(billboardCollection, points, scene, occluder);
            getScreenSpacePositions(pointCollection, points, scene, occluder);

            var i;
            var j;
            var length;
            var bbox;
            var neighbors;
            var neighborLength;
            var neighborIndex;
            var neighborPoint;
            var ids;
            var numPoints;

            var collection;
            var collectionIndex;

            var index = kdbush(points, getX, getY, 64, Int32Array);

            if (currentHeight < previousHeight) {
                length = clusters.length;
                for (i = 0; i < length; ++i) {
                    var cluster = clusters[i];

                    if (!occluder.isPointVisible(cluster.position)) {
                        continue;
                    }

                    var coord = Billboard._computeScreenSpacePosition(Matrix4.IDENTITY, cluster.position, Cartesian3.ZERO, Cartesian2.ZERO, scene);
                    if (!defined(coord)) {
                        continue;
                    }

                    var factor = 1.0 - currentHeight / previousHeight;
                    var width = cluster.width = cluster.width * factor;
                    var height = cluster.height = cluster.height * factor;

                    width = Math.max(width, cluster.minimumWidth);
                    height = Math.max(height, cluster.minimumHeight);

                    var minX = coord.x - width * 0.5;
                    var minY = coord.y - height * 0.5;
                    var maxX = coord.x + width;
                    var maxY = coord.y + height;

                    neighbors = index.range(minX, minY, maxX, maxY);
                    neighborLength = neighbors.length;
                    numPoints = 0;
                    ids = [];

                    for (j = 0; j < neighborLength; ++j) {
                        neighborIndex = neighbors[j];
                        neighborPoint = points[neighborIndex];
                        if (!neighborPoint.clustered) {
                            ++numPoints;

                            collection = neighborPoint.collection;
                            collectionIndex = neighborPoint.index;
                            ids.push(collection.get(collectionIndex).id);
                        }
                    }

                    if (numPoints >= minimumClusterSize) {
                        addCluster(cluster.position, numPoints, ids, entityCluster);
                        newClusters.push(cluster);

                        for (j = 0; j < neighborLength; ++j) {
                            points[neighbors[j]].clustered = true;
                        }
                    }
                }
            }

            length = points.length;
            for (i = 0; i < length; ++i) {
                var point = points[i];
                if (point.clustered) {
                    continue;
                }

                point.clustered = true;

                collection = point.collection;
                collectionIndex = point.index;

                var item = collection.get(collectionIndex);
                bbox = getBoundingBox(item, point.coord, pixelRange, entityCluster, pointBoundinRectangleScratch);
                var totalBBox = BoundingRectangle.clone(bbox, totalBoundingRectangleScratch);

                neighbors = index.range(bbox.x, bbox.y, bbox.x + bbox.width, bbox.y + bbox.height);
                neighborLength = neighbors.length;

                var clusterPosition = Cartesian3.clone(item.position);
                numPoints = 1;
                ids = [item.id];

                for (j = 0; j < neighborLength; ++j) {
                    neighborIndex = neighbors[j];
                    neighborPoint = points[neighborIndex];
                    if (!neighborPoint.clustered) {
                        var neighborItem = neighborPoint.collection.get(neighborPoint.index);
                        var neighborBBox = getBoundingBox(neighborItem, neighborPoint.coord, pixelRange, entityCluster, neighborBoundingRectangleScratch);

                        Cartesian3.add(neighborItem.position, clusterPosition, clusterPosition);

                        BoundingRectangle.union(totalBBox, neighborBBox, totalBBox);
                        ++numPoints;

                        ids.push(neighborItem.id);
                    }
                }

                if (numPoints >= minimumClusterSize) {
                    var position = Cartesian3.multiplyByScalar(clusterPosition, 1.0 / numPoints, clusterPosition);
                    addCluster(position, numPoints, ids, entityCluster);
                    newClusters.push({
                        position : position,
                        width : totalBBox.width,
                        height : totalBBox.height,
                        minimumWidth : bbox.width,
                        minimumHeight : bbox.height
                    });

                    for (j = 0; j < neighborLength; ++j) {
                        points[neighbors[j]].clustered = true;
                    }
                } else {
                    addNonClusteredItem(item, entityCluster);
                }
            }

            if (clusteredLabelCollection.length === 0) {
                clusteredLabelCollection.destroy();
                entityCluster._clusterLabelCollection = undefined;
            }

            if (clusteredBillboardCollection.length === 0) {
                clusteredBillboardCollection.destroy();
                entityCluster._clusterBillboardCollection = undefined;
            }

            if (clusteredPointCollection.length === 0) {
                clusteredPointCollection.destroy();
                entityCluster._clusterPointCollection = undefined;
            }

            entityCluster._previousClusters = newClusters;
            entityCluster._previousHeight = currentHeight;
        };
    }

    EntityCluster.prototype._initialize = function(scene) {
        this._scene = scene;

        var cluster = createDeclutterCallback(this);
        this._cluster = cluster;
        this._removeEventListener = scene.camera.changed.addEventListener(cluster);
    };

    defineProperties(EntityCluster.prototype, {
        /**
         * Gets or sets whether clustering is enabled.
         * @memberof EntityCluster.prototype
         * @type {Boolean}
         */
        enabled : {
            get : function() {
                return this._enabled;
            },
            set : function(value) {
                this._enabledDirty = value !== this._enabled;
                this._enabled = value;
            }
        },
        /**
         * Gets or sets the pixel range to extend the screen space bounding box.
         * @memberof EntityCluster.prototype
         * @type {Number}
         */
        pixelRange : {
            get : function() {
                return this._pixelRange;
            },
            set : function(value) {
                this._pixelRangeDirty = value !== this._pixelRange;
                this._pixelRange = value;
            }
        },
        /**
         * Gets or sets the minimum number of screen space objects that can be clustered.
         * @memberof EntityCluster.prototype
         * @type {Number}
         */
        minimumClusterSize : {
            get : function() {
                return this._minimumClusterSize;
            },
            set : function(value) {
                this._minimumClusterSizeDirty = value !== this._minimumClusterSize;
                this._minimumClusterSize = value;
            }
        },
        /**
         * Gets the event that will be raised when a new cluster will be displayed. The signature of the event listener is {@link EntityCluster~newClusterCallback}.
         * @memberof EntityCluster.prototype
         * @type {Event}
         */
        clusterEvent : {
            get : function() {
                return this._clusterEvent;
            }
        }
    });

    /**
     * Returns a new {@link Label}.
     * @param {Entity} entity The entity that will use the returned {@link Label} for visualization.
     * @returns {Label} The label that will be used to visualize an entity.
     *
     * @private
     */
    EntityCluster.prototype.getLabel = function(entity) {
        var labelCollection = this._labelCollection;
        if (defined(labelCollection) && defined(entity._labelIndex)) {
            return labelCollection.get(entity._labelIndex);
        }

        if (!defined(labelCollection)) {
            labelCollection = this._labelCollection = new LabelCollection({
                scene : this._scene
            });
        }

        var index;
        var label;

        var unusedIndices = this._unusedLabelIndices;
        if (unusedIndices.length > 0) {
            index = unusedIndices.pop();
            label = labelCollection.get(index);
        } else {
            label = labelCollection.add();
            index = labelCollection.length - 1;
        }

        entity._labelIndex = index;

        this._clusterDirty = true;

        return label;
    };

    /**
     * Removes the {@link Label} associated with an entity so it can be reused by another entity.
     * @param {Entity} entity The entity that will uses the returned {@link Label} for visualization.
     *
     * @private
     */
    EntityCluster.prototype.removeLabel = function(entity) {
        if (!defined(this._labelCollection) || !defined(entity._labelIndex)) {
            return;
        }

        var index = entity._labelIndex;
        entity._labelIndex = undefined;

        var label = this._labelCollection.get(index);
        label.show = false;
        label.text = '';
        label.id = undefined;

        this._unusedLabelIndices.push(index);

        this._clusterDirty = true;
    };

    /**
     * Returns a new {@link Billboard}.
     * @param {Entity} entity The entity that will use the returned {@link Billboard} for visualization.
     * @returns {Billboard} The label that will be used to visualize an entity.
     *
     * @private
     */
    EntityCluster.prototype.getBillboard = function(entity) {
        var billboardCollection = this._billboardCollection;
        if (defined(billboardCollection) && defined(entity._billboardIndex)) {
            return billboardCollection.get(entity._billboardIndex);
        }

        if (!defined(billboardCollection)) {
            billboardCollection = this._billboardCollection = new BillboardCollection({
                scene : this._scene
            });
        }

        var index;
        var billboard;

        var unusedIndices = this._unusedBillboardIndices;
        if (unusedIndices.length > 0) {
            index = unusedIndices.pop();
            billboard = billboardCollection.get(index);
        } else {
            billboard = billboardCollection.add();
            index = billboardCollection.length - 1;
        }

        entity._billboardIndex = index;

        this._clusterDirty = true;

        return billboard;
    };

    /**
     * Removes the {@link Billboard} associated with an entity so it can be reused by another entity.
     * @param {Entity} entity The entity that will uses the returned {@link Billboard} for visualization.
     *
     * @private
     */
    EntityCluster.prototype.removeBillboard = function(entity) {
        if (!defined(this._billboardCollection) || !defined(entity._billboardIndex)) {
            return;
        }

        var index = entity._billboardIndex;
        entity._billboardIndex = undefined;

        var billboard = this._billboardCollection.get(index);
        billboard.id = undefined;
        billboard.show = false;
        billboard.image = undefined;

        this._unusedBillboardIndices.push(index);

        this._clusterDirty = true;
    };

    /**
     * Returns a new {@link Point}.
     * @param {Entity} entity The entity that will use the returned {@link Point} for visualization.
     * @returns {Point} The label that will be used to visualize an entity.
     *
     * @private
     */
    EntityCluster.prototype.getPoint = function(entity) {
        var pointCollection = this._pointCollection;
        if (defined(pointCollection) && defined(entity._pointIndex)) {
            return pointCollection.get(entity._pointIndex);
        }

        if (!defined(pointCollection)) {
            pointCollection = this._pointCollection = new PointPrimitiveCollection();
        }

        var index;
        var point;

        var unusedIndices = this._unusedPointIndices;
        if (unusedIndices.length > 0) {
            index = unusedIndices.pop();
            point = pointCollection.get(index);
        } else {
            point = pointCollection.add();
            index = pointCollection.length - 1;
        }

        entity._pointIndex = index;

        this._clusterDirty = true;

        return point;
    };

    /**
     * Removes the {@link Point} associated with an entity so it can be reused by another entity.
     * @param {Entity} entity The entity that will uses the returned {@link Point} for visualization.
     *
     * @private
     */
    EntityCluster.prototype.removePoint = function(entity) {
        if (!defined(this._pointCollection) || !defined(entity._pointIndex)) {
            return;
        }

        var index = entity._pointIndex;
        entity._pointIndex = undefined;

        var point = this._pointCollection.get(index);
        point.show = false;
        point.id = undefined;

        this._unusedPointIndices.push(index);

        this._clusterDirty = true;
    };

    function disableCollectionClustering(collection) {
        if (!defined(collection)) {
            return;
        }

        var length = collection.length;
        for (var i = 0; i < length; ++i) {
            collection.get(i).clusterShow = true;
        }
    }

    function updateEnable(entityCluster) {
        if (entityCluster.enabled) {
            return;
        }

        if (defined(entityCluster._clusterLabelCollection)) {
            entityCluster._clusterLabelCollection.destroy();
        }
        if (defined(entityCluster._clusterBillboardCollection)) {
            entityCluster._clusterBillboardCollection.destroy();
        }
        if (defined(entityCluster._clusterPointCollection)) {
            entityCluster._clusterPointCollection.destroy();
        }

        entityCluster._clusterLabelCollection = undefined;
        entityCluster._clusterBillboardCollection = undefined;
        entityCluster._clusterPointCollection = undefined;

        disableCollectionClustering(entityCluster._labelCollection);
        disableCollectionClustering(entityCluster._billboardCollection);
        disableCollectionClustering(entityCluster._pointCollection);
    }

    /**
     * Gets the draw commands for the clustered billboards/points/labels if enabled, otherwise,
     * queues the draw commands for billboards/points/labels created for entities.
     * @private
     */
    EntityCluster.prototype.update = function(frameState) {
        // If clustering is enabled before the label collection is updated,
        // the glyphs haven't been created so the screen space bounding boxes
        // are incorrect.
        if (defined(this._labelCollection) && this._labelCollection.length > 0 && this._labelCollection.get(0)._glyphs.length === 0) {
            var commandList = frameState.commandList;
            frameState.commandList = [];
            this._labelCollection.update(frameState);
            frameState.commandList = commandList;
        }

        if (this._enabledDirty) {
            this._enabledDirty = false;
            updateEnable(this);
            this._clusterDirty = true;
        }

        if (this._pixelRangeDirty || this._minimumClusterSizeDirty) {
            this._pixelRangeDirty = false;
            this._minimumClusterSizeDirty = false;
            this._clusterDirty = true;
        }

        if (this._clusterDirty) {
            this._clusterDirty = false;
            this._cluster();
        }

        if (defined(this._clusterLabelCollection)) {
            this._clusterLabelCollection.update(frameState);
        }
        if (defined(this._clusterBillboardCollection)) {
            this._clusterBillboardCollection.update(frameState);
        }
        if (defined(this._clusterPointCollection)) {
            this._clusterPointCollection.update(frameState);
        }

        if (defined(this._labelCollection)) {
            this._labelCollection.update(frameState);
        }
        if (defined(this._billboardCollection)) {
            this._billboardCollection.update(frameState);
        }
        if (defined(this._pointCollection)) {
            this._pointCollection.update(frameState);
        }
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Unlike other objects that use WebGL resources, this object can be reused. For example, if a data source is removed
     * from a data source collection and added to another.
     * </p>
     *
     * @returns {undefined}
     */
    EntityCluster.prototype.destroy = function() {
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();
        this._pointCollection = this._pointCollection && this._pointCollection.destroy();

        this._clusterLabelCollection = this._clusterLabelCollection && this._clusterLabelCollection.destroy();
        this._clusterBillboardCollection = this._clusterBillboardCollection && this._clusterBillboardCollection.destroy();
        this._clusterPointCollection = this._clusterPointCollection && this._clusterPointCollection.destroy();

        if (defined(this._removeEventListener)) {
            this._removeEventListener();
            this._removeEventListener = undefined;
        }

        this._labelCollection = undefined;
        this._billboardCollection = undefined;
        this._pointCollection = undefined;

        this._clusterBillboardCollection = undefined;
        this._clusterLabelCollection = undefined;
        this._clusterPointCollection = undefined;

        this._unusedLabelIndices = [];
        this._unusedBillboardIndices = [];
        this._unusedPointIndices = [];

        this._previousClusters = [];
        this._previousHeight = undefined;

        this._enabledDirty = false;
        this._pixelRangeDirty = false;
        this._minimumClusterSizeDirty = false;

        return undefined;
    };

    /**
     * A event listener function used to style clusters.
     * @callback EntityCluster~newClusterCallback
     *
     * @param {Entity[]} clusteredEntities An array of the entities contained in the cluster.
     * @param {Object} cluster An object containing billboard, label, and point properties. The values are the same as
     * billboard, label and point entities, but must be the values of the ConstantProperty.
     *
     * @example
     * // The default cluster values.
     * dataSource.clustering.clusterEvent.addEventListener(function(entities, cluster) {
     *     cluster.label.show = true;
     *     cluster.label.text = entities.length.toLocaleString();
     * });
     */

    return EntityCluster;
});
