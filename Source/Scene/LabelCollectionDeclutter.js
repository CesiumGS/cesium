/*global define*/
define([
    '../Core/BoundingRectangle',
    '../Core/Cartesian3',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/destroyObject',
    '../Core/EllipsoidalOccluder',
    '../ThirdParty/kdbush',
    './HorizontalOrigin',
    './LabelCollection',
    './SceneTransforms',
    './VerticalOrigin'
], function(
    BoundingRectangle,
    Cartesian3,
    defaultValue,
    defined,
    destroyObject,
    EllipsoidalOccluder,
    kdbush,
    HorizontalOrigin,
    LabelCollection,
    SceneTransforms,
    VerticalOrigin) {
    'use strict';

    function getX(point) {
        return point.coord.x;
    }

    function getY(point) {
        return point.coord.y;
    }

    function getBBox(label, coord) {
        // TODO: create this at label creation time
        var width = 0;
        var height = Number.NEGATIVE_INFINITY;

        var glyphs = label._glyphs;
        var length = glyphs.length;
        for (var i = 0; i < length; ++i) {
            var glyph = glyphs[i];
            var billboard = glyph.billboard;
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

        return new BoundingRectangle(x, y, width, height);
    }

    function createDeclutterCallback(labelCollectionDeclutter) {
        return function() {
            var labelCollection = labelCollectionDeclutter._labelCollection;
            var renderCollection = labelCollectionDeclutter._renderCollection;
            var scene = labelCollectionDeclutter._scene;
            var pixelRange = labelCollectionDeclutter._pixelRange;

            if (defined(renderCollection)) {
                renderCollection.removeAll();
            } else {
                renderCollection = new LabelCollection();
            }

            var ellipsoid = scene.mapProjection.ellipsoid;
            var cameraPosition = scene.camera.positionWC;
            var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);

            var i;
            var label;
            var length = labelCollection.length;
            var points = [];

            for (i = 0; i < length; ++i) {
                label = labelCollection.get(i);
                if (!occluder.isPointVisible(label.position)) {
                    continue;
                }

                var coord = label.computeScreenSpacePosition(scene);
                if (!defined(coord) || coord.x < 0.0 || coord.x > scene.drawingBufferWidth || coord.y < 0.0 || coord.y > scene.drawingBufferHeight) {
                    continue;
                }

                points.push({
                    labelIndex : i,
                    clustered : false,
                    coord : coord
                });
            }

            var index = kdbush(points, getX, getY, 64, Int32Array);
            length = points.length;

            for (i = 0; i < length; ++i) {
                var point = points[i];
                if (point.clustered) {
                    continue;
                }

                point.clustered = true;

                label = labelCollection.get(point.labelIndex);
                var bbox = getBBox(label, point.coord);

                bbox.x += pixelRange;
                bbox.y += pixelRange;
                bbox.width += pixelRange * 0.5;
                bbox.height += pixelRange * 0.5;

                var neighbors = index.within(bbox.x, bbox.y, bbox.width);

                var neighborsFound = false;
                var clusterPosition = new Cartesian3();
                var numPoints = 0;

                var neighborLength = neighbors.length;
                for (var j = 0; j < neighborLength; ++j) {
                    var neighborIndex = neighbors[j];
                    var neighborPoint = points[neighborIndex];
                    if (!neighborPoint.clustered) {
                        neighborPoint.clustered = true;
                        neighborsFound = true;

                        Cartesian3.add(clusterPosition, labelCollection.get(neighborPoint.labelIndex).position, clusterPosition);
                        ++numPoints;
                    }
                }

                if (!neighborsFound) {
                    var clone = {
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
                    renderCollection.add(clone);
                } else {
                    var position = Cartesian3.multiplyByScalar(clusterPosition, 1.0 / numPoints, clusterPosition);
                    renderCollection.add({
                        text : '' + (numPoints + 1),
                        position : position
                    });
                }
            }

            if (renderCollection.length === 0) {
                renderCollection.destroy();
                renderCollection = undefined;
            }

            labelCollectionDeclutter._renderCollection = renderCollection;
        };
    }

    function LabelCollectionDeclutter(options) {
        this._scene = options.scene;
        this._labelCollection = options.labelCollection;
        this._renderCollection = undefined;

        this._pixelRange = defaultValue(options.pixelRange, 5);

        this._removeEventListener = this._scene.camera.moveEnd.addEventListener(createDeclutterCallback(this));
    }

    LabelCollectionDeclutter.prototype.update = function(frameState) {
        if (!defined(this._renderCollection)) {
            this._labelCollection.update(frameState);
        } else {
            this._renderCollection.update(frameState);
        }
    };

    LabelCollectionDeclutter.prototype.isDestroyed = function() {
        return false;
    };

    LabelCollectionDeclutter.prototype.destroy = function() {
        this._labelCollection = this._labelCollection && this._labelCollection.destroy();
        this._removeEventListener();
        return destroyObject(this);
    };

    return LabelCollectionDeclutter;
});