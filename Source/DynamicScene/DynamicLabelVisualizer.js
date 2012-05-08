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
    function Label(id, visualizer) {
        this.visualizer = visualizer;
        this.positionProperty = undefined;
        this.eyeOffsetProperty = undefined;
        this.pixelOffsetProperty = undefined;
        this.scaleProperty = undefined;
        this.horizontalOriginProperty = undefined;
        this.verticalOriginProperty = undefined;
        this.textProperty = undefined;
        this.fillColorProperty = undefined;
        this.fontProperty = undefined;
        this.outlineColorProperty = undefined;
        this.styleProperty = undefined;
        this.label = visualizer._labelCollection.add();

        // Provide the ID, so picking the label can identify the object.
        this.label.id = id;
    }

    function LabelVisualizer(scene) {
        this._scene = scene;
        this._labels = {};

        var labelCollection = this._labelCollection = new LabelCollection();
        scene.getPrimitives().add(labelCollection);
    }

    LabelVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    LabelVisualizer.prototype.updateObject = function(time, czmlObject) {
        var czmlLabel = czmlObject.label;
        if (typeof czmlLabel === 'undefined') {
            return;
        }

        var textProperty = czmlLabel.text;
        if (typeof textProperty === 'undefined') {
            return;
        }

        var positionProperty = czmlObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var showProperty = czmlLabel.show;
        if (typeof showProperty === 'undefined') {
            return;
        }

        var availability = czmlObject.availability, show = showProperty.getValue(time) === true && (typeof availability === 'undefined' || availability.getValue(time) === true), objectId = czmlObject.id, label = this._labels[objectId], property;

        if (typeof label !== 'undefined') {
            label.label.setShow(show);
        }

        if (!show) {
            //don't bother creating or updating anything else
            return;
        }

        if (typeof label === 'undefined') {
            label = this._labels[objectId] = new Label(objectId, this, time);
        }

        if (!textProperty.cacheable || label.textProperty !== textProperty) {
            label.textProperty = textProperty;
            label.label.setText(textProperty.getValue(time));
        }

        if (!positionProperty.cacheable || label.positionProperty !== positionProperty) {
            label.positionProperty = positionProperty;
            var position = positionProperty.getValue(time);
            if (typeof position !== 'undefined') {
                label.label.setPosition(position);
            }
        }

        property = czmlLabel.scale;
        if (typeof property !== 'undefined' && (!property.cacheable || label.scaleProperty !== property)) {
            label.scaleProperty = property;
            label.label.setScale(property.getValue(time));
        }

        property = czmlLabel.font;
        if (typeof property !== 'undefined' && (!property.cacheable || label.fontProperty !== property)) {
            label.fontProperty = property;
            label.label.setFont(property.getValue(time));
        }

        property = czmlLabel.fillColor;
        if (typeof property !== 'undefined' && (!property.cacheable || label.fillColorProperty !== property)) {
            label.fillColorProperty = property;
            label.label.setFillColor(property.getValue(time));
        }

        property = czmlLabel.outlineColor;
        if (typeof property !== 'undefined' && (!property.cacheable || label.outlineColorProperty !== property)) {
            label.outlineColorProperty = property;
            label.label.setOutlineColor(property.getValue(time));
        }

        property = czmlLabel.style;
        if (typeof property !== 'undefined' && (!property.cacheable || label.styleProperty !== property)) {
            label.styleProperty = property;
            label.label.setStyle(LabelStyle[property.getValue(time)]);
        }

        property = czmlLabel.pixelOffset;
        if (typeof property !== 'undefined' && (!property.cacheable || label.pixelOffsetProperty !== property)) {
            label.pixelOffsetProperty = property;
            label.label.setPixelOffset(property.getValue(time));
        }

        property = czmlLabel.eyeOffset;
        if (typeof property !== 'undefined' && (!property.cacheable || label.eyeOffsetProperty !== property)) {
            label.eyeOffsetProperty = property;
            label.label.seteyeOffset(property.getValue(time));
        }

        property = czmlLabel.horizontalOrigin;
        if (typeof property !== 'undefined' && (!property.cacheable || label.horizontalOriginProperty !== property)) {
            label.horizontalOriginProperty = property;
            label.label.setHorizontalOrigin(HorizontalOrigin[property.getValue(time)]);
        }

        property = czmlLabel.verticalOrigin;
        if (typeof property !== 'undefined' && (!property.cacheable || label.verticalOriginProperty !== property)) {
            label.verticalOriginProperty = property;
            label.label.setVerticalOrigin(VerticalOrigin[property.getValue(time)]);
        }
    };

    LabelVisualizer.prototype.remove = function() {
        this._labelCollection.removeAll();
        this._labels = {};
    };

    return LabelVisualizer;
});