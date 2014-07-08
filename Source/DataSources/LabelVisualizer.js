/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        HorizontalOrigin,
        LabelCollection,
        LabelStyle,
        VerticalOrigin) {
    "use strict";

    /**
     * A {@link Visualizer} which maps the {@link LabelGraphics} instance
     * in {@link Entity#label} to a {@link Label}.
     * @alias LabelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var LabelVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        var labelCollection = new LabelCollection();
        scene.primitives.add(labelCollection);
        entityCollection.collectionChanged.addEventListener(LabelVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._labelCollection = labelCollection;
        this._entityCollection = entityCollection;
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    LabelVisualizer.prototype.update = function(time) {
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
    LabelVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    LabelVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(LabelVisualizer.prototype._onObjectsRemoved, this);

        var entities = entityCollection.entities;
        var length = entities.length;
        for (var i = 0; i < length; i++) {
            entities[i]._labelVisualizerIndex = undefined;
        }
        this._scene.primitives.remove(this._labelCollection);
        return destroyObject(this);
    };

    var position;
    var fillColor;
    var outlineColor;
    var eyeOffset;
    var pixelOffset;
    function updateObject(labelVisualizer, time, entity) {
        var labelGraphics = entity._label;
        if (!defined(labelGraphics)) {
            return;
        }

        var textProperty = labelGraphics._text;
        if (!defined(textProperty)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var label;
        var showProperty = labelGraphics._show;
        var labelVisualizerIndex = entity._labelVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(labelVisualizerIndex)) {
                label = labelVisualizer._labelCollection.get(labelVisualizerIndex);
                label.show = false;
                labelVisualizer._unusedIndexes.push(labelVisualizerIndex);
                entity._labelVisualizerIndex = undefined;
            }
            return;
        }

        if (!defined(labelVisualizerIndex)) {
            var unusedIndexes = labelVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                labelVisualizerIndex = unusedIndexes.pop();
                label = labelVisualizer._labelCollection.get(labelVisualizerIndex);
            } else {
                labelVisualizerIndex = labelVisualizer._labelCollection.length;
                label = labelVisualizer._labelCollection.add();
            }
            entity._labelVisualizerIndex = labelVisualizerIndex;
            label.id = entity;

            label.text = '';
            label.scale = 1.0;
            label.font = '30px sans-serif';
            label.fillColor = Color.WHITE;
            label.outlineColor = Color.BLACK;
            label.outlineWidth = 1;
            label.style = LabelStyle.FILL;
            label.pixelOffset = Cartesian2.ZERO;
            label.eyeOffset = Cartesian3.ZERO;
            label.horizontalOrigin = HorizontalOrigin.CENTER;
            label.verticalOrigin = VerticalOrigin.CENTER;
        } else {
            label = labelVisualizer._labelCollection.get(labelVisualizerIndex);
        }

        label.show = show;

        var text = textProperty.getValue(time);
        if (defined(text)) {
            label.text = text;
        }

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            label.position = position;
        }

        var property = labelGraphics._scale;
        if (defined(property)) {
            var scale = property.getValue(time);
            if (defined(scale)) {
                label.scale = scale;
            }
        }

        property = labelGraphics._font;
        if (defined(property)) {
            var font = property.getValue(time);
            if (defined(font)) {
                label.font = font;
            }
        }

        property = labelGraphics._fillColor;
        if (defined(property)) {
            fillColor = property.getValue(time, fillColor);
            if (defined(fillColor)) {
                label.fillColor = fillColor;
            }
        }

        property = labelGraphics._outlineColor;
        if (defined(property)) {
            outlineColor = property.getValue(time, outlineColor);
            if (defined(outlineColor)) {
                label.outlineColor = outlineColor;
            }
        }

        property = labelGraphics._outlineWidth;
        if (defined(property)) {
            var outlineWidth = property.getValue(time);
            if (defined(outlineWidth)) {
                label.outlineWidth = outlineWidth;
            }
        }

        property = labelGraphics._style;
        if (defined(property)) {
            var style = property.getValue(time);
            if (defined(style)) {
                label.style = style;
            }
        }

        property = labelGraphics._pixelOffset;
        if (defined(property)) {
            pixelOffset = property.getValue(time, pixelOffset);
            if (defined(pixelOffset)) {
                label.pixelOffset = pixelOffset;
            }
        }

        property = labelGraphics._eyeOffset;
        if (defined(property)) {
            eyeOffset = property.getValue(time, eyeOffset);
            if (defined(eyeOffset)) {
                label.eyeOffset = eyeOffset;
            }
        }

        property = labelGraphics._horizontalOrigin;
        if (defined(property)) {
            var horizontalOrigin = property.getValue(time);
            if (defined(horizontalOrigin)) {
                label.horizontalOrigin = horizontalOrigin;
            }
        }

        property = labelGraphics._verticalOrigin;
        if (defined(property)) {
            var verticalOrigin = property.getValue(time);
            if (defined(verticalOrigin)) {
                label.verticalOrigin = verticalOrigin;
            }
        }

        property = labelGraphics._translucencyByDistance;
        if (defined(property)) {
            label.translucencyByDistance = property.getValue(time);
        }

        property = labelGraphics._pixelOffsetScaleByDistance;
        if (defined(property)) {
            label.pixelOffsetScaleByDistance = property.getValue(time);
        }
    }

    LabelVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisLabelCollection = this._labelCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var labelVisualizerIndex = entity._labelVisualizerIndex;
            if (defined(labelVisualizerIndex)) {
                var label = thisLabelCollection.get(labelVisualizerIndex);
                label.show = false;
                thisUnusedIndexes.push(labelVisualizerIndex);
                entity._labelVisualizerIndex = undefined;
            }
        }
    };

    return LabelVisualizer;
});
