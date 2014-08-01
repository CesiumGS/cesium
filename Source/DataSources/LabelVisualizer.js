/*global define*/
define([
        '../Core/AssociativeArray',
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
        AssociativeArray,
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

    var defaultScale = 1.0;
    var defaultFont = '30px sans-serif';
    var defaultStyle = LabelStyle.FILL;
    var defaultFillColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 1;
    var defaultPixelOffset = Cartesian2.ZERO;
    var defaultEyeOffset = Cartesian3.ZERO;
    var defaultHorizontalOrigin = HorizontalOrigin.CENTER;
    var defaultVerticalOrigin = VerticalOrigin.CENTER;

    var position = new Cartesian3();
    var fillColor = new Color();
    var outlineColor = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();

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
        entityCollection.collectionChanged.addEventListener(LabelVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._labelCollection = labelCollection;
        this._entityCollection = entityCollection;
        this._entitiesToVisualize = new AssociativeArray();

        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
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

        var entities = this._entitiesToVisualize.values;
        var unusedIndexes = this._unusedIndexes;
        var labelCollection = this._labelCollection;
        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var labelGraphics = entity._label;
            var text;
            var label;
            var labelVisualizerIndex = entity._labelVisualizerIndex;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(labelGraphics._show, time, true);

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                text = Property.getValueOrUndefined(labelGraphics._text, time);
                show = defined(position) && defined(text);
            }

            if (!show) {
                //don't bother creating or updating anything else
                cleanEntity(entity, labelCollection, unusedIndexes);
                continue;
            }

            if (!defined(labelVisualizerIndex)) {
                var length = unusedIndexes.length;
                if (length > 0) {
                    labelVisualizerIndex = unusedIndexes.pop();
                    label = labelCollection.get(labelVisualizerIndex);
                } else {
                    labelVisualizerIndex = labelCollection.length;
                    label = labelCollection.add();
                }
                entity._labelVisualizerIndex = labelVisualizerIndex;
                label.id = entity;
            } else {
                label = labelCollection.get(labelVisualizerIndex);
            }

            label.show = true;
            label.position = position;
            label.text = text;
            label.scale = Property.getValueOrDefault(labelGraphics._scale, time, defaultScale);
            label.font = Property.getValueOrDefault(labelGraphics._font, time, defaultFont);
            label.style = Property.getValueOrDefault(labelGraphics._style, time, defaultStyle);
            label.fillColor = Property.getValueOrDefault(labelGraphics._fillColor, time, defaultFillColor, fillColor);
            label.outlineColor = Property.getValueOrDefault(labelGraphics._outlineColor, time, defaultOutlineColor, outlineColor);
            label.outlineWidth = Property.getValueOrDefault(labelGraphics._outlineWidth, time, defaultOutlineWidth);
            label.pixelOffset = Property.getValueOrDefault(labelGraphics._pixelOffset, time, defaultPixelOffset, pixelOffset);
            label.eyeOffset = Property.getValueOrDefault(labelGraphics._eyeOffset, time, defaultEyeOffset, eyeOffset);
            label.horizontalOrigin = Property.getValueOrDefault(labelGraphics._horizontalOrigin, time, defaultHorizontalOrigin);
            label.verticalOrigin = Property.getValueOrDefault(labelGraphics._verticalOrigin, time, defaultVerticalOrigin);
            label.translucencyByDistance = Property.getValueOrUndefined(labelGraphics._translucencyByDistance, time, translucencyByDistance);
            label.pixelOffsetScaleByDistance = Property.getValueOrUndefined(labelGraphics._pixelOffsetScaleByDistance, time, pixelOffsetScaleByDistance);
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
        entityCollection.collectionChanged.removeEventListener(LabelVisualizer.prototype._onCollectionChanged, this);

        var entities = entityCollection.entities;
        var length = entities.length;
        for (var i = 0; i < length; i++) {
            entities[i]._labelVisualizerIndex = undefined;
        }
        this._scene.primitives.remove(this._labelCollection);
        return destroyObject(this);
    };

    LabelVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var labelCollection = this._labelCollection;
        var unusedIndexes = this._unusedIndexes;
        var entities = this._entitiesToVisualize;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._label) && defined(entity._position)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._label) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                cleanEntity(entity, labelCollection, unusedIndexes);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            cleanEntity(entity, labelCollection, unusedIndexes);
            entities.remove(entity.id);
        }
    };

    function cleanEntity(entity, collection, unusedIndexes) {
        var labelVisualizerIndex = entity._labelVisualizerIndex;
        if (defined(labelVisualizerIndex)) {
            var label = collection.get(labelVisualizerIndex);
            label.show = false;
            unusedIndexes.push(labelVisualizerIndex);
            entity._labelVisualizerIndex = undefined;
        }
    }

    return LabelVisualizer;
});
