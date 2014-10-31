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

    var EntityData = function(entity) {
        this.entity = entity;
        this.label = undefined;
        this.index = undefined;
    };

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

        entityCollection.collectionChanged.addEventListener(LabelVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._labelCollection = undefined;
        this._entityCollection = entityCollection;
        this._items = new AssociativeArray();

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

        var items = this._items.values;
        var unusedIndexes = this._unusedIndexes;
        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var labelGraphics = entity._label;
            var text;
            var label = item.label;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(labelGraphics._show, time, true);

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                text = Property.getValueOrUndefined(labelGraphics._text, time);
                show = defined(position) && defined(text);
            }

            if (!show) {
                //don't bother creating or updating anything else
                returnLabel(item, unusedIndexes);
                continue;
            }

            if (!defined(label)) {
                var labelCollection = this._labelCollection;
                if (!defined(labelCollection)) {
                    labelCollection = new LabelCollection();
                    this._labelCollection = labelCollection;
                    this._scene.primitives.add(labelCollection);
                }

                var length = unusedIndexes.length;
                if (length > 0) {
                    var index = unusedIndexes.pop();
                    item.index = index;
                    label = labelCollection.get(index);
                } else {
                    label = labelCollection.add();
                    item.index = labelCollection.length - 1;
                }
                label.id = entity;
                item.label = label;
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
        this._entityCollection.collectionChanged.removeEventListener(LabelVisualizer.prototype._onCollectionChanged, this);
        if (defined(this._labelCollection)) {
            this._scene.primitives.remove(this._labelCollection);
        }
        return destroyObject(this);
    };

    LabelVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var unusedIndexes = this._unusedIndexes;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._label) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._label) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                returnLabel(items.get(entity.id), unusedIndexes);
                items.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            returnLabel(items.get(entity.id), unusedIndexes);
            items.remove(entity.id);
        }
    };

    function returnLabel(item, unusedIndexes) {
        if (defined(item)) {
            var label = item.label;
            if (defined(label)) {
                unusedIndexes.push(item.index);
                label.show = false;
                item.label = undefined;
                item.index = -1;
            }
        }
    }

    return LabelVisualizer;
});
