/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        DeveloperError,
        destroyObject,
        Color,
        Cartesian2,
        Cartesian3,
        LabelCollection,
        LabelStyle,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicLabel instance
     * in DynamicObject.label to a Label primitive.
     * @alias DynamicLabelVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicLabel
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicPointVisualizer
     * @see DynamicPolygonVisualizer
     * @see DynamicPolylineVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicLabelVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var labelCollection = this._labelCollection = new LabelCollection();
        scene.getPrimitives().add(labelCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicLabelVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicLabelVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicLabelVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicLabelVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicLabelVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicLabelVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                this._updateObject(time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicLabelVisualizer.prototype.removeAllPrimitives = function() {
        this._unusedIndexes = [];
        this._labelCollection.removeAll();
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._labelVisualizerIndex = undefined;
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicLabelVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicLabelVisualizer#destroy
     */
    DynamicLabelVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicLabelVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicLabelVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicLabelVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        this._scene.getPrimitives().remove(this._labelCollection);
        return destroyObject(this);
    };

    var position;
    var fillColor;
    var outlineColor;
    var eyeOffset;
    var pixelOffset;
    DynamicLabelVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicLabel = dynamicObject.label;
        if (typeof dynamicLabel === 'undefined') {
            return;
        }

        var textProperty = dynamicLabel.text;
        if (typeof textProperty === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var label;
        var showProperty = dynamicLabel.show;
        var labelVisualizerIndex = dynamicObject._labelVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof labelVisualizerIndex !== 'undefined') {
                label = this._labelCollection.get(labelVisualizerIndex);
                label.setShow(false);
                this._unusedIndexes.push(labelVisualizerIndex);
                dynamicObject._labelVisualizerIndex = undefined;
            }
            return;
        }

        if (typeof labelVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                labelVisualizerIndex = unusedIndexes.pop();
                label = this._labelCollection.get(labelVisualizerIndex);
            } else {
                labelVisualizerIndex = this._labelCollection.getLength();
                label = this._labelCollection.add();
            }
            dynamicObject._labelVisualizerIndex = labelVisualizerIndex;
            label.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            label.setText('');
            label.setScale(1.0);
            label.setFont('30px sans-serif');
            label.setFillColor(Color.WHITE);
            label.setOutlineColor(Color.BLACK);
            label.setOutlineWidth(1);
            label.setStyle(LabelStyle.FILL);
            label.setPixelOffset(Cartesian2.ZERO);
            label.setEyeOffset(Cartesian3.ZERO);
            label.setHorizontalOrigin(HorizontalOrigin.CENTER);
            label.setVerticalOrigin(VerticalOrigin.CENTER);
        } else {
            label = this._labelCollection.get(labelVisualizerIndex);
        }

        label.setShow(show);

        var text = textProperty.getValue(time);
        if (typeof text !== 'undefined') {
            label.setText(text);
        }

        position = positionProperty.getValueCartesian(time, position);
        if (typeof position !== 'undefined') {
            label.setPosition(position);
        }

        var property = dynamicLabel.scale;
        if (typeof property !== 'undefined') {
            var scale = property.getValue(time);
            if (typeof scale !== 'undefined') {
                label.setScale(scale);
            }
        }

        property = dynamicLabel.font;
        if (typeof property !== 'undefined') {
            var font = property.getValue(time);
            if (typeof font !== 'undefined') {
                label.setFont(font);
            }
        }

        property = dynamicLabel.fillColor;
        if (typeof property !== 'undefined') {
            fillColor = property.getValue(time, fillColor);
            if (typeof fillColor !== 'undefined') {
                label.setFillColor(fillColor);
            }
        }

        property = dynamicLabel.outlineColor;
        if (typeof property !== 'undefined') {
            outlineColor = property.getValue(time, outlineColor);
            if (typeof outlineColor !== 'undefined') {
                label.setOutlineColor(outlineColor);
            }
        }

        property = dynamicLabel.outlineWidth;
        if (typeof property !== 'undefined') {
            var outlineWidth = property.getValue(time);
            if (typeof outlineWidth !== 'undefined') {
                label.setOutlineWidth(outlineWidth);
            }
        }

        property = dynamicLabel.style;
        if (typeof property !== 'undefined') {
            var style = property.getValue(time);
            if (typeof style !== 'undefined') {
                label.setStyle(style);
            }
        }

        property = dynamicLabel.pixelOffset;
        if (typeof property !== 'undefined') {
            pixelOffset = property.getValue(time, pixelOffset);
            if (typeof pixelOffset !== 'undefined') {
                label.setPixelOffset(pixelOffset);
            }
        }

        property = dynamicLabel.eyeOffset;
        if (typeof property !== 'undefined') {
            eyeOffset = property.getValue(time, eyeOffset);
            if (typeof eyeOffset !== 'undefined') {
                label.setEyeOffset(eyeOffset);
            }
        }

        property = dynamicLabel.horizontalOrigin;
        if (typeof property !== 'undefined') {
            var horizontalOrigin = property.getValue(time);
            if (typeof horizontalOrigin !== 'undefined') {
                label.setHorizontalOrigin(horizontalOrigin);
            }
        }

        property = dynamicLabel.verticalOrigin;
        if (typeof property !== 'undefined') {
            var verticalOrigin = property.getValue(time);
            if (typeof verticalOrigin !== 'undefined') {
                label.setVerticalOrigin(verticalOrigin);
            }
        }
    };

    DynamicLabelVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisLabelCollection = this._labelCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var labelVisualizerIndex = dynamicObject._labelVisualizerIndex;
            if (typeof labelVisualizerIndex !== 'undefined') {
                var label = thisLabelCollection.get(labelVisualizerIndex);
                label.setShow(false);
                thisUnusedIndexes.push(labelVisualizerIndex);
                dynamicObject._labelVisualizerIndex = undefined;
            }
        }
    };

    return DynamicLabelVisualizer;
});