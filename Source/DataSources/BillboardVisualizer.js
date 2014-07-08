/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/BillboardCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/TextureAtlas',
        '../Scene/TextureAtlasBuilder',
        '../Scene/VerticalOrigin'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defined,
        destroyObject,
        DeveloperError,
        BillboardCollection,
        HorizontalOrigin,
        TextureAtlas,
        TextureAtlasBuilder,
        VerticalOrigin) {
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

    var position;
    var color;
    var eyeOffset;
    var pixelOffset;
    function updateObject(billboardVisualizer, time, entity) {
        var billboardGraphics = entity._billboard;
        if (!defined(billboardGraphics)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var textureProperty = billboardGraphics._image;
        if (!defined(textureProperty)) {
            return;
        }

        var billboard;
        var showProperty = billboardGraphics._show;
        var billboardVisualizerIndex = entity._billboardVisualizerIndex;
        var show = entity.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

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

            billboard.color = Color.WHITE;
            billboard.eyeOffset = Cartesian3.ZERO;
            billboard.pixelOffset = Cartesian2.ZERO;
            billboard.scale = 1.0;
            billboard.horizontalOrigin = HorizontalOrigin.CENTER;
            billboard.verticalOrigin = VerticalOrigin.CENTER;
        } else {
            billboard = billboardVisualizer._billboardCollection.get(billboardVisualizerIndex);
        }

        var textureValue = textureProperty.getValue(time);
        if (textureValue !== billboard._visualizerUrl) {
            billboard._visualizerUrl = textureValue;
            billboard._visualizerTextureAvailable = false;
            billboardVisualizer._textureAtlasBuilder.addTextureFromUrl(textureValue, textureReady(entity, billboardVisualizer._billboardCollection, textureValue));
        }

        billboard.show = billboard._visualizerTextureAvailable;
        if (!billboard._visualizerTextureAvailable) {
            return;
        }

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.position = position;
        }

        var property = billboardGraphics._color;

        if (defined(property)) {
            color = property.getValue(time, color);
            if (defined(color)) {
                billboard.color = color;
            }
        }

        property = billboardGraphics._eyeOffset;
        if (defined(property)) {
            eyeOffset = property.getValue(time, eyeOffset);
            if (defined(eyeOffset)) {
                billboard.eyeOffset = eyeOffset;
            }
        }

        property = billboardGraphics._pixelOffset;
        if (defined(property)) {
            pixelOffset = property.getValue(time, pixelOffset);
            if (defined(pixelOffset)) {
                billboard.pixelOffset = pixelOffset;
            }
        }

        property = billboardGraphics._scale;
        if (defined(property)) {
            var scale = property.getValue(time);
            if (defined(scale)) {
                billboard.scale = scale;
            }
        }

        property = billboardGraphics._rotation;
        if (defined(property)) {
            var rotation = property.getValue(time);
            if (defined(rotation)) {
                billboard.rotation = rotation;
            }
        }

        property = billboardGraphics._alignedAxis;
        if (defined(property)) {
            var alignedAxis = property.getValue(time);
            if (defined(alignedAxis)) {
                billboard.alignedAxis = alignedAxis;
            }
        }

        property = billboardGraphics._horizontalOrigin;
        if (defined(property)) {
            var horizontalOrigin = property.getValue(time);
            if (defined(horizontalOrigin)) {
                billboard.horizontalOrigin = horizontalOrigin;
            }
        }

        property = billboardGraphics._verticalOrigin;
        if (defined(property)) {
            var verticalOrigin = property.getValue(time);
            if (defined(verticalOrigin)) {
                billboard.verticalOrigin = verticalOrigin;
            }
        }

        property = billboardGraphics._width;
        if (defined(property)) {
            billboard.width = property.getValue(time);
        }

        property = billboardGraphics._height;
        if (defined(property)) {
            billboard.height = property.getValue(time);
        }

        property = billboardGraphics._scaleByDistance;
        if (defined(property)) {
            billboard.scaleByDistance = property.getValue(time);
        }

        property = billboardGraphics._translucencyByDistance;
        if (defined(property)) {
            billboard.translucencyByDistance = property.getValue(time);
        }

        property = billboardGraphics._pixelOffsetScaleByDistance;
        if (defined(property)) {
            billboard.pixelOffsetScaleByDistance = property.getValue(time);
        }
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
