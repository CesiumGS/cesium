/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/HeightReference',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/VerticalOrigin',
        './BoundingSphereState',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian2,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        HeightReference,
        HorizontalOrigin,
        LabelCollection,
        LabelStyle,
        VerticalOrigin,
        BoundingSphereState,
        Property) {
    'use strict';

    var defaultScale = 1.0;
    var defaultFont = '30px sans-serif';
    var defaultStyle = LabelStyle.FILL;
    var defaultFillColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 1.0;
    var defaultPixelOffset = Cartesian2.ZERO;
    var defaultEyeOffset = Cartesian3.ZERO;
    var defaultHeightReference = HeightReference.NONE;
    var defaultHorizontalOrigin = HorizontalOrigin.CENTER;
    var defaultVerticalOrigin = VerticalOrigin.CENTER;

    var position = new Cartesian3();
    var fillColor = new Color();
    var outlineColor = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();

    function EntityData(entity) {
        this.entity = entity;
        this.label = undefined;
        this.index = undefined;
    }

    /**
     * A {@link Visualizer} which maps the {@link LabelGraphics} instance
     * in {@link Entity#label} to a {@link Label}.
     * @alias LabelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    function LabelVisualizer(scene, entityCollection) {
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

        this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
    }

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
            var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(labelGraphics._show, time, true);

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
                    labelCollection = this._scene.primitives.add(new LabelCollection({
                        scene : this._scene
                    }));
                    this._labelCollection = labelCollection;
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
            label.heightReference = Property.getValueOrDefault(labelGraphics._heightReference, time, defaultHeightReference);
            label.horizontalOrigin = Property.getValueOrDefault(labelGraphics._horizontalOrigin, time, defaultHorizontalOrigin);
            label.verticalOrigin = Property.getValueOrDefault(labelGraphics._verticalOrigin, time, defaultVerticalOrigin);
            label.translucencyByDistance = Property.getValueOrUndefined(labelGraphics._translucencyByDistance, time, translucencyByDistance);
            label.pixelOffsetScaleByDistance = Property.getValueOrUndefined(labelGraphics._pixelOffsetScaleByDistance, time, pixelOffsetScaleByDistance);
        }
        return true;
    };

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     *
     * @param {Entity} entity The entity whose bounding sphere to compute.
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */
    LabelVisualizer.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var item = this._items.get(entity.id);
        if (!defined(item) || !defined(item.label)) {
            return BoundingSphereState.FAILED;
        }

        var label = item.label;
        result.center = Cartesian3.clone(defaultValue(label._clampedPosition, label.position), result.center);
        result.radius = 0;
        return BoundingSphereState.DONE;
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
                label.id = undefined;
                label.show = false;
                item.label = undefined;
                item.index = -1;
            }
        }
    }

    return LabelVisualizer;
});
