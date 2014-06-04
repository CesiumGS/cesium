/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/BillboardCollection',
        '../Scene/TextureAtlas',
        '../Scene/TextureAtlasBuilder'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        BillboardCollection,
        TextureAtlas,
        TextureAtlasBuilder) {
    "use strict";

    /**
     * A {@link Visualizer} which maps {@link DynamicObject#point} to a {@link Billboard}.
     * @alias DynamicPointVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamicObjectCollection to visualize.
     */
    var DynamicPointVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        //>>includeEnd('debug');

        dynamicObjectCollection.collectionChanged.addEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved, this);

        var atlas = new TextureAtlas({
            scene : scene
        });
        var billboardCollection = new BillboardCollection();
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);

        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._textureAtlas = atlas;
        this._billboardCollection = billboardCollection;
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
    };

    /**
     * Updates the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    DynamicPointVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for (var i = 0, len = dynamicObjects.length; i < len; i++) {
            updateObject(this, time, dynamicObjects[i]);
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    DynamicPointVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    DynamicPointVisualizer.prototype.destroy = function() {
        var dynamicObjectCollection = this._dynamicObjectCollection;
        var dynamicObjects = dynamicObjectCollection.getObjects();
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i]._pointVisualizerIndex = undefined;
        }
        dynamicObjectCollection.collectionChanged.removeEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved, this);
        this._scene.primitives.remove(this._billboardCollection);
        return destroyObject(this);
    };

    var color;
    var position;
    var outlineColor;
    var scaleByDistance;
    function updateObject(dynamicPointVisualizer, time, dynamicObject) {
        var dynamicPoint = dynamicObject._point;
        if (!defined(dynamicPoint)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var billboard;
        var showProperty = dynamicPoint._show;
        var pointVisualizerIndex = dynamicObject._pointVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pointVisualizerIndex)) {
                billboard = dynamicPointVisualizer._billboardCollection.get(pointVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                dynamicObject._pointVisualizerIndex = undefined;
                dynamicPointVisualizer._unusedIndexes.push(pointVisualizerIndex);
            }
            return;
        }

        var needRedraw = false;
        if (!defined(pointVisualizerIndex)) {
            var unusedIndexes = dynamicPointVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pointVisualizerIndex = unusedIndexes.pop();
                billboard = dynamicPointVisualizer._billboardCollection.get(pointVisualizerIndex);
            } else {
                pointVisualizerIndex = dynamicPointVisualizer._billboardCollection.length;
                billboard = dynamicPointVisualizer._billboardCollection.add();
            }
            dynamicObject._pointVisualizerIndex = pointVisualizerIndex;
            billboard.id = dynamicObject;

            billboard._visualizerColor = Color.clone(Color.WHITE, billboard._visualizerColor);
            billboard._visualizerOutlineColor = Color.clone(Color.BLACK, billboard._visualizerOutlineColor);
            billboard._visualizerOutlineWidth = 0;
            billboard._visualizerPixelSize = 1;
            needRedraw = true;
        } else {
            billboard = dynamicPointVisualizer._billboardCollection.get(pointVisualizerIndex);
        }

        billboard.show = true;

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.position = position;
        }

        var property = dynamicPoint._color;
        if (defined(property)) {
            color = property.getValue(time, color);
            if (!Color.equals(billboard._visualizerColor, color)) {
                Color.clone(color, billboard._visualizerColor);
                needRedraw = true;
            }
        }

        property = dynamicPoint._outlineColor;
        if (defined(property)) {
            outlineColor = property.getValue(time, outlineColor);
            if (!Color.equals(billboard._visualizerOutlineColor, outlineColor)) {
                Color.clone(outlineColor, billboard._visualizerOutlineColor);
                needRedraw = true;
            }
        }

        property = dynamicPoint._outlineWidth;
        if (defined(property)) {
            var outlineWidth = property.getValue(time);
            if (billboard._visualizerOutlineWidth !== outlineWidth) {
                billboard._visualizerOutlineWidth = outlineWidth;
                needRedraw = true;
            }
        }

        property = dynamicPoint._pixelSize;
        if (defined(property)) {
            var pixelSize = property.getValue(time);
            if (billboard._visualizerPixelSize !== pixelSize) {
                billboard._visualizerPixelSize = pixelSize;
                needRedraw = true;
            }
        }

        property = dynamicPoint._scaleByDistance;
        if (defined(property)) {
            scaleByDistance = property.getValue(time, scaleByDistance);
            if (defined(scaleByDistance)) {
                billboard.scaleByDistance = scaleByDistance;
            }
        }

        if (needRedraw) {
            var centerColor = defaultValue(billboard._visualizerColor, Color.WHITE);
            var centerAlpha = centerColor.alpha;
            var cssColor = centerColor.toCssColorString();
            var cssOutlineColor = defaultValue(billboard._visualizerOutlineColor, Color.BLACK).toCssColorString();
            var cssPixelSize = defaultValue(billboard._visualizerPixelSize, 3);
            var cssOutlineWidth = defaultValue(billboard._visualizerOutlineWidth, 2);
            var textureId = JSON.stringify([cssColor, cssPixelSize, cssOutlineColor, cssOutlineWidth]);

            dynamicPointVisualizer._textureAtlasBuilder.addTextureFromFunction(textureId, function(id, loadedCallback) {
                var canvas = document.createElement('canvas');

                var length = cssPixelSize + (2 * cssOutlineWidth);
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
                        context2D.arc(length / 2, length / 2, cssPixelSize / 2, 0, 2 * Math.PI, true);
                        context2D.closePath();
                        context2D.fillStyle = 'black';
                        context2D.fill();
                        context2D.restore();
                    }
                }

                context2D.beginPath();
                context2D.arc(length / 2, length / 2, cssPixelSize / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssColor;
                context2D.fill();

                loadedCallback(canvas);
            }, function(imageIndex) {
                billboard.imageIndex = imageIndex;
            });
        }
    }

    DynamicPointVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for (var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pointVisualizerIndex = dynamicObject._pointVisualizerIndex;
            if (defined(pointVisualizerIndex)) {
                var billboard = thisBillboardCollection.get(pointVisualizerIndex);
                billboard.show = false;
                billboard.imageIndex = -1;
                dynamicObject._pointVisualizerIndex = undefined;
                thisUnusedIndexes.push(pointVisualizerIndex);
            }
        }
    };

    return DynamicPointVisualizer;
});
