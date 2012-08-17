/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Matrix4',
        '../Core/writeTextToCanvas',
        '../Renderer/BufferUsage',
        '../Renderer/PixelFormat',
        '../Renderer/TextureAtlas',
        './BillboardCollection',
        './Label',
        './LabelStyle',
        './HorizontalOrigin',
        './VerticalOrigin'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        Matrix4,
        writeTextToCanvas,
        BufferUsage,
        PixelFormat,
        TextureAtlas,
        BillboardCollection,
        Label,
        LabelStyle,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    function createGlyphCanvas(character, font, fillColor, outlineColor, style, verticalOrigin) {
        var textBaseline;
        if (verticalOrigin === VerticalOrigin.BOTTOM) {
            textBaseline = 'bottom';
        } else if (verticalOrigin === VerticalOrigin.TOP) {
            textBaseline = 'top';
        } else {
            // VerticalOrigin.CENTER
            textBaseline = 'middle';
        }

        var fill = false;
        if (style === LabelStyle.FILL || style === LabelStyle.FILL_AND_OUTLINE) {
            fill = true;
        }

        var stroke = false;
        if (style === LabelStyle.OUTLINE || style === LabelStyle.FILL_AND_OUTLINE) {
            stroke = true;
        }

        return writeTextToCanvas(character, {
            font : font,
            textBaseline : textBaseline,
            fill : fill,
            fillColor : fillColor,
            stroke : stroke,
            strokeColor : outlineColor
        });
    }

    function rebindGlyph(glyph, label, glyphCache, textureAtlas) {
        var character = glyph._character;
        var font = label._font;
        var fillColor = label._fillColor;
        var outlineColor = label._outlineColor;
        var style = label._style;
        var verticalOrigin = label._verticalOrigin;
        var id = JSON.stringify([
                                 character,
                                 font,
                                 fillColor.toString(),
                                 outlineColor.toString(),
                                 style.toString(),
                                 verticalOrigin.toString()
                                ]);

        var glyphInfo = glyphCache[id];
        if (typeof glyphInfo === 'undefined') {
            var canvas = createGlyphCanvas(character, font, fillColor, outlineColor, style, verticalOrigin);
            var index = textureAtlas.addImage(canvas);

            glyphCache[id] = glyphInfo = {
                index : index,
                dimensions : canvas.dimensions
            };
        }

        glyph.setImageIndex(glyphInfo.index);
        glyph._dimensions = glyphInfo.dimensions;
    }

    // reusable Cartesian2 instance
    var glyphPixelOffset = new Cartesian2();

    function repositionGlyphs(label, glyphs) {
        var glyph;
        var dimensions;
        var totalWidth = 0;
        var maxHeight = 0;

        var glyphIndex = 0;
        var glyphLength = glyphs.length;
        for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
            glyph = glyphs[glyphIndex];
            dimensions = glyph._dimensions;
            totalWidth += dimensions.width;
            maxHeight = Math.max(maxHeight, dimensions.height);
        }

        var scale = label._scale;
        var horizontalOrigin = label._horizontalOrigin;
        var widthOffset = 0;
        if (horizontalOrigin === HorizontalOrigin.CENTER) {
            widthOffset -= totalWidth / 2 * scale;
        } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
            widthOffset -= totalWidth * scale;
        }

        var pixelOffset = label._pixelOffset;

        glyphPixelOffset.x = pixelOffset.x + widthOffset;
        glyphPixelOffset.y = 0;

        var verticalOrigin = label._verticalOrigin;
        for (glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
            glyph = glyphs[glyphIndex];
            dimensions = glyph._dimensions;

            if (verticalOrigin === VerticalOrigin.BOTTOM || dimensions.height === maxHeight) {
                glyphPixelOffset.y = pixelOffset.y - dimensions.descent * scale;
            } else if (verticalOrigin === VerticalOrigin.TOP) {
                glyphPixelOffset.y = pixelOffset.y - (maxHeight - dimensions.height) * scale - dimensions.descent * scale;
            } else if (verticalOrigin === VerticalOrigin.CENTER) {
                glyphPixelOffset.y = pixelOffset.y - (maxHeight - dimensions.height) / 2 * scale - dimensions.descent * scale;
            }

            glyph.setPixelOffset(glyphPixelOffset);

            glyphPixelOffset.x += dimensions.width * scale;
        }
    }

    function destroyLabel(label, billboardCollection) {
        var glyphs = label._glyphs;
        for ( var i = 0, len = glyphs.length; i < len; ++i) {
            billboardCollection.remove(glyphs[i]);
        }
        destroyObject(label);
    }

    /**
     * A renderable collection of labels.  Labels are viewport-aligned text positioned in the 3D scene.
     * Each label can have a different font, color, scale, etc.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Label.png' width='400' height='300' /><br />
     * Example labels
     * </div>
     * <br /><br />
     * Labels are added and removed from the collection using {@link LabelCollection#add}
     * and {@link LabelCollection#remove}.
     *
     * @alias LabelCollection
     * @constructor
     *
     * @performance For best performance, prefer a few collections, each with many labels, to
     * many collections with only a few labels each.  Also set the buffer usage via
     * {@link LabelCollection#bufferUsage} based on your expected update pattern.
     * Avoid having collections where some labels change every frame and others do not; instead,
     * create one or more collections for static labels, and one or more collections for dynamic labels.
     *
     * @see LabelCollection#add
     * @see LabelCollection#remove
     * @see LabelCollection#bufferUsage
     * @see Label
     * @see BillboardCollection
     *
     * @example
     * // Create a label collection with two labels
     * var labels = new LabelCollection();
     * labels.add({
     *   position : { x : 1.0, y : 2.0, z : 3.0 },
     *   text : 'A label'
     * });
     * labels.add({
     *   position : { x : 4.0, y : 5.0, z : 6.0 },
     *   text : 'Another label'
     * });
     */
    var LabelCollection = function() {
        this._billboardCollection = new BillboardCollection();
        this._billboardCollection.setDestroyTextureAtlas(false);
        this._textureAtlas = undefined;
        this._spareGlyphs = [];
        this._glyphCache = {};
        this._labels = [];

        /**
         * The 4x4 transformation matrix that transforms each label in this collection from model to world coordinates.
         * When this is the identity matrix, the labels are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link agi_model} and derived uniforms.
         *
         * @type Matrix4
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see agi_model
         *
         * @example
         * var center = ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(-75.59777, 40.03883));
         * labels.modelMatrix = Transforms.eastNorthUpToFixedFrame(center);
         * labels.add({
         *   position : new Cartesian3(0.0, 0.0, 0.0),
         *   text     : 'Center'
         * });
         * labels.add({
         *   position : new Cartesian3(1000000.0, 0.0, 0.0),
         *   text     : 'East'
         * });
         * labels.add({
         *   position : new Cartesian3(0.0, 1000000.0, 0.0),
         *   text     : 'North'
         * });
         * labels.add({
         *   position : new Cartesian3(0.0, 0.0, 1000000.0),
         *   text     : 'Up'
         * });
         */
        this.modelMatrix = Matrix4.IDENTITY;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;

        /**
         * The usage hint for the collection's vertex buffer.
         *
         * @performance If <code>bufferUsage</code> changes, the next time
         * {@link LabelCollection#update} is called, the collection's vertex buffer
         * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.
         * For best performance, it is important to provide the proper usage hint.  If the collection
         * and labels will not change over several frames, use <code>BufferUsage.STATIC_DRAW</code>.
         * If all labels will change every frame or labels are added/removed every frame, use
         * <code>BufferUsage.STREAM_DRAW</code>.  If a subset of labels change every frame, use
         * <code>BufferUsage.DYNAMIC_DRAW</code>.
         */
        this.bufferUsage = BufferUsage.STATIC_DRAW;
    };

    /**
     * Creates and adds a label with the specified initial properties to the collection.
     * The added label is returned so it can be modified or removed from the collection later.
     *
     * @memberof LabelCollection
     *
     * @param {Object}[description] A template describing the label's properties as shown in Example 1.
     *
     * @return {Label} The label that was added to the collection.
     *
     * @performance Calling <code>add</code> is expected constant time.  However, when
     * {@link LabelCollection#update} is called, the collection's vertex buffer
     * is rewritten; this operations is <code>O(n)</code> and also incurs
     * CPU to GPU overhead.  For best performance, add as many billboards as possible before
     * calling <code>update</code>.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#remove
     * @see LabelCollection#removeAll
     * @see LabelCollection#update
     *
     * @example
     * // Example 1:  Add a label, specifying all the default values.
     * var l = labels.add({
     *   show : true,
     *   position : Cartesian3.ZERO,
     *   text : '',
     *   font : '30px sans-serif',
     *   fillColor : 'white',
     *   outlineColor : 'white',
     *   style : LabelStyle.FILL,
     *   pixelOffset : Cartesian2.ZERO,
     *   eyeOffset : Cartesian3.ZERO,
     *   horizontalOrigin : HorizontalOrigin.LEFT,
     *   verticalOrigin : VerticalOrigin.BOTTOM,
     *   scale : 1.0,
     * });
     *
     * // Example 2:  Specify only the label's cartographic position,
     * // text, and font.
     * var l = labels.add({
     *   position : ellipsoid.cartographicToCartesian(new Cartographic(longitude, latitude, height)),
     *   text : 'Hello World',
     *   font : '24px Helvetica',
     * });
     */
    LabelCollection.prototype.add = function(description) {
        var labels = this._labels;

        var label = new Label(description, this, labels.length);
        labels.push(label);
        return label;
    };

    /**
     * Removes a label from the collection.  Once removed, a label is no longer usable.
     *
     * @memberof LabelCollection
     *
     * @param {Label} label The label to remove.
     *
     * @return {Boolean} <code>true</code> if the label was removed; <code>false</code> if the label was not found in the collection.
     *
     * @performance Calling <code>remove</code> is expected constant time.  However, when
     * {@link LabelCollection#update} is called, the collection's vertex buffer
     * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
     * best performance, remove as many labels as possible before calling <code>update</code>.
     * If you intend to temporarily hide a label, it is usually more efficient to call
     * {@link Label#setShow} instead of removing and re-adding the label.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#add
     * @see LabelCollection#removeAll
     * @see LabelCollection#update
     * @see Label#setShow
     *
     * @example
     * var l = labels.add(...);
     * labels.remove(l);  // Returns true
     */
    LabelCollection.prototype.remove = function(label) {
        if (typeof label === 'undefined') {
            return false;
        }

        if (label._labelCollection === this) {
            this._labels.splice(label._index, 1);
            destroyLabel(label, this._billboardCollection);

            return true;
        }

        return false;
    };

    /**
     * Removes all labels from the collection.
     *
     * @memberof LabelCollection
     *
     * @performance <code>O(n)</code>.  It is more efficient to remove all the labels
     * from a collection and then add new ones than to create a new collection entirely.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#add
     * @see LabelCollection#remove
     * @see LabelCollection#update
     *
     * @example
     * labels.add(...);
     * labels.add(...);
     * labels.removeAll();
     */
    LabelCollection.prototype.removeAll = function() {
        var labels = this._labels;

        for ( var i = 0, len = labels.length; i < len; ++i) {
            destroyLabel(labels[i], this._billboardCollection);
        }

        labels.length = 0;
        if (typeof this._textureAtlas !== 'undefined') {
            this._textureAtlas.destroy();
            this._textureAtlas = undefined;
            this._glyphCache = {};
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof LabelCollection
     *
     * @param {Object} label DOC_TBA
     *
     * @see LabelCollection#get
     */
    LabelCollection.prototype.contains = function(label) {
        if (label) {
            var labels = this._labels;
            var length = labels.length;
            for ( var i = 0; i < length; i++) {
                if (labels[i] === label) {
                    return true;
                }
            }
        }

        return false;
    };

    /**
     * Returns the label in the collection at the specified index.  Indices are zero-based
     * and increase as labels are added.  Removing a label shifts all labels after
     * it to the left, changing their indices.  This function is commonly used with
     * {@link LabelCollection#getLength} to iterate over all the labels
     * in the collection.
     *
     * @memberof LabelCollection
     *
     * @param {Number} index The zero-based index of the billboard.
     *
     * @return {Label} The label at the specified index.
     *
     * @performance Expected constant time.  If labels were removed from the collection and
     * {@link LabelCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#getLength
     *
     * @example
     * // Toggle the show property of every label in the collection
     * var len = labels.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var l = billboards.get(i);
     *   l.setShow(!l.getShow());
     * }
     */
    LabelCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        return this._labels[index];
    };

    /**
     * Returns the number of labels in this collection.  This is commonly used with
     * {@link LabelCollection#get} to iterate over all the labels
     * in the collection.
     *
     * @memberof LabelCollection
     *
     * @return {Number} The number of labels in this collection.
     *
     * @performance Expected constant time.  If labels were removed from the collection and
     * {@link LabelCollection#update} was not called, an implicit <code>O(n)</code>
     * operation is performed.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#get
     *
     * @example
     * // Toggle the show property of every label in the collection
     * var len = labels.getLength();
     * for (var i = 0; i < len; ++i) {
     *   var l = billboards.get(i);
     *   l.setShow(!l.getShow());
     * }
     */
    LabelCollection.prototype.getLength = function() {
        return this._labels.length;
    };

    /**
     * @private
     */
    LabelCollection.prototype.update = function(context, sceneState) {
        var billboardCollection = this._billboardCollection;

        billboardCollection.modelMatrix = this.modelMatrix;
        billboardCollection.morphTime = this.morphTime;
        billboardCollection.bufferUsage = this.bufferUsage;

        var textureAtlas = this._textureAtlas;
        if (typeof textureAtlas === 'undefined') {
            this._textureAtlas = textureAtlas = context.createTextureAtlas();
            billboardCollection.setTextureAtlas(textureAtlas);
        }

        var labels = this._labels;
        for ( var i = 0, len = labels.length; i < len; ++i) {
            var label = labels[i];
            var glyphs = label._glyphs;

            var glyph, textIndex, textLength, glyphIndex, glyphLength;

            if (label._textChanged) {
                var text = label._text;
                textLength = text.length;

                // if we have more glyphs than needed, hide the extras and move them to spare.
                if (textLength < glyphs.length) {
                    for (glyphIndex = textLength, glyphLength = glyphs.length; glyphIndex < glyphLength; ++glyphIndex) {
                        glyph = glyphs[glyphIndex];
                        glyph.setShow(false);
                        this._spareGlyphs.push(glyph);
                    }
                }

                // presize glyphs to match the new text length
                glyphs.length = textLength;

                // walk the text looking for new characters (creating new glyphs for each)
                // or changed characters (rebinding existing glyphs)
                for (textIndex = 0; textIndex < textLength; ++textIndex) {
                    glyph = glyphs[textIndex];

                    if (typeof glyph === 'undefined') {
                        if (this._spareGlyphs.length > 0) {
                            glyph = this._spareGlyphs.pop();
                        } else {
                            glyph = billboardCollection.add();
                        }

                        glyph.setShow(label._show);
                        glyph.setPosition(label._position);
                        glyph.setEyeOffset(label._eyeOffset);
                        glyph.setHorizontalOrigin(HorizontalOrigin.LEFT);
                        glyph.setVerticalOrigin(label._verticalOrigin);
                        glyph.setScale(label._scale);
                        glyph._pickIdThis = label;
                        glyph._character = undefined;
                        glyph._dimensions = undefined;

                        glyphs[textIndex] = glyph;
                    }

                    var glyphCharacter = text.charAt(textIndex);
                    if (glyph._character !== glyphCharacter) {
                        glyph._character = glyphCharacter;
                        rebindGlyph(glyph, label, this._glyphCache, textureAtlas);

                        // changing any glyph will cause the position of the
                        // glyphs to change, since different characters have different widths
                        label._repositionAllGlyphs = true;
                    }
                }
            }

            if (label._rebindAllGlyphs) {
                for (glyphIndex = 0, glyphLength = glyphs.length; glyphIndex < glyphLength; ++glyphIndex) {
                    rebindGlyph(glyphs[glyphIndex], label, this._glyphCache, textureAtlas);
                }
            }

            if (label._repositionAllGlyphs) {
                repositionGlyphs(label, glyphs);
            }
        }

        this._billboardCollection.update(context, sceneState);
    };

    /**
     * Renders the labels.  In order for changes to properties to be realized,
     * {@link LabelCollection#update} must be called before <code>render</code>.
     * <br /><br />
     * Labels are rendered in a single pass using an uber-shader with a texture atlas, where
     * each image in the atlas corresponds to one label.
     *
     * @memberof LabelCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#update
     */
    LabelCollection.prototype.render = function(context) {
        this._billboardCollection.render(context);
    };

    /**
     * @private
     */
    LabelCollection.prototype.updateForPick = function(context) {
        this._billboardCollection.updateForPick(context);
    };

    /**
     * DOC_TBA
     * @memberof LabelCollection
     */
    LabelCollection.prototype.renderForPick = function(context, framebuffer) {
        this._billboardCollection.renderForPick(context, framebuffer);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof LabelCollection
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see LabelCollection#destroy
     */
    LabelCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof LabelCollection
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see LabelCollection#isDestroyed
     *
     * @example
     * labels = labels && labels.destroy();
     */
    LabelCollection.prototype.destroy = function() {
        // removeAll destroys the texture atlas
        this.removeAll();
        this._billboardCollection.destroy();
        return destroyObject(this);
    };

    return LabelCollection;
});