/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/BillboardCollection',
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
        BillboardCollection,
        BoundingSphereState,
        Property) {
    "use strict";

    var defaultColor = Color.WHITE;
    var defaultOutlineColor = Color.BLACK;
    var defaultOutlineWidth = 0.0;
    var defaultPixelSize = 1.0;

    var color = new Color();
    var position = new Cartesian3();
    var outlineColor = new Color();
    var scaleByDistance = new NearFarScalar();

    var EntityData = function(entity) {
        this.entity = entity;
        this.billboard = undefined;
        this.color = undefined;
        this.outlineColor = undefined;
        this.pixelSize = undefined;
        this.outlineWidth = undefined;
    };

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

        entityCollection.collectionChanged.addEventListener(PointVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._entityCollection = entityCollection;
        this._billboardCollection = undefined;
        this._items = new AssociativeArray();
        this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
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

        var items = this._items.values;
        var unusedIndexes = this._unusedIndexes;
        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var pointGraphics = entity._point;
            var billboard = item.billboard;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(pointGraphics._show, time, true);
            if (show) {
                position = Property.getValueOrUndefined(entity._position, time, position);
                show = defined(position);
            }
            if (!show) {
                returnBillboard(item, unusedIndexes);
                continue;
            }

            var init = false;
            var needRedraw = false;
            if (!defined(billboard)) {
                init = true;
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
                needRedraw = true;
            }

            billboard.show = true;
            billboard.position = position;
            billboard.scaleByDistance = Property.getValueOrUndefined(pointGraphics._scaleByDistance, time, scaleByDistance);

            var colorProperty = pointGraphics._color;
            var outlineColorProperty = pointGraphics._outlineColor;

            var newColor = Property.getValueOrDefault(colorProperty, time, defaultColor, color);
            var newOutlineColor = Property.getValueOrDefault(outlineColorProperty, time, defaultOutlineColor, outlineColor);
            var newOutlineWidth = Math.round(Property.getValueOrDefault(pointGraphics._outlineWidth, time, defaultOutlineWidth));
            var newPixelSize = Math.max(1, Math.round(Property.getValueOrDefault(pointGraphics._pixelSize, time, defaultPixelSize)));

            if (newOutlineWidth > 0) {
                billboard.scale = 1.0;
                needRedraw = needRedraw || //
                             newOutlineWidth !== item.outlineWidth || //
                             newPixelSize !== item.pixelSize || //
                             !Color.equals(newColor, item.color) || //
                             !Color.equals(newOutlineColor, item.outlineColor);
            } else {
                billboard.scale = newPixelSize / 50.0;
                newPixelSize = 50.0;
                needRedraw = needRedraw || //
                             newOutlineWidth !== item.outlineWidth || //
                             !Color.equals(newColor, item.color) || //
                             !Color.equals(newOutlineColor, item.outlineColor);
            }

            if (needRedraw) {
                item.color = Color.clone(newColor, item.color);
                item.outlineColor = Color.clone(newOutlineColor, item.outlineColor);
                item.pixelSize = newPixelSize;
                item.outlineWidth = newOutlineWidth;

                var centerAlpha = newColor.alpha;
                var cssColor = newColor.toCssColorString();
                var cssOutlineColor = newOutlineColor.toCssColorString();
                var textureId = JSON.stringify([cssColor, newPixelSize, cssOutlineColor, newOutlineWidth]);

                billboard.setImage(textureId, createCallback(centerAlpha, cssColor, cssOutlineColor, newOutlineWidth, newPixelSize));
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
    PointVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    PointVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(PointVisualizer.prototype._onCollectionChanged, this);
        if (defined(this._billboardCollection)) {
            this._scene.primitives.remove(this._billboardCollection);
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
                item.billboard = undefined;
                billboard.show = false;
                billboard.image = undefined;
                unusedIndexes.push(billboard._index);
            }
        }
    }

    function createCallback(centerAlpha, cssColor, cssOutlineColor, cssOutlineWidth, newPixelSize) {
        return function(id) {
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
        };
    }

    return PointVisualizer;
});
