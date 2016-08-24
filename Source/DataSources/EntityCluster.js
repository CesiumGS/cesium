/*global define*/
define([
    '../Core/BoundingRectangle',
    '../Core/Cartesian2',
    '../Core/Cartesian3',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/EllipsoidalOccluder',
    '../Core/Matrix4',
    '../Scene/Billboard',
    '../Scene/BillboardCollection',
    '../Scene/HorizontalOrigin',
    '../Scene/LabelCollection',
    '../Scene/PointPrimitiveCollection',
    '../Scene/SceneTransforms',
    '../Scene/VerticalOrigin',
    '../ThirdParty/kdbush'
], function(
    BoundingRectangle,
    Cartesian2,
    Cartesian3,
    defaultValue,
    defined,
    destroyObject,
    EllipsoidalOccluder,
    Matrix4,
    Billboard,
    BillboardCollection,
    HorizontalOrigin,
    LabelCollection,
    PointPrimitiveCollection,
    SceneTransforms,
    VerticalOrigin,
    kdbush) {
    'use strict';

    function getX(point) {
        return point.coord.x;
    }

    function getY(point) {
        return point.coord.y;
    }

    function getLabelBoundingBox(label, coord, pixelRange) {
        var width = 0;
        var height = Number.NEGATIVE_INFINITY;

        var glyphs = label._glyphs;
        var length = glyphs.length;
        for (var i = 0; i < length; ++i) {
            var glyph = glyphs[i];
            var billboard = glyph.billboard;
            if (!defined(billboard)) {
                continue;
            }

            width += billboard.width;
            height = Math.max(height, billboard.height);
        }

        var scale = label.scale;
        width *= scale;
        height *= scale;

        var x = coord.x;
        if (label.horizontalOrigin === HorizontalOrigin.RIGHT) {
            x -= width;
        } else if (label.horizontalOrigin === HorizontalOrigin.CENTER) {
            x -= width * 0.5;
        }

        var y = coord.y;
        if (label.verticalOrigin === VerticalOrigin.TOP) {
            y -= height;
        } else if (label.verticalOrigin === VerticalOrigin.CENTER) {
            y -= height * 0.5;
        }

        x += pixelRange;
        y += pixelRange;
        width += pixelRange * 0.5;
        height += pixelRange * 0.5;

        return new BoundingRectangle(x, y, width, height);
    }

    function getBillboardBoundingBox(billboard, coord, pixelRange) {
        var width = billboard.width;
        var height = billboard.height;

        var scale = billboard.scale;
        width *= scale;
        height *= scale;

        var x = coord.x;
        if (billboard.horizontalOrigin === HorizontalOrigin.RIGHT) {
            x += width * 0.5;
        } else if (billboard.horizontalOrigin === HorizontalOrigin.LEFT) {
            x -= width * 0.5;
        }

        var y = coord.y;
        if (billboard.verticalOrigin === VerticalOrigin.TOP) {
            y -= height;
        } else if (billboard.verticalOrigin === VerticalOrigin.CENTER) {
            y -= height * 0.5;
        }

        x -= pixelRange;
        y -= pixelRange;
        width += pixelRange * 0.5;
        height += pixelRange * 0.5;

        return new BoundingRectangle(x, y, width, height);
    }

    function getBoundingBox(item, coord, pixelRange) {
        if (defined(item._glyphs)) {
            return getLabelBoundingBox(item, coord, pixelRange);
        }

        return getBillboardBoundingBox(item, coord, pixelRange);
    }

    function cloneLabel(label) {
        return {
            text : label.text,
            show : label.show,
            font : label.font,
            fillColor : label.fillColor,
            outlineColor : label.outlineColor,
            outlineWidth : label.outlineWidth,
            style : label.outlineStyle,
            verticalOrigin : label.verticalOrigin,
            horizontalOrigin : label.horizontalOrigin,
            pixelOffset : label.pixelOffset,
            eyeOffset : label.eyeOffset,
            position : label.position,
            scale : label.scale,
            id : label.id,
            translucencyByDistance : label.translucencyByDistance,
            pixelOffsetScaleByDistance : label.pixelOffsetScaleByDistance,
            heightReference : label.heightReference
        };
    }

    function cloneBillboard(billboard) {
        return {
            show : billboard.show,
            position : billboard.position,
            heightReference : billboard.heightReference,
            pixelOffset : billboard.pixelOffset,
            scaleByDistance : billboard.scaleByDistance,
            translucencyByDistance : billboard.translucencyByDistance,
            pixelOffsetScaleByDistance : billboard.pixelOffsetScaleByDistance,
            eyeOffset : billboard.eyeOffset,
            horizontalOrigin : billboard.horizontalOrigin,
            verticalOrigin : billboard.verticalOrigin,
            scale : billboard.scale,
            color : billboard.color,
            rotation : billboard.rotation,
            alignedAxis : billboard.alignedAxis,
            width : billboard.width,
            height : billboard.height,
            sizeInMeters : billboard.sizeInMeters,
            id : billboard.id,
            pickPrimitive : billboard.pickPrimitive,
            image : billboard.image
        };
    }

    function addNonClusteredItem(item, entityCluster) {
        if (item._glyphs) {
            entityCluster._clusterLabelCollection.add(cloneLabel(item));
        } else {
            entityCluster._clusterBillboardCollection.add(cloneBillboard(item));
        }
    }

    function addCluster(position, numPoints, ids, entityCluster) {
        entityCluster._clusterLabelCollection.add({
            text : '' + numPoints,
            position : position,
            id : ids
        });
    }

    function getScreenSpacePositions(collection, points, scene, occluder) {
        if (!defined(collection)) {
            return;
        }

        var length = collection.length;
        for (var i = 0; i < length; ++i) {
            var item = collection.get(i);
            if (!item.show || !occluder.isPointVisible(item.position)) {
                continue;
            }

            var coord = item.computeScreenSpacePosition(scene);
            if (!defined(coord) || coord.x < 0.0 || coord.x > scene.drawingBufferWidth || coord.y < 0.0 || coord.y > scene.drawingBufferHeight) {
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

    function createDeclutterCallback(entityCluster) {
        return function(amount) {
            if (defined(amount) && amount < 0.05) {
                return;
            }

            var scene = entityCluster._scene;

            var labelCollection = entityCluster._labelCollection;
            var billboardCollection = entityCluster._billboardCollection;

            if (!defined(labelCollection) && !defined(billboardCollection)) {
                return;
            }

            var clusteredLabelCollection = entityCluster._clusterLabelCollection;
            var clusteredBillboardCollection = entityCluster._clusterBillboardCollection;

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

            var pixelRange = entityCluster._pixelRange;

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

            if (currentHeight <= previousHeight) {
                length = clusters.length;
                for (i = 0; i < length; ++i) {
                    var cluster = clusters[i];

                    if (!occluder.isPointVisible(cluster.position)) {
                        continue;
                    }

                    var coord = Billboard._computeScreenSpacePosition(Matrix4.IDENTITY, cluster.position, Cartesian3.ZERO, Cartesian2.ZERO, scene);
                    if (!defined(coord) || coord.x < 0.0 || coord.x > scene.drawingBufferWidth || coord.y < 0.0 || coord.y > scene.drawingBufferHeight) {
                        continue;
                    }

                    neighbors = index.within(coord.x, coord.y, cluster.radius);
                    neighborLength = neighbors.length;
                    numPoints = 0;
                    ids = [];

                    for (j = 0; j < neighborLength; ++j) {
                        neighborIndex = neighbors[j];
                        neighborPoint = points[neighborIndex];
                        if (!neighborPoint.clustered) {
                            neighborPoint.clustered = true;
                            ++numPoints;

                            collection = neighborPoint.collection;
                            collectionIndex = neighborPoint.index;
                            ids.push(collection.get(collectionIndex));
                        }
                    }

                    if (numPoints > 1) {
                        addCluster(cluster.position, numPoints, ids, entityCluster);
                        newClusters.push(cluster);
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
                bbox = getBoundingBox(item, point.coord, pixelRange);

                var x = bbox.x + bbox.width * 0.5;
                var y = bbox.y + bbox.height * 0.5;
                var radius = Math.max(bbox.width, bbox.height) * 0.5;

                neighbors = index.within(x, y, radius);
                neighborLength = neighbors.length;

                var clusterPosition = Cartesian3.clone(item.position);
                numPoints = 1;
                ids = [];

                for (j = 0; j < neighborLength; ++j) {
                    neighborIndex = neighbors[j];
                    neighborPoint = points[neighborIndex];
                    if (!neighborPoint.clustered) {
                        neighborPoint.clustered = true;

                        var neighborItem = neighborPoint.collection.get(neighborPoint.index);
                        var neighborBBox = getBoundingBox(neighborItem, neighborPoint.coord, pixelRange);

                        Cartesian3.add(neighborItem.position, clusterPosition, clusterPosition);

                        BoundingRectangle.union(bbox, neighborBBox, bbox);
                        ++numPoints;

                        ids.push(neighborItem);
                    }
                }

                if (numPoints === 1) {
                    addNonClusteredItem(item, entityCluster);
                } else {
                    var position = Cartesian3.multiplyByScalar(clusterPosition, 1.0 / numPoints, clusterPosition);
                    addCluster(position, numPoints, ids, entityCluster);
                    newClusters.push({
                        position : position,
                        radius : Math.max(bbox.width, bbox.height) * 0.5
                    });
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

            entityCluster._previousClusters = newClusters;
            entityCluster._previousHeight = currentHeight;
        };
    }

    function EntityCluster(options) {
        this._scene = options.scene;
        this._enabled = defaultValue(options.enabled, false);
        this._pixelRange = defaultValue(options.pixelRange, 80);

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

        this._removeEventListener = this._scene.camera.changed.addEventListener(createDeclutterCallback(this));
    }

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
        return label;
    };

    EntityCluster.prototype.removeLabel = function(entity) {
        if (!defined(this._labelCollection) || !defined(entity._labelIndex)) {
            return;
        }

        var index = entity._labelIndex;
        entity._labelIndex = undefined;

        var label = this._labelCollection.get(index);
        label.show = false;

        this._unusedLabelIndices.push(index);
    };

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
        return billboard;
    };

    EntityCluster.prototype.removeBillboard = function(entity) {
        if (!defined(this._billboardCollection) || !defined(entity._billboardIndex)) {
            return;
        }

        var index = entity._billboardIndex;
        entity._billboardIndex = undefined;

        var billboard = this._billboardCollection.get(index);
        billboard.show = false;

        this._unusedBillboardIndices.push(index);
    };

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
        return point;
    };

    EntityCluster.prototype.removePoint = function(entity) {
        if (!defined(this._pointCollection) || !defined(entity._pointIndex)) {
            return;
        }

        var index = entity._billboardIndex;
        entity._pointIndex = undefined;

        var point = this._pointCollection.get(index);
        point.show = false;

        this._unusedPointIndices.push(index);
    };

    EntityCluster.prototype.update = function(frameState) {
        if (defined(this._clusterLabelCollection)) {
            this._clusterLabelCollection.update(frameState);
        } else if (defined(this._labelCollection)) {
            this._labelCollection.update(frameState);
        }

        if (defined(this._clusterBillboardCollection)) {
            this._clusterBillboardCollection.update(frameState);
        } else if (defined(this._billboardCollection)) {
            this._billboardCollection.update(frameState);
        }

        if (defined(this.__clusterPointCollection)) {
            this._clusterPointCollection.update(frameState);
        } else if (defined(this._pointCollection)) {
            this._pointCollection.update(frameState);
        }
    };

    EntityCluster.prototype.isDestroyed = function() {
        return false;
    };

    EntityCluster.prototype.destroy = function() {
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();

        this._clusterLabelCollection = this._clusterLabelCollection && this._clusterLabelCollection.destroy();
        this._clusterBillboardCollection = this._clusterBillboardCollection && this._clusterBillboardCollection.destroy();

        this._removeEventListener();
        return destroyObject(this);
    };

    return EntityCluster;
});