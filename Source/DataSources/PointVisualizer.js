/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/BillboardCollection',
        '../Scene/TextureAtlas',
        '../Scene/TextureAtlasBuilder'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        BillboardCollection,
        TextureAtlas,
        TextureAtlasBuilder) {
    "use strict";

    /**
     * A {@link Visualizer} which maps {@link Entity#point} to a {@link Billboard}.
     * @alias PointVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var PointVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(PointVisualizer.prototype._onObjectsRemoved, this);

        var atlas = new TextureAtlas({
            scene : scene
        });
        var billboardCollection = new BillboardCollection();
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);

        this._scene = scene;
        this._unusedIndexes = [];
        this._entityCollection = entityCollection;
        this._textureAtlas = atlas;
        this._billboardCollection = billboardCollection;
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    PointVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entityCollection.getObjects();
        for (var i = 0, len = entities.length; i < len; i++) {
            updateObject(this, time, entities[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    PointVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    PointVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        var entities = entityCollection.getObjects();
        for (var i = entities.length - 1; i > -1; i--) {
            entities[i]._pointVisualizerIndex = undefined;
        }
        entityCollection.collectionChanged.removeEventListener(PointVisualizer.prototype._onObjectsRemoved, this);
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    var color;
    var position;
    var outlineColor;
    var scaleByDistance;
    function updateObject(pointVisualizer, time, entity) {
        var pointGraphics = entity._point;
        if (!defined(pointGraphics)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var billboard;
        var showProperty = pointGraphics._show;
        var pointVisualizerIndex = entity._pointVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pointVisualizerIndex)) {
                billboard = pointVisualizer._billboardCollection.get(pointVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                entity._pointVisualizerIndex = undefined;
                pointVisualizer._unusedIndexes.push(pointVisualizerIndex);
            }
            return;
        }

        var needRedraw = false;
        if (!defined(pointVisualizerIndex)) {
            var unusedIndexes = pointVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pointVisualizerIndex = unusedIndexes.pop();
                billboard = pointVisualizer._billboardCollection.get(pointVisualizerIndex);
            } else {
                pointVisualizerIndex = pointVisualizer._billboardCollection.length;
                billboard = pointVisualizer._billboardCollection.add();
            }
            entity._pointVisualizerIndex = pointVisualizerIndex;
            billboard.id = entity;

            billboard._visualizerColor = Color.clone(Color.WHITE, billboard._visualizerColor);
            billboard._visualizerOutlineColor = Color.clone(Color.BLACK, billboard._visualizerOutlineColor);
            billboard._visualizerOutlineWidth = 0;
            billboard._visualizerPixelSize = 1;
            needRedraw = true;
        } else {
            billboard = pointVisualizer._billboardCollection.get(pointVisualizerIndex);
        }

        billboard.show = true;

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.position = position;
        }

        var property = pointGraphics._color;
        if (defined(property)) {
            color = property.getValue(time, color);
            if (!Color.equals(billboard._visualizerColor, color)) {
                Color.clone(color, billboard._visualizerColor);
                needRedraw = true;
            }
        }

        property = pointGraphics._outlineColor;
        if (defined(property)) {
            outlineColor = property.getValue(time, outlineColor);
            if (!Color.equals(billboard._visualizerOutlineColor, outlineColor)) {
                Color.clone(outlineColor, billboard._visualizerOutlineColor);
                needRedraw = true;
            }
        }

        property = pointGraphics._outlineWidth;
        if (defined(property)) {
            var outlineWidth = property.getValue(time);
            if (billboard._visualizerOutlineWidth !== outlineWidth) {
                billboard._visualizerOutlineWidth = outlineWidth;
                needRedraw = true;
            }
        }

        property = pointGraphics._pixelSize;
        if (defined(property)) {
            var pixelSize = property.getValue(time);
            if (billboard._visualizerPixelSize !== pixelSize) {
                billboard._visualizerPixelSize = pixelSize;
                needRedraw = true;
            }
        }

        property = pointGraphics._scaleByDistance;
        if (defined(property)) {
            scaleByDistance = property.getValue(time, scaleByDistance);
            if (defined(scaleByDistance)) {
                billboard.scaleByDistance = scaleByDistance;
            }
        }

        if (needRedraw) {
            var centerColor = defaultValue(billboard._visualizerColor, Color.WHITE);
            var centerAlpha = centerColor.alpha;
            var cssColor = centerColor.toCssColorString();
            var cssOutlineColor = defaultValue(billboard._visualizerOutlineColor, Color.BLACK).toCssColorString();
            var cssPixelSize = defaultValue(billboard._visualizerPixelSize, 3);
            var cssOutlineWidth = defaultValue(billboard._visualizerOutlineWidth, 2);
            var textureId = JSON.stringify([cssColor, cssPixelSize, cssOutlineColor, cssOutlineWidth]);

            pointVisualizer._textureAtlasBuilder.addTextureFromFunction(textureId, function(id, loadedCallback) {
                var canvas = document.createElement('canvas');

                var length = cssPixelSize + (2 * cssOutlineWidth);
                canvas.height = canvas.width = length;

                var context2D = canvas.getContext('2d');
                context2D.clearRect(0, 0, length, length);

                if (cssOutlineWidth !== 0) {
                    context2D.beginPath();
                    context2D.arc(length / 2, length / 2, length / 2, 0, 2 * Math.PI, true);
                    context2D.closePath();
                    context2D.fillStyle = cssOutlineColor;
                    context2D.fill();
                    // Punch a hole in the center if needed.
                    if (centerAlpha < 1.0) {
                        context2D.save();
                        context2D.globalCompositeOperation = 'destination-out';
                        context2D.beginPath();
                        context2D.arc(length / 2, length / 2, cssPixelSize / 2, 0, 2 * Math.PI, true);
                        context2D.closePath();
                        context2D.fillStyle = 'black';
                        context2D.fill();
                        context2D.restore();
                    }
                }

                context2D.beginPath();
                context2D.arc(length / 2, length / 2, cssPixelSize / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssColor;
                context2D.fill();

                loadedCallback(canvas);
            }, function(imageIndex) {
                billboard.imageIndex = imageIndex;
            });
        }
    }

    PointVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var pointVisualizerIndex = entity._pointVisualizerIndex;
            if (defined(pointVisualizerIndex)) {
                var billboard = thisBillboardCollection.get(pointVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                entity._pointVisualizerIndex = undefined;
                thisUnusedIndexes.push(pointVisualizerIndex);
            }
        }
    };

    return PointVisualizer;
});
