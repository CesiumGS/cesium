/*global define*/
define(['Scene/LabelCollection',
        'Scene/LabelStyle',
        'Scene/HorizontalOrigin',
        'Scene/VerticalOrigin'],
function(LabelCollection,
         LabelStyle,
         HorizontalOrigin,
         VerticalOrigin) {
    "use strict";

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.

    function LabelVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];

        var labelCollection = this._labelCollection = new LabelCollection();
        scene.getPrimitives().add(labelCollection);
    }

    LabelVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    LabelVisualizer.prototype.updateObject = function(time, czmlObject) {
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
            var objectPool = this._unusedIndexes;
            var length = objectPool.length;
            if (length > 0) {
                labelVisualizerIndex = objectPool.pop();
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
        label.setText(textProperty.getValue(time));
        label.setPosition(positionProperty.getValue(time));

        var property = dynamicLabel.scale;
        if (typeof property !== 'undefined') {
            label.setScale(property.getValue(time));
        }

        property = dynamicLabel.font;
        if (typeof property !== 'undefined') {
            label.setFont(property.getValue(time));
        }

        property = dynamicLabel.fillColor;
        if (typeof property !== 'undefined') {
            label.setFillColor(property.getValue(time));
        }

        property = dynamicLabel.outlineColor;
        if (typeof property !== 'undefined') {
            label.setOutlineColor(property.getValue(time));
        }

        property = dynamicLabel.style;
        if (typeof property !== 'undefined') {
            label.setStyle(LabelStyle[property.getValue(time)]);
        }

        property = dynamicLabel.pixelOffset;
        if (typeof property !== 'undefined') {
            label.setPixelOffset(property.getValue(time));
        }

        property = dynamicLabel.eyeOffset;
        if (typeof property !== 'undefined') {
            label.setEyeOffset(property.getValue(time));
        }

        property = dynamicLabel.horizontalOrigin;
        if (typeof property !== 'undefined') {
            label.setHorizontalOrigin(HorizontalOrigin[property.getValue(time)]);
        }

        property = dynamicLabel.verticalOrigin;
        if (typeof property !== 'undefined') {
            label.setVerticalOrigin(VerticalOrigin[property.getValue(time)]);
        }
    };

    LabelVisualizer.prototype.removeAll = function(czmlObjects) {
        this._unusedIndexes = [];
        this._labelCollection.removeAll();

        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.labelVisualizerIndex = undefined;
        }
    };

    return LabelVisualizer;
});