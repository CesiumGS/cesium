/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Ellipsoid',
        './HorizontalOrigin'
    ], function(
        Cartesian3,
        Cartographic,
        Color,
        defaultValue,
        defined,
        defineProperties,
        Ellipsoid,
        HorizontalOrigin) {
    'use strict';

    /**
     * A feature of a {@link Cesium3DTileset}.
     * <p>
     * Provides access to a feature's properties stored in the tile's batch table, as well
     * as the ability to show/hide a feature and change its highlight color via
     * {@link Cesium3DTileFeature#show} and {@link Cesium3DTileFeature#color}, respectively.
     * </p>
     * <p>
     * Modifications to a <code>Cesium3DTileFeature</code> object have the lifetime of the tile's
     * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
     * to free space in the cache for visible tiles, listen to the {@link Cesium3DTileset#tileUnload} event to save any
     * modifications. Also listen to the {@link Cesium3DTileset#tileVisible} event to reapply any modifications.
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
     *     if (feature instanceof Cesium.Cesium3DTileFeature) {
     *         var propertyNames = feature.getPropertyNames();
     *         var length = propertyNames.length;
     *         for (var i = 0; i < length; ++i) {
     *             var propertyName = propertyNames[i];
     *             console.log(propertyName + ': ' + feature.getProperty(propertyName));
     *         }
     *     }
     * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
     */
    function Cesium3DTileFeature(tileset, content, batchId, billboardCollection, labelCollection, polylineCollection) {
        this._content = content;
        this._billboardCollection = billboardCollection;
        this._labelCollection = labelCollection;
        this._polylineCollection = polylineCollection;

        this._batchId = batchId;
        this._color = undefined;  // for calling getColor
        this._billboardImage = undefined;
        this._billboardColor = undefined;
        this._billboardOutlineColor = undefined;
        this._billboardOutlineWidth = undefined;
        this._billboardSize = undefined;
        this._pointSize = undefined;
        this._pointColor = undefined;
        this._pointSize = undefined;
        this._pointOutlineColor = undefined;
        this._pointOutlineWidth = undefined;
        this._heightOffset = undefined;
    }

    var scratchCartographic = new Cartographic();

    defineProperties(Cesium3DTileFeature.prototype, {
        /**
         * Gets or sets if the feature will be shown. This is set for all features
         * when a style's show is evaluated.
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
                return this._content.batchTable.getShow(this._batchId);
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    var billboard = this._billboardCollection.get(this._batchId);
                    label.show = true;
                    billboard.show = true;
                } else {
                    this._content.batchTable.setShow(this._batchId, value);
                }
            }
        },

        /**
         * Gets or sets the highlight color multiplied with the feature's color.  When
         * this is white, the feature's color is not changed. This is set for all features
         * when a style's color is evaluated.
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

                if (!defined(this._color)) {
                    this._color = new Color();
                }
                return this._content.batchTable.getColor(this._batchId, this._color);
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.fillColor = value;
                    if (defined(this._polylineCollection)) {
                        var polyline = this._polylineCollection.get(this._batchId);
                        polyline.show = value.alpha > 0.0;
                    }
                } else {
                    this._content.batchTable.setColor(this._batchId, value);
                }
            }
        },

        pointColor : {
            get : function() {
                return this._pointColor;
            },
            set : function(value) {
                this._pointColor = Color.clone(value, this._pointColor);
            }
        },

        /**
         * Gets or sets the point size of this feature.
         * <p>
         * Only applied when the feature is a point feature and <code>image</code> is <code>undefined</code>.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Number}
         */
        pointSize : {
            get : function() {
                return this._pointSize;
            },
            set : function(value) {
                this._pointSize = value;
            }
        },

        pointOutlineColor : {
            get : function() {
                return this._pointOutlineColor;
            },
            set : function(value) {
                this._pointOutlineColor = Color.clone(value, this._pointColor);
            }
        },

        pointOutlineWidth : {
            get : function() {
                return this._pointOutlineWidth;
            },
            set : function(value) {
                this._pointOutlineWidth = value;
            }
        },

        /**
         * Gets or sets the outline color of this feature.
         * <p>
         * Only applied when the feature is a point feature. The outline will be applied to the point if
         * <code>image</code> is undefined or to the <code>text</code> when it is defined.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Color}
         */
        labelOutlineColor : {
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
                }
            }
        },

        /**
         * Gets or sets the outline width in pixels of this feature.
         * <p>
         * Only applied when the feature is a point feature. The outline width will be applied to the point if
         * <code>image</code> is undefined or to the <code>text</code> when it is defined.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Color}
         */
        labelOutlineWidth : {
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
                }
            }
        },

        /**
         * Gets or sets the font of this feature.
         * <p>
         * Only applied when the feature is a point feature and <code>text</code> is defined.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {String}
         */
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

        /**
         * Gets or sets the fill and outline style of this feature.
         * <p>
         * Only applied when the feature is a point feature and <code>text</code> is defined.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {LabelStyle}
         */
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

        /**
         * Gets or sets the text for this feature.
         * <p>
         * Only applied when the feature is a point feature.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {String}
         */
        labelText : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.text;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    if (!defined(value)) {
                        value = '';
                    }
                    var label = this._labelCollection.get(this._batchId);
                    label.text = value;

                    if (defined(value) && value !== '') {
                        var billboard = this._billboardCollection.get(this._batchId);
                        billboard.horizontalOrigin = HorizontalOrigin.RIGHT;
                        label.horizontalOrigin = HorizontalOrigin.LEFT;
                    }
                }
            }
        },

        backgroundColor : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.backgroundColor;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.backgroundColor = value;
                }
            }
        },

        backgroundPadding : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.backgroundPadding;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.backgroundPadding = value;
                }
            }
        },

        backgroundEnabled : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.showBackground;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.showBackground = value;
                }
            }
        },

        scaleByDistance : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.scaleByDistance;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.scaleByDistance = value;
                }
            }
        },

        translucencyByDistance : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.translucencyByDistance;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.translucencyByDistance = value;
                }
            }
        },

        distanceDisplayCondition : {
            get : function() {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    return label.distanceDisplayCondition;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._labelCollection)) {
                    var label = this._labelCollection.get(this._batchId);
                    label.distanceDisplayCondition = value;
                    if (defined(this._polylineCollection)) {
                        var polyline = this._polylineCollection.get(this._batchId);
                        polyline.distanceDisplayCondition = value;
                    }
                }
            }
        },

        heightOffset : {
            get : function() {
                return this._heightOffset;
            },
            set : function(value) {
                if (defined(this._billboardCollection)) {
                    var billboard = this._billboardCollection.get(this._batchId);
                    var label = this._labelCollection.get(this._batchId);
                    var line = this._polylineCollection.get(this._batchId);

                    var offset = defaultValue(this._heightOffset, 0.0);

                    // TODO: ellipsoid
                    var ellipsoid = Ellipsoid.WGS84;
                    var cart = ellipsoid.cartesianToCartographic(billboard.position, scratchCartographic);
                    cart.height = cart.height - offset + value;
                    var newPosition = ellipsoid.cartographicToCartesian(cart);

                    billboard.position = newPosition;
                    label.position = billboard.position;
                    line.positions = [line.positions[0], newPosition];
                }
                this._heightOffset = value;
            }
        },

        anchorLineEnabled : {
            get : function() {
                if (defined(this._polylineCollection)) {
                    var polyline = this._polylineCollection.get(this._batchId);
                    return polyline.show;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._polylineCollection)) {
                    var polyline = this._polylineCollection.get(this._batchId);
                    polyline.show = value;
                }
            }
        },

        /**
         * Gets or sets the color for the anchor line.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Color}
         *
         * @default {@link Color.WHITE}
         */
        anchorLineColor : {
            get : function() {
                if (defined(this._polylineCollection)) {
                    var polyline = this._polylineCollection.get(this._batchId);
                    return polyline.material.uniforms.color;
                }
                return undefined;
            },
            set : function(value) {
                if (defined(this._polylineCollection)) {
                    var polyline = this._polylineCollection.get(this._batchId);
                    polyline.material.uniforms.color = value;
                }
            }
        },

        /**
         * Gets or sets the image of this feature.
         * <p>
         * Only applied when the feature is a point feature.
         * </p>
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {String}
         */
        image : {
            get : function() {
                return this._billboardImage;
            },
            set : function(value) {
                this._billboardImage = value;
            }
        },

        /**
         * Gets the content of the tile containing the feature.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Cesium3DTileContent}
         *
         * @readonly
         * @private
         */
        content : {
            get : function() {
                return this._content;
            }
        },

        /**
         * Gets the tileset containing the feature.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Cesium3DTileset}
         *
         * @readonly
         */
        tileset : {
            get : function() {
                return this._content.tileset;
            }
        },

        /**
         * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
         * the tileset containing the feature.
         *
         * @memberof Cesium3DTileFeature.prototype
         *
         * @type {Cesium3DTileset}
         *
         * @readonly
         */
        primitive : {
            get : function() {
                return this._content.tileset;
            }
        }
    });

    Cesium3DTileFeature.prototype._setBillboardImage = function() {
        var billboardCollection = this._billboardCollection;
        if (!defined(billboardCollection)) {
            return;
        }

        var b = billboardCollection.get(this._batchId);

        if (defined(this._billboardImage) && this._billboardImage !== b.image) {
            b.image = this._billboardImage;
            return;
        }

        if (defined(this._billboardImage)) {
            return;
        }

        var newColor = this._pointColor;
        var newOutlineColor = this._pointOutlineColor;
        var newOutlineWidth = this._pointOutlineWidth;
        var newPointSize = this._pointSize;

        var currentColor = this._billboardColor;
        var currentOutlineColor = this._billboardOutlineColor;
        var currentOutlineWidth = this._billboardOutlineWidth;
        var currentPointSize = this._billboardSize;

        if (Color.equals(newColor, currentColor) && Color.equals(newOutlineColor, currentOutlineColor) &&
            newOutlineWidth === currentOutlineWidth && newPointSize === currentPointSize) {
            return;
        }

        this._billboardColor = Color.clone(newColor, this._billboardColor);
        this._billboardOutlineColor = Color.clone(newOutlineColor, this._billboardOutlineColor);
        this._billboardOutlineWidth = newOutlineWidth;
        this._billboardSize = newPointSize;

        var centerAlpha = newColor.alpha;
        var cssColor = newColor.toCssColorString();
        var cssOutlineColor = newOutlineColor.toCssColorString();
        var textureId = JSON.stringify([cssColor, newPointSize, cssOutlineColor, newOutlineWidth]);

        b.setImage(textureId, createCallback(centerAlpha, cssColor, cssOutlineColor, newOutlineWidth, newPointSize));
    };

    function createCallback(centerAlpha, cssColor, cssOutlineColor, cssOutlineWidth, newPixelSize) {
        return function() {
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
     * Returns whether the feature contains this property. This includes properties from this feature's
     * class and inherited classes when using a batch table hierarchy.
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/TileFormats/BatchTable#batch-table-hierarchy}
     *
     * @param {String} name The case-sensitive name of the property.
     * @returns {Boolean} Whether the feature contains this property.
     */
    Cesium3DTileFeature.prototype.hasProperty = function(name) {
        return this._content.batchTable.hasProperty(this._batchId, name);
    };

    /**
     * Returns an array of property names for the feature. This includes properties from this feature's
     * class and inherited classes when using a batch table hierarchy.
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/TileFormats/BatchTable#batch-table-hierarchy}
     *
     * @param {String[]} results An array into which to store the results.
     * @returns {String[]} The names of the feature's properties.
     */
    Cesium3DTileFeature.prototype.getPropertyNames = function(results) {
        return this._content.batchTable.getPropertyNames(this._batchId, results);
    };

    /**
     * Returns a copy of the value of the feature's property with the given name. This includes properties from this feature's
     * class and inherited classes when using a batch table hierarchy.
     *
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/TileFormats/BatchTable#batch-table-hierarchy}
     *
     * @param {String} name The case-sensitive name of the property.
     * @returns {*} The value of the property or <code>undefined</code> if the property does not exist.
     *
     * @example
     * // Display all the properties for a feature in the console log.
     * var propertyNames = feature.getPropertyNames();
     * var length = propertyNames.length;
     * for (var i = 0; i < length; ++i) {
     *     var propertyName = propertyNames[i];
     *     console.log(propertyName + ': ' + feature.getProperty(propertyName));
     * }
     */
    Cesium3DTileFeature.prototype.getProperty = function(name) {
        return this._content.batchTable.getProperty(this._batchId, name);
    };

    /**
     * Sets the value of the feature's property with the given name.
     * <p>
     * If a property with the given name doesn't exist, it is created.
     * </p>
     *
     * @param {String} name The case-sensitive name of the property.
     * @param {*} value The value of the property that will be copied.
     *
     * @exception {DeveloperError} Inherited batch table hierarchy property is read only.
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
     */
    Cesium3DTileFeature.prototype.setProperty = function(name, value) {
        this._content.batchTable.setProperty(this._batchId, name, value);

        // PERFORMANCE_IDEA: Probably overkill, but maybe only mark the tile dirty if the
        // property is in one of the style's expressions or - if it can be done quickly -
        // if the new property value changed the result of an expression.
        this._content.featurePropertiesDirty = true;
    };

    /**
     * Returns whether the feature's class name equals <code>className</code>. Unlike {@link Cesium3DTileFeature#isClass}
     * this function only checks the feature's exact class and not inherited classes.
     * <p>
     * This function returns <code>false</code> if no batch table hierarchy is present.
     * </p>
     *
     * @param {String} className The name to check against.
     * @returns {Boolean} Whether the feature's class name equals <code>className</code>
     *
     * @private
     */
    Cesium3DTileFeature.prototype.isExactClass = function(className) {
        return this._content.batchTable.isExactClass(this._batchId, className);
    };

    /**
     * Returns whether the feature's class or any inherited classes are named <code>className</code>.
     * <p>
     * This function returns <code>false</code> if no batch table hierarchy is present.
     * </p>
     *
     * @param {String} className The name to check against.
     * @returns {Boolean} Whether the feature's class or inherited classes are named <code>className</code>
     *
     * @private
     */
    Cesium3DTileFeature.prototype.isClass = function(className) {
        return this._content.batchTable.isClass(this._batchId, className);
    };

    /**
     * Returns the feature's class name.
     * <p>
     * This function returns <code>undefined</code> if no batch table hierarchy is present.
     * </p>
     *
     * @returns {String} The feature's class name.
     *
     * @private
     */
    Cesium3DTileFeature.prototype.getExactClassName = function() {
        return this._content.batchTable.getExactClassName(this._batchId);
    };

    return Cesium3DTileFeature;
});
