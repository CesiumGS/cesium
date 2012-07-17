/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Renderer/BufferUsage',
        '../Renderer/PixelFormat',
        '../Renderer/TextureAtlas',
        './BillboardCollection',
        './Label'
    ], function(
        DeveloperError,
        destroyObject,
        Matrix4,
        BufferUsage,
        PixelFormat,
        TextureAtlas,
        BillboardCollection,
        Label) {
    "use strict";

    function CanvasContainer() {
        this._sources = {};
        this._sourcesArray = [];
    }

    CanvasContainer.prototype.add = function(charValue, label, canvasCreated) {
        var id = label._createId(charValue);
        if (this._contains(id)) {
            return this._getCanvas(id).index;
        }

        var canvas = label._createCanvas(charValue);
        this._sources[id] = canvas;
        canvas.index = this._sourcesArray.push(canvas) - 1;
        if (typeof canvasCreated !== 'undefined') {
            canvasCreated();
        }
        return canvas.index;
    };

    CanvasContainer.prototype.getItems = function() {
        return this._sourcesArray;
    };

    CanvasContainer.prototype.getItem = function(index) {
        return this._sourcesArray[index];
    };

    CanvasContainer.prototype._contains = function(id) {
        return typeof this._sources[id] !== 'undefined';
    };

    CanvasContainer.prototype._getCanvas = function(id) {
        return this._sources[id];
    };

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
        this._labels = [];
        this._labelsRemoved = false;
        this._updateTextureAtlas = false;
        this._canvasContainer = new CanvasContainer();

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

    LabelCollection.prototype._getCollection = function() {
        return this._billboardCollection;
    };

    LabelCollection.prototype._setUpdateTextureAtlas = function(value) {
        this._updateTextureAtlas = value;
    };

    /**
     * Creates and adds a label with the specified initial properties to the collection.
     * The added label is returned so it can be modified or removed from the collection later.
     *
     * @memberof LabelCollection
     *
     * @param {Object}[label=undefined] A template describing the label's properties as shown in Example 1.
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
    LabelCollection.prototype.add = function(label) {
        var l = new Label(label, this);
        l._index = this._labels.length;

        this._labels.push(l);

        return l;
    };

    /**
     * Removes a label from the collection.
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
        if (label && (label._getCollection() === this)) {
            this._labels[label._index] = null;
            // Removed later
            this._labelsRemoved = true;
            label._destroy();

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
        this._destroyLabels();
        this._labels = [];
        this._labelsRemoved = false;
        this._updateTextureAtlas = true;
    };

    LabelCollection.prototype._removeLabels = function() {
        if (this._labelsRemoved) {
            this._labelsRemoved = false;

            var labels = [];
            var length = this._labels.length;
            for ( var i = 0, j = 0; i < length; ++i) {
                var label = this._labels[i];
                if (label) {
                    label._index = j++;
                    labels.push(label);
                }
            }
            this._labels = labels;
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

        this._removeLabels();
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
        this._removeLabels();
        return this._labels.length;
    };

    /**
     * @private
     */
    LabelCollection.prototype.update = function(context, sceneState) {
        this._billboardCollection.modelMatrix = this.modelMatrix;
        this._billboardCollection.morphTime = this.morphTime;
        this._billboardCollection.bufferUsage = this.bufferUsage;
        this._removeLabels();

        if (this._updateTextureAtlas) {
            this._updateTextureAtlas = false;

            //Determines which subset of images are new to the texture atlas.
            var textureAtlas = this._billboardCollection.getTextureAtlas();
            var images = this._canvasContainer.getItems();
            var numImagesOld = (typeof textureAtlas !== 'undefined') ? textureAtlas.getNumberOfImages() : 0;
            var numImagesNew = images.length;
            var newImages = images.slice(numImagesOld);
            var difference = numImagesNew - numImagesOld;

            // First time creating texture atlas or removing images from the texture atlas.
            if ((numImagesOld === 0 && numImagesNew > 0) || difference < 0) {
                textureAtlas = textureAtlas && textureAtlas.destroy();
                textureAtlas = context.createTextureAtlas({images : images});
                this._billboardCollection.setTextureAtlas(textureAtlas);
            }
            // Adding one new image to the texture atlas.
            else if (difference === 1) {
                textureAtlas.addImage(newImages[0]);
            }
            // Adding multiple new images to the texture atlas.
            else if (difference > 1) {
                textureAtlas.addImages(newImages);
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
        this._destroyLabels();

        this._billboardCollection = this._billboardCollection && this._billboardCollection.destroy();

        return destroyObject(this);
    };

    LabelCollection.prototype._destroyLabels = function() {
        var labels = this._labels;
        var length = labels.length;
        for ( var i = 0; i < length; ++i) {
            if (labels[i]) {
                labels[i]._destroy();
            }
        }
    };

    return LabelCollection;
});