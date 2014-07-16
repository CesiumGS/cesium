/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        './Property'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        HorizontalOrigin,
        LabelCollection,
        LabelStyle,
        VerticalOrigin,
        Property) {
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

    var position = new Cartesian3();
    var fillColor = new Color();
    var outlineColor = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();
    function updateObject(labelVisualizer, time, entity) {
        var labelGraphics = entity._label;
        if (!defined(labelGraphics)) {
            return;
        }

        position = Property.getValueOrUndefined(entity._position, time, position);
        var text = Property.getValueOrUndefined(labelGraphics._text, time);

        var label;
        var labelVisualizerIndex = entity._labelVisualizerIndex;
        var show = defined(position) && defined(text) && entity.isAvailable(time) && Property.getValueOrDefault(labelGraphics._show, time, true);

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
        } else {
            label = labelVisualizer._labelCollection.get(labelVisualizerIndex);
        }

        label.show = true;
        label.position = position;
        label.text = text;
        label.scale = Property.getValueOrDefault(labelGraphics._scale, time, 1.0);
        label.font = Property.getValueOrDefault(labelGraphics._font, time, '30px sans-serif');
        label.style = Property.getValueOrDefault(labelGraphics._style, time, LabelStyle.FILL);
        label.fillColor = Property.getValueOrDefault(labelGraphics._fillColor, time, Color.WHITE, fillColor);
        label.outlineColor = Property.getValueOrDefault(labelGraphics._outlineColor, time, Color.BLACK, outlineColor);
        label.outlineWidth = Property.getValueOrDefault(labelGraphics._outlineWidth, time, 1);
        label.pixelOffset = Property.getValueOrDefault(labelGraphics._pixelOffset, time, Cartesian2.ZERO, pixelOffset);
        label.eyeOffset = Property.getValueOrDefault(labelGraphics._eyeOffset, time, Cartesian3.ZERO, eyeOffset);
        label.horizontalOrigin = Property.getValueOrDefault(labelGraphics._horizontalOrigin, time, HorizontalOrigin.CENTER);
        label.verticalOrigin = Property.getValueOrDefault(labelGraphics._verticalOrigin, time, VerticalOrigin.CENTER);
        label.translucencyByDistance = Property.getValueOrUndefined(labelGraphics._translucencyByDistance, time, translucencyByDistance);
        label.pixelOffsetScaleByDistance = Property.getValueOrUndefined(labelGraphics._pixelOffsetScaleByDistance, time, pixelOffsetScaleByDistance);
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
