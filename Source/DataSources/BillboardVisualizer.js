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
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
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
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultEyeOffset = Cartesian3.ZERO;
    var defaultPixelOffset = Cartesian2.ZERO;
    var defaultScale = 1.0;
    var defaultRotation = 0.0;
    var defaultAlignedAxis = Cartesian3.ZERO;
    var defaultHorizontalOrigin = HorizontalOrigin.CENTER;
    var defaultVerticalOrigin = VerticalOrigin.CENTER;

    var position = new Cartesian3();
    var color = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var scaleByDistance = new NearFarScalar();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();

    /**
     * A {@link Visualizer} which maps {@link Entity#billboard} to a {@link Billboard}.
     * @alias BillboardVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var BillboardVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        var billboardCollection = new BillboardCollection();
        scene.primitives.add(billboardCollection);
        entityCollection.collectionChanged.addEventListener(BillboardVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._billboardCollection = billboardCollection;
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
    BillboardVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var entities = this._entitiesToVisualize.values;
        var billboardCollection = this._billboardCollection;
        var unusedIndexes = this._unusedIndexes;
        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var billboardGraphics = entity._billboard;
            var textureValue;
            var billboard;
            var billboardVisualizerIndex = entity._billboardVisualizerIndex;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(billboardGraphics._show, time, true);

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                textureValue = Property.getValueOrUndefined(billboardGraphics._image, time);
                show = defined(position) && defined(textureValue);
            }

            if (!show) {
                //don't bother creating or updating anything else
                cleanEntity(entity, billboardCollection, unusedIndexes);
                continue;
            }

            if (!defined(billboardVisualizerIndex)) {
                var length = unusedIndexes.length;
                if (length > 0) {
                    billboardVisualizerIndex = unusedIndexes.pop();
                    billboard = billboardCollection.get(billboardVisualizerIndex);
                } else {
                    billboardVisualizerIndex = billboardCollection.length;
                    billboard = billboardCollection.add();
                }
                entity._billboardVisualizerIndex = billboardVisualizerIndex;
                billboard.id = entity;
                billboard.image = undefined;
            } else {
                billboard = billboardCollection.get(billboardVisualizerIndex);
            }

            billboard.show = show;
            billboard.image = textureValue;
            billboard.position = position;
            billboard.color = Property.getValueOrDefault(billboardGraphics._color, time, defaultColor, color);
            billboard.eyeOffset = Property.getValueOrDefault(billboardGraphics._eyeOffset, time, defaultEyeOffset, eyeOffset);
            billboard.pixelOffset = Property.getValueOrDefault(billboardGraphics._pixelOffset, time, defaultPixelOffset, pixelOffset);
            billboard.scale = Property.getValueOrDefault(billboardGraphics._scale, time, defaultScale);
            billboard.rotation = Property.getValueOrDefault(billboardGraphics._rotation, time, defaultRotation);
            billboard.alignedAxis = Property.getValueOrDefault(billboardGraphics._alignedAxis, time, defaultAlignedAxis);
            billboard.horizontalOrigin = Property.getValueOrDefault(billboardGraphics._horizontalOrigin, time, defaultHorizontalOrigin);
            billboard.verticalOrigin = Property.getValueOrDefault(billboardGraphics._verticalOrigin, time, defaultVerticalOrigin);
            billboard.width = Property.getValueOrUndefined(billboardGraphics._width, time);
            billboard.height = Property.getValueOrUndefined(billboardGraphics._height, time);
            billboard.scaleByDistance = Property.getValueOrUndefined(billboardGraphics._scaleByDistance, time, scaleByDistance);
            billboard.translucencyByDistance = Property.getValueOrUndefined(billboardGraphics._translucencyByDistance, time, translucencyByDistance);
            billboard.pixelOffsetScaleByDistance = Property.getValueOrUndefined(billboardGraphics._pixelOffsetScaleByDistance, time, pixelOffsetScaleByDistance);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    BillboardVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    BillboardVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(BillboardVisualizer.prototype._onCollectionChanged, this);
        var entities = this._entitiesToVisualize.values;
        var length = entities.length;
        for (var i = 0; i < length; i++) {
            entities[i]._billboardVisualizerIndex = undefined;
        }
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    BillboardVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var billboardCollection = this._billboardCollection;
        var unusedIndexes = this._unusedIndexes;
        var entities = this._entitiesToVisualize;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._billboard) && defined(entity._position)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._billboard) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                cleanEntity(entity, billboardCollection, unusedIndexes);
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            cleanEntity(entity, billboardCollection, unusedIndexes);
            entities.remove(entity.id);
        }
    };

    function cleanEntity(entity, collection, unusedIndexes) {
        var billboardVisualizerIndex = entity._billboardVisualizerIndex;
        if (defined(billboardVisualizerIndex)) {
            var billboard = collection.get(billboardVisualizerIndex);
            billboard.show = false;
            billboard.image = undefined;
            entity._billboardVisualizerIndex = undefined;
            unusedIndexes.push(billboardVisualizerIndex);
        }
    }

    return BillboardVisualizer;
});
