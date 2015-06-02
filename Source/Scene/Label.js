/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/NearFarScalar',
        './Billboard',
        './HeightReference',
        './HorizontalOrigin',
        './LabelStyle',
        './VerticalOrigin'
    ], function(
        Cartesian2,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        NearFarScalar,
        Billboard,
        HeightReference,
        HorizontalOrigin,
        LabelStyle,
        VerticalOrigin) {
    "use strict";

    function rebindAllGlyphs(label) {
        if (!label._rebindAllGlyphs && !label._repositionAllGlyphs) {
            // only push label if it's not already been marked dirty
            label._labelCollection._labelsToUpdate.push(label);
        }
        label._rebindAllGlyphs = true;
    }

    function repositionAllGlyphs(label) {
        if (!label._rebindAllGlyphs && !label._repositionAllGlyphs) {
            // only push label if it's not already been marked dirty
            label._labelCollection._labelsToUpdate.push(label);
        }
        label._repositionAllGlyphs = true;
    }

    /**
     * A Label draws viewport-aligned text positioned in the 3D scene.  This constructor
     * should not be used directly, instead create labels by calling {@link LabelCollection#add}.
     *
     * @alias Label
     * @internalConstructor
     *
     * @exception {DeveloperError} translucencyByDistance.far must be greater than translucencyByDistance.near
     * @exception {DeveloperError} pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near
     *
     * @see LabelCollection
     * @see LabelCollection#add
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
     */
    var Label = function(options, labelCollection) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (defined(options.translucencyByDistance) && options.translucencyByDistance.far <= options.translucencyByDistance.near) {
            throw new DeveloperError('translucencyByDistance.far must be greater than translucencyByDistance.near.');
        }
        if (defined(options.pixelOffsetScaleByDistance) && options.pixelOffsetScaleByDistance.far <= options.pixelOffsetScaleByDistance.near) {
            throw new DeveloperError('pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near.');
        }
        //>>includeEnd('debug');

        this._text = defaultValue(options.text, '');
        this._show = defaultValue(options.show, true);
        this._font = defaultValue(options.font, '30px sans-serif');
        this._fillColor = Color.clone(defaultValue(options.fillColor, Color.WHITE));
        this._outlineColor = Color.clone(defaultValue(options.outlineColor, Color.BLACK));
        this._outlineWidth = defaultValue(options.outlineWidth, 1.0);
        this._style = defaultValue(options.style, LabelStyle.FILL);
        this._verticalOrigin = defaultValue(options.verticalOrigin, VerticalOrigin.BOTTOM);
        this._horizontalOrigin = defaultValue(options.horizontalOrigin, HorizontalOrigin.LEFT);
        this._pixelOffset = Cartesian2.clone(defaultValue(options.pixelOffset, Cartesian2.ZERO));
        this._eyeOffset = Cartesian3.clone(defaultValue(options.eyeOffset, Cartesian3.ZERO));
        this._position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this._scale = defaultValue(options.scale, 1.0);
        this._id = options.id;
        this._translucencyByDistance = options.translucencyByDistance;
        this._pixelOffsetScaleByDistance = options.pixelOffsetScaleByDistance;
        this._heightReference = defaultValue(options.heightReference, HeightReference.NONE);

        this._labelCollection = labelCollection;
        this._glyphs = [];

        this._rebindAllGlyphs = true;
        this._repositionAllGlyphs = true;

        this._actualClampedPosition = undefined;
        this._removeCallbackFunc = undefined;
        this._mode = undefined;

        this._updateClamping();
    };

    defineProperties(Label.prototype, {
        /**
         * Determines if this label will be shown.  Use this to hide or show a label, instead
         * of removing it and re-adding it to the collection.
         * @memberof Label.prototype
         * @type {Boolean}
         */
        show : {
            get : function() {
                return this._show;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._show !== value) {
                    this._show = value;

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.show = value;
                        }
                    }
                }
            }
        },

        /**
         * Gets or sets the Cartesian position of this label.
         * @memberof Label.prototype
         * @type {Cartesian3}
         */
        position : {
            get : function() {
                return this._position;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var position = this._position;
                if (!Cartesian3.equals(position, value)) {
                    Cartesian3.clone(value, position);

                    if (this._heightReference === HeightReference.NONE) {
                        var glyphs = this._glyphs;
                        for (var i = 0, len = glyphs.length; i < len; i++) {
                            var glyph = glyphs[i];
                            if (defined(glyph.billboard)) {
                                glyph.billboard.position = value;
                            }
                        }
                    } else {
                        this._updateClamping();
                    }
                }
            }
        },

        /**
         * Gets or sets the height reference of this billboard.
         * @memberof Label.prototype
         * @type {HeightReference}
         */
        heightReference : {
            get : function() {
                return this._heightReference;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (value !== this._heightReference) {
                    this._heightReference = value;
                    this._updateClamping();
                }
            }
        },

        /**
         * Gets or sets the text of this label.
         * @memberof Label.prototype
         * @type {String}
         */
        text : {
            get : function() {
                return this._text;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._text !== value) {
                    this._text = value;
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the font used to draw this label. Fonts are specified using the same syntax as the CSS 'font' property.
         * @memberof Label.prototype
         * @type {String}
         * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles|HTML canvas 2D context text styles}
         */
        font : {
            get : function() {
                return this._font;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._font !== value) {
                    this._font = value;
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the fill color of this label.
         * @memberof Label.prototype
         * @type {Color}
         * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
         */
        fillColor : {
            get : function() {
                return this._fillColor;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var fillColor = this._fillColor;
                if (!Color.equals(fillColor, value)) {
                    Color.clone(value, fillColor);
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the outline color of this label.
         * @memberof Label.prototype
         * @type {Color}
         * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
         */
        outlineColor : {
            get : function() {
                return this._outlineColor;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var outlineColor = this._outlineColor;
                if (!Color.equals(outlineColor, value)) {
                    Color.clone(value, outlineColor);
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the outline width of this label.
         * @memberof Label.prototype
         * @type {Number}
         * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
         */
        outlineWidth : {
            get : function() {
                return this._outlineWidth;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._outlineWidth !== value) {
                    this._outlineWidth = value;
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the style of this label.
         * @memberof Label.prototype
         * @type {LabelStyle}
         */
        style : {
            get : function() {
                return this._style;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._style !== value) {
                    this._style = value;
                    rebindAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the pixel offset in screen space from the origin of this label.  This is commonly used
         * to align multiple labels and billboards at the same position, e.g., an image and text.  The
         * screen space origin is the top, left corner of the canvas; <code>x</code> increases from
         * left to right, and <code>y</code> increases from top to bottom.
         * <br /><br />
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>default</code><br/><img src='images/Label.setPixelOffset.default.png' width='250' height='188' /></td>
         * <td align='center'><code>l.pixeloffset = new Cartesian2(25, 75);</code><br/><img src='images/Label.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
         * </tr></table>
         * The label's origin is indicated by the yellow point.
         * </div>
         * @memberof Label.prototype
         * @type {Cartesian2}
         */
        pixelOffset : {
            get : function() {
                return this._pixelOffset;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var pixelOffset = this._pixelOffset;
                if (!Cartesian2.equals(pixelOffset, value)) {
                    Cartesian2.clone(value, pixelOffset);

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.pixelOffset = value;
                        }
                    }
                }
            }
        },

        /**
         * Gets or sets near and far translucency properties of a Label based on the Label's distance from the camera.
         * A label's translucency will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the label's translucency remains clamped to the nearest bound.  If undefined,
         * translucencyByDistance will be disabled.
         * @memberof Label.prototype
         * @type {NearFarScalar}
         *
         * @example
         * // Example 1.
         * // Set a label's translucencyByDistance to 1.0 when the
         * // camera is 1500 meters from the label and disappear as
         * // the camera distance approaches 8.0e6 meters.
         * text.translucencyByDistance = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0);
         *
         * @example
         * // Example 2.
         * // disable translucency by distance
         * text.translucencyByDistance = undefined;
         */
        translucencyByDistance : {
            get : function() {
                return this._translucencyByDistance;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value.far <= value.near) {
                    throw new DeveloperError('far distance must be greater than near distance.');
                }
                //>>includeEnd('debug');

                var translucencyByDistance = this._translucencyByDistance;
                if (!NearFarScalar.equals(translucencyByDistance, value)) {
                    this._translucencyByDistance = NearFarScalar.clone(value, translucencyByDistance);

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.translucencyByDistance = value;
                        }
                    }
                }
            }
        },

        /**
         * Gets or sets near and far pixel offset scaling properties of a Label based on the Label's distance from the camera.
         * A label's pixel offset will be scaled between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the label's pixel offset scaling remains clamped to the nearest bound.  If undefined,
         * pixelOffsetScaleByDistance will be disabled.
         * @memberof Label.prototype
         * @type {NearFarScalar}
         *
         * @example
         * // Example 1.
         * // Set a label's pixel offset scale to 0.0 when the
         * // camera is 1500 meters from the label and scale pixel offset to 10.0 pixels
         * // in the y direction the camera distance approaches 8.0e6 meters.
         * text.pixelOffset = new Cesium.Cartesian2(0.0, 1.0);
         * text.pixelOffsetScaleByDistance = new Cesium.NearFarScalar(1.5e2, 0.0, 8.0e6, 10.0);
         *
         * @example
         * // Example 2.
         * // disable pixel offset by distance
         * text.pixelOffsetScaleByDistance = undefined;
         */
        pixelOffsetScaleByDistance : {
            get : function() {
                return this._pixelOffsetScaleByDistance;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value.far <= value.near) {
                    throw new DeveloperError('far distance must be greater than near distance.');
                }
                //>>includeEnd('debug');

                var pixelOffsetScaleByDistance = this._pixelOffsetScaleByDistance;
                if (!NearFarScalar.equals(pixelOffsetScaleByDistance, value)) {
                    this._pixelOffsetScaleByDistance = NearFarScalar.clone(value, pixelOffsetScaleByDistance);

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.pixelOffsetScaleByDistance = value;
                        }
                    }
                }
            }
        },

        /**
         * Gets and sets the 3D Cartesian offset applied to this label in eye coordinates.  Eye coordinates is a left-handed
         * coordinate system, where <code>x</code> points towards the viewer's right, <code>y</code> points up, and
         * <code>z</code> points into the screen.  Eye coordinates use the same scale as world and model coordinates,
         * which is typically meters.
         * <br /><br />
         * An eye offset is commonly used to arrange multiple label or objects at the same position, e.g., to
         * arrange a label above its corresponding 3D model.
         * <br /><br />
         * Below, the label is positioned at the center of the Earth but an eye offset makes it always
         * appear on top of the Earth regardless of the viewer's or Earth's orientation.
         * <br /><br />
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><img src='images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
         * <td align='center'><img src='images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
         * </tr></table>
         * <code>l.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code><br /><br />
         * </div>
         * @memberof Label.prototype
         * @type {Cartesian3}
         */
        eyeOffset : {
            get : function() {
                return this._eyeOffset;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var eyeOffset = this._eyeOffset;
                if (!Cartesian3.equals(eyeOffset, value)) {
                    Cartesian3.clone(value, eyeOffset);

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.eyeOffset = value;
                        }
                    }
                }
            }
        },

        /**
         * Gets or sets the horizontal origin of this label, which determines if the label is drawn
         * to the left, center, or right of its position.
         * <br /><br />
         * <div align='center'>
         * <img src='images/Billboard.setHorizontalOrigin.png' width='400' height='300' /><br />
         * </div>
         * @memberof Label.prototype
         * @type {HorizontalOrigin}
         * @example
         * // Use a top, right origin
         * l.horizontalOrigin = Cesium.HorizontalOrigin.RIGHT;
         * l.verticalOrigin = Cesium.VerticalOrigin.TOP;
         */
        horizontalOrigin : {
            get : function() {
                return this._horizontalOrigin;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._horizontalOrigin !== value) {
                    this._horizontalOrigin = value;
                    repositionAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the vertical origin of this label, which determines if the label is
         * to the above, below, or at the center of its position.
         * <br /><br />
         * <div align='center'>
         * <img src='images/Billboard.setVerticalOrigin.png' width='400' height='300' /><br />
         * </div>
         * @memberof Label.prototype
         * @type {VerticalOrigin}
         * @example
         * // Use a top, right origin
         * l.horizontalOrigin = Cesium.HorizontalOrigin.RIGHT;
         * l.verticalOrigin = Cesium.VerticalOrigin.TOP;
         */
        verticalOrigin : {
            get : function() {
                return this._verticalOrigin;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._verticalOrigin !== value) {
                    this._verticalOrigin = value;

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.verticalOrigin = value;
                        }
                    }

                    repositionAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the uniform scale that is multiplied with the label's size in pixels.
         * A scale of <code>1.0</code> does not change the size of the label; a scale greater than
         * <code>1.0</code> enlarges the label; a positive scale less than <code>1.0</code> shrinks
         * the label.
         * <br /><br />
         * Applying a large scale value may pixelate the label.  To make text larger without pixelation,
         * use a larger font size when calling {@link Label#font} instead.
         * <br /><br />
         * <div align='center'>
         * <img src='images/Label.setScale.png' width='400' height='300' /><br/>
         * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
         * and <code>2.0</code>.
         * </div>
         * @memberof Label.prototype
         * @type {Number}
         */
        scale : {
            get : function() {
                return this._scale;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (this._scale !== value) {
                    this._scale = value;

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.scale = value;
                        }
                    }

                    repositionAllGlyphs(this);
                }
            }
        },

        /**
         * Gets or sets the user-defined object returned when the label is picked.
         * @memberof Label.prototype
         * @type {Object}
         */
        id : {
            get : function() {
                return this._id;
            },
            set : function(value) {
                if (this._id !== value) {
                    this._id = value;

                    var glyphs = this._glyphs;
                    for (var i = 0, len = glyphs.length; i < len; i++) {
                        var glyph = glyphs[i];
                        if (defined(glyph.billboard)) {
                            glyph.billboard.id = value;
                        }
                    }
                }
            }
        },

        /**
         * Keeps track of the position of the label based on the height reference.
         * @memberof Label.prototype
         * @type {Cartesian3}
         * @private
         */
        _clampedPosition : {
            get : function() {
                return this._actualClampedPosition;
            },
            set : function(value) {
                this._actualClampedPosition = Cartesian3.clone(value, this._actualClampedPosition);

                var glyphs = this._glyphs;
                for (var i = 0, len = glyphs.length; i < len; i++) {
                    var glyph = glyphs[i];
                    if (defined(glyph.billboard)) {
                        glyph.billboard.position = value;
                    }
                }
            }
        }
    });

    Label.prototype._updateClamping = function() {
        Billboard._updateClamping(this._labelCollection, this);
    };

    /**
     * Computes the screen-space position of the label's origin, taking into account eye and pixel offsets.
     * The screen space origin is the top, left corner of the canvas; <code>x</code> increases from
     * left to right, and <code>y</code> increases from top to bottom.
     *
     * @param {Scene} scene The scene the label is in.
     * @param {Cartesian2} [result] The object onto which to store the result.
     * @returns {Cartesian2} The screen-space position of the label.
     *
     * @see Label#eyeOffset
     * @see Label#pixelOffset
     *
     * @example
     * console.log(l.computeScreenSpacePosition(scene).toString());
     */
    Label.prototype.computeScreenSpacePosition = function(scene, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian2();
        }

        var labelCollection = this._labelCollection;
        var modelMatrix = labelCollection.modelMatrix;
        var actualPosition = Billboard._computeActualPosition(this, this._position, scene.frameState, modelMatrix);

        var windowCoordinates = Billboard._computeScreenSpacePosition(modelMatrix, actualPosition,
                this._eyeOffset, this._pixelOffset, scene, result);
        windowCoordinates.y = scene.canvas.clientHeight - windowCoordinates.y;
        return windowCoordinates;
    };

    /**
     * Determines if this label equals another label.  Labels are equal if all their properties
     * are equal.  Labels in different collections can be equal.
     *
     * @param {Label} other The label to compare for equality.
     * @returns {Boolean} <code>true</code> if the labels are equal; otherwise, <code>false</code>.
     */
    Label.prototype.equals = function(other) {
        return this === other ||
               defined(other) &&
               this._show === other._show &&
               this._scale === other._scale &&
               this._style === other._style &&
               this._verticalOrigin === other._verticalOrigin &&
               this._horizontalOrigin === other._horizontalOrigin &&
               this._text === other._text &&
               this._font === other._font &&
               Cartesian3.equals(this._position, other._position) &&
               Color.equals(this._fillColor, other._fillColor) &&
               Color.equals(this._outlineColor, other._outlineColor) &&
               Cartesian2.equals(this._pixelOffset, other._pixelOffset) &&
               Cartesian3.equals(this._eyeOffset, other._eyeOffset) &&
               NearFarScalar.equals(this._translucencyByDistance, other._translucencyByDistance) &&
               NearFarScalar.equals(this._pixelOffsetScaleByDistance, other._pixelOffsetScaleByDistance) &&
               this._id === other._id;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    Label.prototype.isDestroyed = function() {
        return false;
    };

    return Label;
});
