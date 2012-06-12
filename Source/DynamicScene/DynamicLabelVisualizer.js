/*global define*/
define([
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        Color,
        Cartesian2,
        Cartesian3,
        LabelCollection,
        LabelStyle,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    function DynamicLabelVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var labelCollection = this._labelCollection = new LabelCollection();
        scene.getPrimitives().add(labelCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicLabelVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicLabelVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicLabelVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicLabelVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicLabelVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicLabelVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicLabelVisualizer.prototype.updateObject = function(time, dynamicObject) {
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
        var objectId = dynamicObject.id;
        var showProperty = dynamicLabel.show;
        var labelVisualizerIndex = dynamicObject.labelVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof labelVisualizerIndex !== 'undefined') {
                label = this._labelCollection.get(labelVisualizerIndex);
                label.setShow(false);
                this._unusedIndexes.push(labelVisualizerIndex);
                dynamicObject.labelVisualizerIndex = undefined;
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
            dynamicObject.labelVisualizerIndex = labelVisualizerIndex;
            label.id = objectId;

            // CZML_TODO Determine official defaults
            label.setText('');
            label.setScale(1.0);
            label.setFont('30px sans-serif');
            label.setFillColor(Color.WHITE);
            label.setOutlineColor(Color.BLACK);
            label.setStyle(LabelStyle.FILL);
            label.setPixelOffset(Cartesian2.ZERO);
            label.setEyeOffset(Cartesian3.ZERO);
            label.setHorizontalOrigin(HorizontalOrigin.CENTER);
            label.setVerticalOrigin(VerticalOrigin.CENTER);
        } else {
            label = this._labelCollection.get(labelVisualizerIndex);
        }

        label.setShow(show);

        var value = textProperty.getValue(time);
        if (typeof value !== 'undefined') {
            label.setText(value);
        }

        value = positionProperty.getValueCartesian(time);
        if (typeof value !== 'undefined') {
            label.setPosition(value);
        }

        var property = dynamicLabel.scale;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setScale(value);
            }
        }

        property = dynamicLabel.font;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setFont(value);
            }
        }

        property = dynamicLabel.fillColor;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setFillColor(value);
            }
        }

        property = dynamicLabel.outlineColor;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setOutlineColor(value);
            }
        }

        property = dynamicLabel.style;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setStyle(value);
            }
        }

        property = dynamicLabel.pixelOffset;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setPixelOffset(value);
            }
        }

        property = dynamicLabel.eyeOffset;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setEyeOffset(value);
            }
        }

        property = dynamicLabel.horizontalOrigin;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setHorizontalOrigin(value);
            }
        }

        property = dynamicLabel.verticalOrigin;
        if (typeof property !== 'undefined') {
            value = property.getValue(time);
            if (typeof value !== 'undefined') {
                label.setVerticalOrigin(value);
            }
        }
    };

    DynamicLabelVisualizer.prototype.removeAll = function() {
        this._unusedIndexes = [];
        this._labelCollection.removeAll();
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].labelVisualizerIndex = undefined;
        }
    };

    DynamicLabelVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisLabelCollection = this._labelCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var labelVisualizerIndex = dynamicObject.labelVisualizerIndex;
            if (typeof labelVisualizerIndex !== 'undefined') {
                var label = thisLabelCollection.get(labelVisualizerIndex);
                label.setShow(false);
                thisUnusedIndexes.push(labelVisualizerIndex);
                dynamicObject.labelVisualizerIndex = undefined;
            }
        }
    };

    return DynamicLabelVisualizer;
});