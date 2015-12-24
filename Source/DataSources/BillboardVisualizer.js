/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/BoundingRectangle',
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
        './BoundingSphereState',
        './Property'
    ], function(
        AssociativeArray,
        BoundingRectangle,
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
        BoundingSphereState,
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
    var defaultSizeInMeters = false;

    var position = new Cartesian3();
    var color = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var scaleByDistance = new NearFarScalar();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();
    var boundingRectangle = new BoundingRectangle();

    function EntityData(entity) {
        this.entity = entity;
        this.billboard = undefined;
        this.textureValue = undefined;
    }

    /**
     * A {@link Visualizer} which maps {@link Entity#billboard} to a {@link Billboard}.
     * @alias BillboardVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    function BillboardVisualizer(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(BillboardVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._billboardCollection = undefined;
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
    BillboardVisualizer.prototype.update = function(time) {
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
            var billboardGraphics = entity._billboard;
            var textureValue;
            var billboard = item.billboard;
            var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(billboardGraphics._show, time, true);

            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                textureValue = Property.getValueOrUndefined(billboardGraphics._image, time);
                show = defined(position) && defined(textureValue);
            }

            if (!show) {
                //don't bother creating or updating anything else
                returnBillboard(item, unusedIndexes);
                continue;
            }

            if (!defined(billboard)) {
                var billboardCollection = this._billboardCollection;
                if (!defined(billboardCollection)) {
                    billboardCollection = new BillboardCollection();
                    this._billboardCollection = billboardCollection;
                    this._scene.primitives.add(billboardCollection);
                }

                var length = unusedIndexes.length;
                if (length > 0) {
                    billboard = billboardCollection.get(unusedIndexes.pop());
                } else {
                    billboard = billboardCollection.add();
                }

                billboard.id = entity;
                billboard.image = undefined;
                item.billboard = billboard;
            }

            billboard.show = show;
            if (item.textureValue !== textureValue) {
                billboard.image = textureValue;
                item.textureValue = textureValue;
            }
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
            billboard.sizeInMeters = Property.getValueOrDefault(billboardGraphics._sizeInMeters, defaultSizeInMeters);

            var subRegion = Property.getValueOrUndefined(billboardGraphics._imageSubRegion, time, boundingRectangle);
            if (defined(subRegion)) {
                billboard.setImageSubRegion(billboard._imageId, subRegion);
            }
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
    BillboardVisualizer.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var item = this._items.get(entity.id);
        if (!defined(item) || !defined(item.billboard)) {
            return BoundingSphereState.FAILED;
        }

        result.center = Cartesian3.clone(item.billboard.position, result.center);
        result.radius = 0;
        return BoundingSphereState.DONE;
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
        if (defined(this._billboardCollection)) {
            this._scene.primitives.remove(this._billboardCollection);
        }
        return destroyObject(this);
    };

    BillboardVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var unusedIndexes = this._unusedIndexes;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._billboard) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._billboard) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                returnBillboard(items.get(entity.id), unusedIndexes);
                items.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            returnBillboard(items.get(entity.id), unusedIndexes);
            items.remove(entity.id);
        }
    };

    function returnBillboard(item, unusedIndexes) {
        if (defined(item)) {
            var billboard = item.billboard;
            if (defined(billboard)) {
                item.textureValue = undefined;
                item.billboard = undefined;
                billboard.show = false;
                billboard.image = undefined;
                unusedIndexes.push(billboard._index);
            }
        }
    }

    return BillboardVisualizer;
});
