/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/TextureAtlas',
        '../Scene/TextureAtlasBuilder',
        '../Scene/VerticalOrigin',
        './Property'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        NearFarScalar,
        BillboardCollection,
        HorizontalOrigin,
        TextureAtlas,
        TextureAtlasBuilder,
        VerticalOrigin,
        Property) {
    "use strict";

    function textureReady(entity, billboardCollection, textureValue) {
        return function(imageIndex) {
            //By the time the texture was loaded, the billboard might already be
            //gone or have been assigned a different texture.  Look it up again
            //and check.
            var currentIndex = entity._billboardVisualizerIndex;
            if (defined(currentIndex)) {
                var cbBillboard = billboardCollection.get(currentIndex);
                if (cbBillboard._visualizerUrl === textureValue) {
                    cbBillboard._visualizerTextureAvailable = true;
                    cbBillboard.imageIndex = imageIndex;
                }
            }
        };
    }

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
        var atlas = new TextureAtlas({
            scene : scene
        });
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);
        entityCollection.collectionChanged.addEventListener(BillboardVisualizer.prototype._onObjectsRemoved, this);

        this._scene = scene;
        this._unusedIndexes = [];
        this._textureAtlas = atlas;
        this._billboardCollection = billboardCollection;
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
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

        position = Property.getValueOrUndefined(entity._position, time, position);
        var textureValue = Property.getValueOrUndefined(billboardGraphics._image, time);

        var billboard;
        var showProperty = billboardGraphics._show;
        var billboardVisualizerIndex = entity._billboardVisualizerIndex;
        var show = defined(position) && defined(textureValue) && entity.isAvailable(time) && (!defined(showProperty) || (showProperty.getValue(time) !== false));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(billboardVisualizerIndex)) {
                billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                billboard._visualizerUrl = undefined;
                billboard._visualizerTextureAvailable = false;
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
            billboard._visualizerUrl = undefined;
            billboard._visualizerTextureAvailable = false;
        } else {
            billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
        }

        if (textureValue !== billboard._visualizerUrl) {
            billboard._visualizerUrl = textureValue;
            billboard._visualizerTextureAvailable = false;
            billboardVisualizer._textureAtlasBuilder.addTextureFromUrl(textureValue, textureReady(entity, billboardVisualizer._billboardCollection, textureValue));
        }

        billboard.show = billboard._visualizerTextureAvailable;
        if (!billboard._visualizerTextureAvailable) {
            return;
        }

        billboard.position = position;
        billboard.color = defaultValue(Property.getValueOrUndefined(billboardGraphics._color, time, color), Color.WHITE);
        billboard.eyeOffset = defaultValue(Property.getValueOrUndefined(billboardGraphics._eyeOffset, time, eyeOffset), Cartesian3.ZERO);
        billboard.pixelOffset = defaultValue(Property.getValueOrUndefined(billboardGraphics._pixelOffset, time, pixelOffset), Cartesian2.ZERO);
        billboard.scale = defaultValue(Property.getValueOrUndefined(billboardGraphics._scale, time), 1.0);
        billboard.rotation = defaultValue(Property.getValueOrUndefined(billboardGraphics._rotation, time), 0);
        billboard.alignedAxis = defaultValue(Property.getValueOrUndefined(billboardGraphics._alignedAxis, time), Cartesian3.ZERO);
        billboard.horizontalOrigin = defaultValue(Property.getValueOrUndefined(billboardGraphics._horizontalOrigin, time), HorizontalOrigin.CENTER);
        billboard.verticalOrigin = defaultValue(Property.getValueOrUndefined(billboardGraphics._verticalOrigin, time), VerticalOrigin.CENTER);
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
                billboard.imageIndex = -1;
                billboard._visualizerUrl = undefined;
                billboard._visualizerTextureAvailable = false;
                entity._billboardVisualizerIndex = undefined;
                thisUnusedIndexes.push(billboardVisualizerIndex);
            }
        }
    };

    return BillboardVisualizer;
});
