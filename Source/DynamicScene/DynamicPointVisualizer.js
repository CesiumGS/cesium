/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/BillboardCollection',
        '../Renderer/TextureAtlasBuilder'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        BillboardCollection,
        TextureAtlasBuilder) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPoint instance
     * in DynamicObject.point to a Billboard primitive with a point texture.
     * @alias DynamicPointVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicPoint
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicPointVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;
        var billboardCollection = this._billboardCollection = new BillboardCollection();
        var atlas = this._textureAtlas = scene.context.createTextureAtlas();
        this._textureAtlasBuilder = new TextureAtlasBuilder(atlas);
        billboardCollection.textureAtlas = atlas;
        scene.primitives.add(billboardCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPointVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPointVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPointVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicPointVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicPointVisualizer.prototype.removeAllPrimitives = function() {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();
        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._pointVisualizerIndex = undefined;
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPointVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPointVisualizer#destroy
     */
    DynamicPointVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DynamicPointVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPointVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPointVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
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
                billboard.setShow(false);
                billboard.setImageIndex(-1);
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

            // CZML_TODO Determine official defaults
            billboard._visualizerColor = Color.clone(Color.WHITE, billboard._visualizerColor);
            billboard._visualizerOutlineColor = Color.clone(Color.BLACK, billboard._visualizerOutlineColor);
            billboard._visualizerOutlineWidth = 0;
            billboard._visualizerPixelSize = 1;
            needRedraw = true;
        } else {
            billboard = dynamicPointVisualizer._billboardCollection.get(pointVisualizerIndex);
        }

        billboard.setShow(true);

        position = positionProperty.getValue(time, position);
        if (defined(position)) {
            billboard.setPosition(position);
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
                billboard.setScaleByDistance(scaleByDistance);
            }
        }

        if (needRedraw) {
            var cssColor = defaultValue(billboard._visualizerColor, Color.WHITE).toCssColorString();
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
                }

                context2D.beginPath();
                context2D.arc(length / 2, length / 2, cssPixelSize / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssColor;
                context2D.fill();

                loadedCallback(canvas);
            }, function(imageIndex) {
                billboard.setImageIndex(imageIndex);
            });
        }
    }

    DynamicPointVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pointVisualizerIndex = dynamicObject._pointVisualizerIndex;
            if (defined(pointVisualizerIndex)) {
                var billboard = thisBillboardCollection.get(pointVisualizerIndex);
                billboard.setShow(false);
                billboard.setImageIndex(-1);
                dynamicObject._pointVisualizerIndex = undefined;
                thisUnusedIndexes.push(pointVisualizerIndex);
            }
        }
    };

    return DynamicPointVisualizer;
});
