/*global define document canvas*/
define(['../Renderer/TextureAtlas',
        '../Core/Color',
        '../Scene/BillboardCollection'],
function(TextureAtlas,
         Color,
         BillboardCollection) {
    "use strict";

    function DynamicPointVisualizer(scene, dynamicObjectCollection) {
        this._scene = scene;
        this._unusedIndexes = [];
        this._dynamicObjectCollection = undefined;

        var billboardCollection = this._billboardCollection = new BillboardCollection();
        var atlas = this._textureAtlas = new TextureAtlas(scene.getContext());
        billboardCollection.setTextureAtlas(atlas);
        scene.getPrimitives().add(billboardCollection);
        this.setDynamicObjectCollection(dynamicObjectCollection);
    }

    DynamicPointVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    DynamicPointVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    DynamicPointVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved);
                this.removeAll();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPointVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    DynamicPointVisualizer.prototype.update = function(time) {
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            this.updateObject(time, dynamicObjects[i]);
        }
    };

    DynamicPointVisualizer.prototype.updateObject = function(time, dynamicObject) {
        var dynamicPoint = dynamicObject.point;
        if (typeof dynamicPoint === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var billboard;
        var objectId = dynamicObject.id;
        var showProperty = dynamicPoint.show;
        var pointVisualizerIndex = dynamicObject.pointVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pointVisualizerIndex !== 'undefined') {
                billboard = this._billboardCollection.get(pointVisualizerIndex);
                billboard.setShow(false);
                billboard.point_color = undefined;
                billboard.point_outlineColor = undefined;
                billboard.point_outlineWidth = undefined;
                billboard.point_pixelSize = undefined;
                dynamicObject.pointVisualizerIndex = undefined;
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
            dynamicObject.pointVisualizerIndex = pointVisualizerIndex;
            billboard.id = objectId;

            // CZML_TODO Determine official defaults
            billboard.point_color = Color.WHITE;
            billboard.point_outlineColor = Color.BLACK;
            billboard.point_outlineWidth = 2;
            billboard.point_pixelSize = 3;
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
            var cssColor = color ? color.toCSSColor() : '#FFFFFF';
            var cssOutlineColor = outlineColor ? outlineColor.toCSSColor() : '#000000';
            pixelSize = pixelSize || 3;
            outlineWidth = outlineWidth || 2;

            var textureId = JSON.stringify({
                color : cssColor,
                pixelSize : pixelSize,
                outlineColor : cssOutlineColor,
                outlineWidth : outlineWidth
            });

            this._textureAtlas.addTextureFromFunction(textureId, function(id, loadedCallback) {
                var canvas = document.createElement('canvas');

                var length = pixelSize + (2 * outlineWidth);
                canvas.height = canvas.width = length;

                var context2D = canvas.getContext('2d');
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

    DynamicPointVisualizer.prototype.removeAll = function() {
        this._unusedIndexes = [];
        this._billboardCollection.removeAll();
        var dynamicObjects = this._dynamicObjectCollection.getObjects();
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            dynamicObjects[i].pointVisualizerIndex = undefined;
        }
    };

    DynamicPointVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisBillboardCollection = this._billboardCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var pointVisualizerIndex = dynamicObject.pointVisualizerIndex;
            if (typeof pointVisualizerIndex !== 'undefined') {
                var billboard = thisBillboardCollection.get(pointVisualizerIndex);
                billboard.setShow(false);
                billboard.point_color = undefined;
                billboard.point_outlineColor = undefined;
                billboard.point_outlineWidth = undefined;
                billboard.point_pixelSize = undefined;
                dynamicObject.pointVisualizerIndex = undefined;
                thisUnusedIndexes.push(pointVisualizerIndex);
            }
        }
    };

    return DynamicPointVisualizer;
});