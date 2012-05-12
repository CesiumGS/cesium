/*global define*/
define([
        '../Scene/LabelCollection',
        '../Scene/LabelStyle',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin'
    ], function(
        LabelCollection,
        LabelStyle,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.

    function DynamicLabelVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];

        var labelCollection = this._labelCollection = new LabelCollection();
        scene.getPrimitives().add(labelCollection);
    }

    DynamicLabelVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicLabelVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicLabel = czmlObject.label;
        if (typeof dynamicLabel === 'undefined') {
            return;
        }

        var textProperty = dynamicLabel.text;
        if (typeof textProperty === 'undefined') {
            return;
        }

        var positionProperty = czmlObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var label;
        var objectId = czmlObject.id;
        var showProperty = dynamicLabel.show;
        var labelVisualizerIndex = czmlObject.labelVisualizerIndex;
        var show = typeof showProperty === 'undefined' || showProperty.getValue(time);

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof labelVisualizerIndex !== 'undefined') {
                label = this._labelCollection.get(labelVisualizerIndex);
                label.setShow(false);
                this._unusedIndexes.push(labelVisualizerIndex);
                czmlObject.labelVisualizerIndex = undefined;
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
            czmlObject.labelVisualizerIndex = labelVisualizerIndex;
            label.id = objectId;
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
            value = LabelStyle[property.getValue(time)];
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
            value = HorizontalOrigin[property.getValue(time)];
            if (typeof value !== 'undefined') {
                label.setHorizontalOrigin(value);
            }
        }

        property = dynamicLabel.verticalOrigin;
        if (typeof property !== 'undefined') {
            value = VerticalOrigin[property.getValue(time)];
            if (typeof value !== 'undefined') {
                label.setVerticalOrigin(value);
            }
        }
    };

    DynamicLabelVisualizer.prototype.removeAll = function(czmlObjects) {
        this._unusedIndexes = [];
        this._labelCollection.removeAll();

        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.labelVisualizerIndex = undefined;
        }
    };

    return DynamicLabelVisualizer;
});