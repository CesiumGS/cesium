/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/BillboardCollection',
        './Property'
    ], function(
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        BillboardCollection,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 0.0;
    var defaultPixelSize = 1.0;

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

        var billboardCollection = new BillboardCollection();
        scene.primitives.add(billboardCollection);

        this._scene = scene;
        this._unusedIndexes = [];
        this._entityCollection = entityCollection;
        this._billboardCollection = billboardCollection;
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

        var entities = this._entityCollection.entities;
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
        var entities = entityCollection.entities;
        for (var i = entities.length - 1; i > -1; i--) {
            entities[i]._pointVisualizerIndex = undefined;
        }
        entityCollection.collectionChanged.removeEventListener(PointVisualizer.prototype._onObjectsRemoved, this);
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    var color = new Color();
    var position = new Cartesian3();
    var outlineColor = new Color();
    var scaleByDistance = new NearFarScalar();
    function updateObject(pointVisualizer, time, entity) {
        var pointGraphics = entity._point;
        if (!defined(pointGraphics)) {
            return;
        }

        var billboard;
        var pointVisualizerIndex = entity._pointVisualizerIndex;
        var show = entity.isAvailable(time) && Property.getValueOrDefault(pointGraphics._show, time, true);
        if (show) {
            position = Property.getValueOrUndefined(entity._position, time, position);
            show = defined(position);
        }
        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pointVisualizerIndex)) {
                billboard = pointVisualizer._billboardCollection.get(pointVisualizerIndex);
                billboard.show = false;
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
        billboard.position = position;
        billboard.scaleByDistance = Property.getValueOrUndefined(pointGraphics._scaleByDistance, time, scaleByDistance);

        var newColor = Property.getValueOrDefault(pointGraphics._color, time, defaultColor, color);
        var newOutlineColor = Property.getValueOrDefault(pointGraphics._outlineColor, time, defaultOutlineColor, outlineColor);
        var newOutlineWidth = Property.getValueOrDefault(pointGraphics._outlineWidth, time, defaultOutlineWidth);
        var newPixelSize = Property.getValueOrDefault(pointGraphics._pixelSize, time, defaultPixelSize);

        needRedraw = needRedraw || //
                     newOutlineWidth !== billboard._visualizerOutlineWidth || //
                     newPixelSize !== billboard._visualizerPixelSize || //
                     !Color.equals(newColor, billboard._visualizerColor) || //
                     !Color.equals(newOutlineColor, billboard._visualizerOutlineColor);

        if (needRedraw) {
            billboard._visualizerColor = Color.clone(newColor, billboard._visualizerColor);
            billboard._visualizerOutlineColor = Color.clone(newOutlineColor, billboard._visualizerOutlineColor);
            billboard._visualizerPixelSize = newPixelSize;
            billboard._visualizerOutlineWidth = newOutlineWidth;

            var centerAlpha = newColor.alpha;
            var cssColor = newColor.toCssColorString();
            var cssOutlineColor = newOutlineColor.toCssColorString();
            var cssOutlineWidth = newOutlineWidth;
            var textureId = JSON.stringify([cssColor, newPixelSize, cssOutlineColor, cssOutlineWidth]);

            billboard.setImage(textureId, function(id) {
                var canvas = document.createElement('canvas');

                var length = newPixelSize + (2 * cssOutlineWidth);
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
                        context2D.arc(length / 2, length / 2, newPixelSize / 2, 0, 2 * Math.PI, true);
                        context2D.closePath();
                        context2D.fillStyle = 'black';
                        context2D.fill();
                        context2D.restore();
                    }
                }

                context2D.beginPath();
                context2D.arc(length / 2, length / 2, newPixelSize / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssColor;
                context2D.fill();

                return canvas;
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
                entity._pointVisualizerIndex = undefined;
                thisUnusedIndexes.push(pointVisualizerIndex);
            }
        }
    };

    return PointVisualizer;
});
