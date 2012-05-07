/*global define*/
define(['./DynamicTextureAtlas',
        'Scene/BillboardCollection',
        'Scene/HorizontalOrigin',
        'Scene/VerticalOrigin'],
        function(DynamicTextureAtlas,
                 BillboardCollection,
                 HorizontalOrigin,
                 VerticalOrigin) {
            "use strict";

            function CachedBillboard(id, visualizer) {
                this.visualizer = visualizer;
                this.positionProperty = undefined;
                this.colorProperty = undefined;
                this.eyeOffsetProperty = undefined;
                this.pixelOffsetProperty = undefined;
                this.scaleProperty = undefined;
                this.horizontalOriginProperty = undefined;
                this.verticalOriginProperty = undefined;
                this.textureProperty = undefined;
                this.textureAvailable = false;
                this.show = true;
                this.billboard = visualizer._billboardCollection.add();

                // Provide the ID, so picking the billboard can identify the object.
                this.billboard.id = id;
            }

            CachedBillboard.prototype.setShow = function(value) {
                this.show = value;
                this.billboard.setShow(value && this.textureAvailable);
            };

            CachedBillboard.prototype.setTexture = function(value) {
                if (typeof value !== 'undefined' && this.texture !== value) {
                    this.texture = value;
                    this.textureAvailable = false;
                    this.billboard.setShow(false);

                    var self = this;
                    this.visualizer._textureAtlas.addTextureFromUrl(value, function(imageIndex) {
                        self.textureAvailable = true;
                        self.billboard.setImageIndex(imageIndex);
                        self.billboard.setShow(self.show);
                    });
                }
            };

            function BillboardVisualizer(scene) {
                this._scene = scene;
                this._billboards = {};

                var billboardCollection = this._billboardCollection = new BillboardCollection();
                scene.getPrimitives().add(billboardCollection);

                this._textureAtlas = new DynamicTextureAtlas(scene.getContext(), function(atlas) {
                    billboardCollection.setTextureAtlas(atlas);
                });
            }

            BillboardVisualizer.prototype.update = function(time, czmlObjects) {
                for ( var i = 0, len = czmlObjects.length; i < len; i++) {
                    this.updateObject(time, czmlObjects[i]);
                }
            };

            BillboardVisualizer.prototype.updateObject = function(time, czmlObject) {
                var dynamicBillboard = czmlObject.billboard;
                if (dynamicBillboard !== 'undefined') {
                    var positionProperty = czmlObject.position;
                    if (typeof positionProperty === 'undefined') {
                        return;
                    }

                    var textureProperty = dynamicBillboard.image;
                    if (typeof textureProperty === 'undefined') {
                        return;
                    }

                    var showProperty = dynamicBillboard.show;
                    if (typeof showProperty === 'undefined') {
                        return;
                    }

                    var availability = czmlObject.availability, show = showProperty.getValue(time) === true && (typeof availability === 'undefined' || availability.getValue(time) === true), objectId = czmlObject.id, billboard = this._billboards[objectId], property;

                    if (typeof billboard !== 'undefined') {
                        billboard.setShow(show);
                    }

                    if (!show) {
                        //don't bother creating or updating anything else
                        return;
                    }

                    if (typeof billboard === 'undefined') {
                        billboard = this._billboards[objectId] = new CachedBillboard(objectId, this, property, time);
                    }

                    if (!positionProperty.cacheable || billboard.positionProperty !== positionProperty) {
                        billboard.positionProperty = positionProperty;
                        var position = positionProperty.getValue(time);
                        if (typeof position !== 'undefined') {
                            billboard.billboard.setPosition(position);
                        }
                    }

                    if (!textureProperty.cacheable || billboard.textureProperty !== textureProperty) {
                        billboard.textureProperty = textureProperty;
                        billboard.setTexture(textureProperty.getValue(time));
                    }

                    property = dynamicBillboard.color;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.colorProperty !== property)) {
                        billboard.colorProperty = property;
                        billboard.billboard.setColor(property.getValue(time));
                    }

                    property = dynamicBillboard.eyeOffset;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.eyeOffsetProperty !== property)) {
                        billboard.eyeOffsetProperty = property;
                        billboard.billboard.setEyeOffset(property.getValue(time));
                    }

                    property = dynamicBillboard.pixelOffset;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.pixelOffsetProperty !== property)) {
                        billboard.pixelOffsetProperty = property;
                        billboard.billboard.setPixelOffset(property.getValue(time));
                    }

                    property = dynamicBillboard.scale;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.scaleProperty !== property)) {
                        billboard.scaleProperty = property;
                        billboard.billboard.setScale(property.getValue(time));
                    }

                    property = dynamicBillboard.horizontalOrigin;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.horizontalOriginProperty !== property)) {
                        billboard.horizontalOriginProperty = property;
                        billboard.billboard.setHorizontalOrigin(HorizontalOrigin[property.getValue(time)]);
                    }

                    property = dynamicBillboard.verticalOrigin;
                    if (typeof property !== 'undefined' && (!property.cacheable || billboard.verticalOriginProperty !== property)) {
                        billboard.verticalOriginProperty = property;
                        billboard.billboard.setVerticalOrigin(VerticalOrigin[property.getValue(time)]);
                    }
                }
            };

            BillboardVisualizer.prototype.remove = function() {
                this._billboardCollection.removeAll();
                this._billboards = {};
            };

            return BillboardVisualizer;
        });
