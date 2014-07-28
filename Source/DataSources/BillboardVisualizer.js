/*global define*/
define([
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
        entityCollection.collectionChanged.addEventListener(BillboardVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._billboardCollection = billboardCollection;
        this._entityCollection = entityCollection;
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
    BillboardVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    BillboardVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(BillboardVisualizer.prototype._onObjectsRemoved, this);

        var entities = entityCollection.entities;
        var length = entities.length;
        for (var i = 0; i < length; i++) {
            entities[i]._billboardVisualizerIndex = undefined;
        }
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    var position = new Cartesian3();
    var color = new Color();
    var eyeOffset = new Cartesian3();
    var pixelOffset = new Cartesian2();
    var scaleByDistance = new NearFarScalar();
    var translucencyByDistance = new NearFarScalar();
    var pixelOffsetScaleByDistance = new NearFarScalar();
    function updateObject(billboardVisualizer, time, entity) {
        var billboardGraphics = entity._billboard;
        if (!defined(billboardGraphics)) {
            return;
        }

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
            if (defined(billboardVisualizerIndex)) {
                billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
                billboard.show = false;
                billboard.image = undefined;
                entity._billboardVisualizerIndex = undefined;
                billboardVisualizer._unusedIndexes.push(billboardVisualizerIndex);
            }
            return;
        }

        if (!defined(billboardVisualizerIndex)) {
            var unusedIndexes = billboardVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                billboardVisualizerIndex = unusedIndexes.pop();
                billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
            } else {
                billboardVisualizerIndex = billboardVisualizer._billboardCollection.length;
                billboard = billboardVisualizer._billboardCollection.add();
            }
            entity._billboardVisualizerIndex = billboardVisualizerIndex;
            billboard.id = entity;
            billboard.image = undefined;
        } else {
            billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
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

    BillboardVisualizer.prototype._onObjectsRemoved = function(entityCollection, added, entities) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = entities.length - 1; i > -1; i--) {
            var entity = entities[i];
            var billboardVisualizerIndex = entity._billboardVisualizerIndex;
            if (defined(billboardVisualizerIndex)) {
                var billboard = thisBillboardCollection.get(billboardVisualizerIndex);
                billboard.show = false;
                billboard.image = undefined;
                entity._billboardVisualizerIndex = undefined;
                thisUnusedIndexes.push(billboardVisualizerIndex);
            }
        }
    };

    return BillboardVisualizer;
});
