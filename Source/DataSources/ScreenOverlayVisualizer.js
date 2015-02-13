/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        './Property'
    ], function(
        AssociativeArray,
        Cartesian2,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        Property) {
    "use strict";

    var position = new Cartesian2();

    var EntityData = function(entity) {
        this.entity = entity;
        this.element = undefined;
    };

    /**
     * A {@link Visualizer} which maps {@link Entity#screenOverlay}.
     * @alias ScreenOverlayVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var ScreenOverlayVisualizer = function(scene, entityCollection, container) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(ScreenOverlayVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._entityCollection = entityCollection;
        this._container = container;
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
    ScreenOverlayVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var items = this._items.values;
        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var screenOverlay = entity._screenOverlay;
            var element = item.element;
            var show = entity.isAvailable(time) && Property.getValueOrDefault(screenOverlay._show, time, true);
            var html;
            if (show) {
                position = Property.getValueOrUndefined(screenOverlay._position, time, position);
                html = Property.getValueOrUndefined(screenOverlay._html);
                show = defined(position) && defined(html);
            }
            if (!show) {
                if (defined(item.element)) {
                    item.element.style.display = 'none';
                }
                continue;
            }

            if (!defined(element)) {
                element = document.createElement('div');
                this._container.appendChild(element);
                element.id = entity.id;
                element.style.position = 'absolute';
                item.element = element;
            }

        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    ScreenOverlayVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    ScreenOverlayVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(ScreenOverlayVisualizer.prototype._onCollectionChanged, this);
        return destroyObject(this);
    };

    ScreenOverlayVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._screenOverlay)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._screenOverlay)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                removeOverlay(this, items.get(entity.id));
                items.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            removeOverlay(this, items.get(entity.id));
            items.remove(entity.id);
        }
    };

    function removeOverlay(visalizer, item) {
        if (defined(item)) {
            var element = item.element;
            if (defined(element)) {
                visalizer._container.removeChild(element);
            }
        }
    }

    return ScreenOverlayVisualizer;
});
