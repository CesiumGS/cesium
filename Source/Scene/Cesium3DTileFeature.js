/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/defineProperties',
        './HorizontalOrigin'
    ], function(
        Color,
        defined,
        defineProperties,
        HorizontalOrigin) {
    'use strict';

    /**
     * Provides access to a feature's properties stored in the 3D tile's batch table, as well
     * as the ability to show/hide a feature and change its highlight color via
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color}, respectively.
     * <p>
     * Modifications to a <code>Cesium3DTileFeature</code> object have the lifetime of the tile's
     * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
     * to free space in the cache for visible tiles, listen to the DOC_TBA event to save any
     * modifications.
     * </p>
     * <p>
     * Do not construct this directly.  Access it through {@link Cesium3DTileContent#getFeature}
     * or picking using {@link Scene#pick} and {@link Scene#pickPosition}.
     * </p>
     *
     * @alias Cesium3DTileFeature
     * @constructor
     *
     * @example
     * // On mouse over, display all the properties for a feature in the console log.
     * handler.setInputAction(function(movement) {
     *     var feature = scene.pick(movement.endPosition);
     *     if (Cesium.defined(feature) && (feature.primitive === tileset)) {
     *         var properties = tileset.properties;
     *         if (Cesium.defined(properties)) {
     *             for (var name in properties) {
     *                 if (properties.hasOwnProperty(name)) {
     *                     console.log(name + ': ' + feature.getProperty(name));
     *                 }
     *             }
     *         }
     *     }
     * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
     */
    function Cesium3DTileFeature(tileset, content, batchId, billboardCollection, labelCollection) {
        this._content = content;
        this._batchTable = content.batchTable;
        this._billboardCollection = billboardCollection;
        this._labelCollection = labelCollection;
        this._batchId = batchId;
        this._color = undefined;  // for calling getColor

        this._billboardImage = undefined;
        this._billboardColor = undefined;
        this._billboardOutlineColor = undefined;
        this._billboardOutlineWidth = undefined;
        this._billboardSize = undefined;
        this._pointSize = undefined;

        /**
         * All objects returned by {@link Scene#pick} have a <code>primitive</code> property.
         *
         * @type {Cesium3DTileset}
         *
         * @private
         */
        this.primitive = tileset;
    }

    defineProperties(Cesium3DTileFeature.prototype, {
        /**
         * Gets and sets if the feature will be shown.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Boolean}
         *
         * @default true
         */
        show : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.show;
                }
                return this._batchTable.getShow(this._batchId);
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    var billboard = this._billboardCollection.get(this._batchId);
                    label.show = true;
                    billboard.show = true;
                } else {
                    this._batchTable.setShow(this._batchId, value);
                }
            }
        },

        /**
         * Gets and sets the highlight color multiplied with the feature's color.  When
         * this is white, the feature's color is not changed.
         * <p>
         * Only <code>red</code>, <code>green</code>, and <code>blue</code> components
         * are used; <code>alpha</code> is ignored.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Color}
         *
         * @default {@link Color.WHITE}
         */
        color : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.fillColor;
                }

                if (!this._color) {
                    this._color = new Color();
                }
                return this._batchTable.getColor(this._batchId, this._color);
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.fillColor = value;
                    setBillboardImage(this);
                } else {
                    this._batchTable.setColor(this._batchId, value);
                }
            }
        },

        pointSize : {
            get : function() {
                return this._pointSize;
            },
            set :function(value) {
                this._pointSize = value;
                if (defined(this._billboardCollection)) {
                    setBillboardImage(this);
                }
            }
        },

        outlineColor : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.outlineColor;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.outlineColor = value;
                    setBillboardImage(this);
                }
            }
        },

        outlineWidth : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.outlineWidth;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.outlineWidth = value;
                    setBillboardImage(this);
                }
            }
        },

        image : {
            get : function() {
                return this._billboardImage;
            },
            set : function(value) {
                this._billboardImage = value;
                if (defined(this._billboardCollection)) {
                    setBillboardImage(this);
                }
            }
        },

        font : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.font;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.font = value;
                }
            }
        },

        labelStyle : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.style;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.style = value;
                }
            }
        },

        text : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.text;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.text = value;

                    if (defined(value) && value !== '') {
                        var billboard = this._billboardCollection.get(this._batchId);
                        billboard.horizontalOrigin = HorizontalOrigin.RIGHT;
                        label.horizontalOrigin = HorizontalOrigin.LEFT;
                    }
                }
            }
        }
    });

    function setBillboardImage(feature) {
        var b = feature._billboardCollection.get(feature._batchId);

        if (defined(feature._billboardImage) && feature._billboardImage !== b.image) {
            b.image = feature._billboardImage;
            return;
        }

        if (defined(feature._billboardImage)) {
            return;
        }

        var label = feature._labelCollection.get(feature._batchId);
        var newColor = label.fillColor;
        var newOutlineColor = label.outlineColor;
        var newOutlineWidth = label.outlineWidth;
        var newPointSize = feature._pointSize;

        var currentColor = feature._billboardColor;
        var currentOutlineColor = feature._billboardOutlineColor;
        var currentOutlineWidth = feature._billboardOutlineWidth;
        var currentPointSize = feature._billboardSize;

        if (Color.equals(newColor, currentColor) && Color.equals(newOutlineColor, currentOutlineColor) &&
            newOutlineWidth === currentOutlineWidth && newPointSize === currentPointSize) {
            return;
        }

        var centerAlpha = newColor.alpha;
        var cssColor = newColor.toCssColorString();
        var cssOutlineColor = newOutlineColor.toCssColorString();
        var textureId = JSON.stringify([cssColor, newPointSize, cssOutlineColor, newOutlineWidth]);

        b.setImage(textureId, createCallback(centerAlpha, cssColor, cssOutlineColor, newOutlineWidth, newPointSize));
    }

    function createCallback(centerAlpha, cssColor, cssOutlineColor, cssOutlineWidth, newPixelSize) {
        return function(id) {
            var canvas = document.createElement('canvas');

            var length = newPixelSize + (2 * cssOutlineWidth);
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
                    context2D.arc(length / 2, length / 2, newPixelSize / 2, 0, 2 * Math.PI, true);
                    context2D.closePath();
                    context2D.fillStyle = 'black';
                    context2D.fill();
                    context2D.restore();
                }
            }

            context2D.beginPath();
            context2D.arc(length / 2, length / 2, newPixelSize / 2, 0, 2 * Math.PI, true);
            context2D.closePath();
            context2D.fillStyle = cssColor;
            context2D.fill();

            return canvas;
        };
    }

    /**
     * Returns an array of property names for the feature.
     * <p>
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color} are not equivalent to
     * <code>'show'</code> and <code>'color'</code> properties; the former are runtime-specific properties
     * that are not part of the feature's properties in the stored 3D Tileset.
     * </p>
     *
     * @returns {String[]} The names of the feature's properties.
     */
    Cesium3DTileFeature.prototype.getPropertyNames = function() {
        return this._batchTable.getPropertyNames();
    };

    /**
     * Returns the value of the feature's property with the given name.
     * <p>
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color} are not equivalent to
     * <code>'show'</code> and <code>'color'</code> properties; the former are runtime-specific properties
     * that are not part of the feature's properties in the stored 3D Tileset.
     * </p>
     *
     * @param {String} name The case-sensitive name of the property.
     * @returns {Any} The value of the property or <code>undefined</code> if the property does not exist.
     *
     * @example
     * // Display all the properties for a feature in the console log.
     * var names = feature.getPropertyNames();
     * for (var i = 0; i < names.length; ++i) {
     *     var name = names[i];
     *     console.log(name + ': ' + feature.getProperty(name));
     * }
     *
     * @see {Cesium3DTileset#properties}
     */
    Cesium3DTileFeature.prototype.getProperty = function(name) {
        return this._batchTable.getProperty(this._batchId, name);
    };

    /**
     * Sets the value of the feature's property with the given name.
     * <p>
     * If a property with the given name doesn't exist, it is created.
     * </p>
     * <p>
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color} are not equivalent to
     * <code>'show'</code> and <code>'color'</code> properties; the former are runtime-specific properties
     * that are not part of the feature's properties in the stored 3D Tileset.
     * </p>
     *
     * @param {String} name The case-sensitive name of the property.
     * @param {Any} value The value of the property that will be copied.
     *
     * @example
     * var height = feature.getProperty('Height'); // e.g., the height of a building
     *
     * @example
     * var name = 'clicked';
     * if (feature.getProperty(name)) {
     *     console.log('already clicked');
     * } else {
     *     feature.setProperty(name, true);
     *     console.log('first click');
     * }
     *
     * @see {Cesium3DTileset#properties}
     */
    Cesium3DTileFeature.prototype.setProperty = function(name, value) {
        this._batchTable.setProperty(this._batchId, name, value);

        // PERFORMANCE_IDEA: Probably overkill, but maybe only mark the tile dirty if the
        // property is in one of the style's expressions or - if it can be done quickly -
        // if the new property value changed the result of an expression.
        this._content.featurePropertiesDirty = true;
    };

    return Cesium3DTileFeature;
});