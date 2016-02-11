/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/PointPrimitiveCollection',
        './BoundingSphereState',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        PointPrimitiveCollection,
        BoundingSphereState,
        Property) {
    'use strict';

    var defaultColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 0.0;
    var defaultPixelSize = 1.0;

    var color = new Color();
    var position = new Cartesian3();
    var outlineColor = new Color();
    var scaleByDistance = new NearFarScalar();
    var translucencyByDistance = new NearFarScalar();

    function EntityData(entity) {
        this.entity = entity;
        this.pointPrimitive = undefined;
        this.color = undefined;
        this.outlineColor = undefined;
        this.pixelSize = undefined;
        this.outlineWidth = undefined;
    }

    /**
     * A {@link Visualizer} which maps {@link Entity#point} to a {@link PointPrimitive}.
     * @alias PointVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    function PointVisualizer(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(PointVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._entityCollection = entityCollection;
        this._pointPrimitiveCollection = undefined;
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
    PointVisualizer.prototype.update = function(time) {
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
            var pointGraphics = entity._point;
            var pointPrimitive = item.pointPrimitive;
            var show = entity.isShowing && entity.isAvailable(time) && Property.getValueOrDefault(pointGraphics._show, time, true);
            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                show = defined(position);
            }
            if (!show) {
                returnPointPrimitive(item, unusedIndexes);
                continue;
            }

            if (!defined(pointPrimitive)) {
                var pointPrimitiveCollection = this._pointPrimitiveCollection;
                if (!defined(pointPrimitiveCollection)) {
                    pointPrimitiveCollection = new PointPrimitiveCollection();
                    this._pointPrimitiveCollection = pointPrimitiveCollection;
                    this._scene.primitives.add(pointPrimitiveCollection);
                }

                var length = unusedIndexes.length;
                if (length > 0) {
                    pointPrimitive = pointPrimitiveCollection.get(unusedIndexes.pop());
                } else {
                    pointPrimitive = pointPrimitiveCollection.add();
                }

                pointPrimitive.id = entity;
                item.pointPrimitive = pointPrimitive;
            }

            pointPrimitive.show = true;
            pointPrimitive.position = position;
            pointPrimitive.scaleByDistance = Property.getValueOrUndefined(pointGraphics._scaleByDistance, time, scaleByDistance);
            pointPrimitive.translucencyByDistance = Property.getValueOrUndefined(pointGraphics._translucencyByDistance, time, translucencyByDistance);
            pointPrimitive.color = Property.getValueOrDefault(pointGraphics._color, time, defaultColor, color);
            pointPrimitive.outlineColor = Property.getValueOrDefault(pointGraphics._outlineColor, time, defaultOutlineColor, outlineColor);
            pointPrimitive.outlineWidth = Property.getValueOrDefault(pointGraphics._outlineWidth, time, defaultOutlineWidth);
            pointPrimitive.pixelSize = Property.getValueOrDefault(pointGraphics._pixelSize, time, defaultPixelSize);
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
    PointVisualizer.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var item = this._items.get(entity.id);
        if (!defined(item) || !defined(item.pointPrimitive)) {
            return BoundingSphereState.FAILED;
        }

        result.center = Cartesian3.clone(item.pointPrimitive.position, result.center);
        result.radius = 0;
        return BoundingSphereState.DONE;
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
        this._entityCollection.collectionChanged.removeEventListener(PointVisualizer.prototype._onCollectionChanged, this);
        if (defined(this._pointPrimitiveCollection)) {
            this._scene.primitives.remove(this._pointPrimitiveCollection);
        }
        return destroyObject(this);
    };

    PointVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var unusedIndexes = this._unusedIndexes;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._point) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._point) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                returnPointPrimitive(items.get(entity.id), unusedIndexes);
                items.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            returnPointPrimitive(items.get(entity.id), unusedIndexes);
            items.remove(entity.id);
        }
    };

    function returnPointPrimitive(item, unusedIndexes) {
        if (defined(item)) {
            var pointPrimitive = item.pointPrimitive;
            if (defined(pointPrimitive)) {
                item.pointPrimitive = undefined;
                pointPrimitive.show = false;
                unusedIndexes.push(pointPrimitive._index);
            }
        }
    }

    return PointVisualizer;
});
