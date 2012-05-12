/*global define document canvas*/
define(['./DynamicTextureAtlas',
        'Core/Color',
        'Scene/BillboardCollection'],
function(DynamicTextureAtlas,
         Color,
         BillboardCollection) {
    "use strict";

    //FIXME This class currently relies on storing data onto each CZML object
    //These objects may be transient and therefore storing data on them is bad.
    //We may need a slower "fallback" layer of storage in case the data doesn't exist.

    function DynamicPointVisualizer(scene) {
        this._scene = scene;
        this._unusedIndexes = [];

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        scene.getPrimitives().add(billboardCollection);

        this._textureAtlas = new DynamicTextureAtlas(scene.getContext(), function(atlas) {
            billboardCollection.setTextureAtlas(atlas);
        });
    }

    DynamicPointVisualizer.prototype.update = function(time, czmlObjects) {
        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            this.updateObject(time, czmlObjects[i]);
        }
    };

    DynamicPointVisualizer.prototype.updateObject = function(time, czmlObject) {
        var dynamicPoint = czmlObject.point;
        if (typeof dynamicPoint === 'undefined') {
            return;
        }

        var positionProperty = czmlObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var billboard;
        var objectId = czmlObject.id;
        var showProperty = dynamicPoint.show;
        var pointVisualizerIndex = czmlObject.pointVisualizerIndex;
        var show = typeof showProperty === 'undefined' || showProperty.getValue(time);

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pointVisualizerIndex !== 'undefined') {
                billboard = this._billboardCollection.get(pointVisualizerIndex);
                billboard.setShow(false);
                billboard.point_color = undefined;
                billboard.point_outlineColor = undefined;
                billboard.point_outlineWidth = undefined;
                billboard.point_pixelSize = undefined;
                czmlObject.pointVisualizerIndex = undefined;
                this._unusedIndexes.push(pointVisualizerIndex);
            }
            return;
        }

        var needRedraw = false;
        if (typeof pointVisualizerIndex === 'undefined') {
            needRedraw = true;
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pointVisualizerIndex = unusedIndexes.pop();
                billboard = this._billboardCollection.get(pointVisualizerIndex);
            } else {
                pointVisualizerIndex = this._billboardCollection.getLength();
                billboard = this._billboardCollection.add();
            }
            czmlObject.pointVisualizerIndex = pointVisualizerIndex;
            billboard.id = objectId;
        } else {
            billboard = this._billboardCollection.get(pointVisualizerIndex);
        }

        billboard.setShow(true);

        var position = positionProperty.getValueCartesian(time);
        if (position !== 'undefined') {
            billboard.setPosition(position);
        }

        var color;
        var property = dynamicPoint.color;
        if (typeof property !== 'undefined') {
            color = property.getValue(time);
            if (billboard.point_color !== color) {
                billboard.point_color = color;
                needRedraw = true;
            }
        }

        var outlineColor;
        property = dynamicPoint.outlineColor;
        if (typeof property !== 'undefined') {
            outlineColor = property.getValue(time);
            if (billboard.point_outlineColor !== outlineColor) {
                billboard.point_outlineColor = outlineColor;
                needRedraw = true;
            }
        }

        var outlineWidth;
        property = dynamicPoint.outlineWidth;
        if (typeof property !== 'undefined') {
            outlineWidth = property.getValue(time);
            if (billboard.point_outlineWidth !== outlineWidth) {
                billboard.point_outlineWidth = outlineWidth;
                needRedraw = true;
            }
        }

        var pixelSize;
        property = dynamicPoint.pixelSize;
        if (typeof property !== 'undefined') {
            pixelSize = property.getValue(time);
            if (billboard.point_pixelSize !== pixelSize) {
                billboard.point_pixelSize = pixelSize;
                needRedraw = true;
            }
        }

        if (needRedraw) {
            var cssColor = color ? color.toCSSColor() : "#FFFFFF";
            var cssOutlineColor = outlineColor ? outlineColor.toCSSColor() : "#000000";
            pixelSize = pixelSize || 3;
            outlineWidth = outlineWidth || 2;

            var textureId = JSON.stringify({
                color : cssColor,
                pixelSize : pixelSize,
                outlineColor : cssOutlineColor,
                outlineWidth : outlineWidth
            });

            this._textureAtlas.addTexture(textureId, function(loadedCallback) {
                var canvas = document.createElement("canvas");

                var length = pixelSize + (2 * outlineWidth);
                canvas.height = canvas.width = length;

                var context2D = canvas.getContext("2d");
                context2D.clearRect(0, 0, length, length);

                if (outlineWidth) {
                    context2D.beginPath();
                    context2D.arc(length / 2, length / 2, length / 2, 0, 2 * Math.PI, true);
                    context2D.closePath();
                    context2D.fillStyle = cssOutlineColor;
                    context2D.fill();
                }

                context2D.beginPath();
                context2D.arc(length / 2, length / 2, pixelSize / 2, 0, 2 * Math.PI, true);
                context2D.closePath();
                context2D.fillStyle = cssColor;
                context2D.fill();

                var imageData = context2D.getImageData(0, 0, canvas.width, canvas.height);
                var pixels = imageData.data;
                var limit = canvas.width * canvas.height * 4;
                for ( var i = 3; i < limit; i += 4) {
                    if (pixels[i] < 200) {
                        pixels[i] = 0;
                    }
                }

                loadedCallback(imageData);
            }, function(imageIndex) {
                billboard.setImageIndex(imageIndex);
            });
        }
    };

    DynamicPointVisualizer.prototype.removeAll = function(czmlObjects) {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();

        for ( var i = 0, len = czmlObjects.length; i < len; i++) {
            czmlObjects.pointVisualizerIndex = undefined;
        }
    };

    return DynamicPointVisualizer;
});