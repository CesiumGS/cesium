/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Math',
        '../Core/Matrix4',
        './HorizontalOrigin',
        './VerticalOrigin',
        './SceneMode'
    ], function(
        defaultValue,
        DeveloperError,
        BoundingRectangle,
        Color,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        CesiumMath,
        Matrix4,
        HorizontalOrigin,
        VerticalOrigin,
        SceneMode) {
    "use strict";

    var EMPTY_OBJECT = {};

    /**
     * A viewport-aligned image positioned in the 3D scene, that is created
     * and rendered using a {@link BillboardCollection}.  A billboard is created and its initial
     * properties are set by calling {@link BillboardCollection#add}.  Any of the billboard's
     * properties can be changed at any time by calling the billboard's corresponding
     * <code>set</code> function, e.g., {@link Billboard#setShow}.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.png' width='400' height='300' /><br />
     * Example billboards
     * </div>
     *
     * @alias Billboard
     *
     * @performance Calling any <code>get</code> function, e.g., {@link Billboard#getShow}, is constant time.
     * Calling a <code>set</code> function, e.g., {@link Billboard#setShow}, is constant time but results in
     * CPU to GPU traffic when {@link BillboardCollection#update} is called.  The per-billboard traffic is
     * the same regardless of how many properties were updated.  If most billboards in a collection need to be
     * updated, it may be more efficient to clear the collection with {@link BillboardCollection#removeAll}
     * and add new billboards instead of modifying each one.
     *
     * @see BillboardCollection
     * @see BillboardCollection#add
     * @see Label
     *
     * @internalConstructor
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Billboards.html">Cesium Sandcastle Billboard Demo</a>
     */
    var Billboard = function(description, billboardCollection) {
        description = defaultValue(description, EMPTY_OBJECT);

        this._show = defaultValue(description.show, true);

        this._position = Cartesian3.clone(defaultValue(description.position, Cartesian3.ZERO));
        this._actualPosition = this._position.clone(); // For columbus view and 2D

        this._pixelOffset = Cartesian2.clone(defaultValue(description.pixelOffset, Cartesian2.ZERO));
        this._eyeOffset = Cartesian3.clone(defaultValue(description.eyeOffset, Cartesian3.ZERO));
        this._verticalOrigin = defaultValue(description.verticalOrigin, VerticalOrigin.CENTER);
        this._horizontalOrigin = defaultValue(description.horizontalOrigin, HorizontalOrigin.CENTER);
        this._scale = defaultValue(description.scale, 1.0);
        this._imageIndex = defaultValue(description.imageIndex, -1);
        this._color = Color.clone(defaultValue(description.color, Color.WHITE));

        this._pickId = undefined;
        this._pickIdThis = description._pickIdThis;
        this._billboardCollection = billboardCollection;
        this._dirty = false;
        this._index = -1; //Used only by BillboardCollection
    };

    var SHOW_INDEX = Billboard.SHOW_INDEX = 0;
    var POSITION_INDEX = Billboard.POSITION_INDEX = 1;
    var PIXEL_OFFSET_INDEX = Billboard.PIXEL_OFFSET_INDEX = 2;
    var EYE_OFFSET_INDEX = Billboard.EYE_OFFSET_INDEX = 3;
    var HORIZONTAL_ORIGIN_INDEX = Billboard.HORIZONTAL_ORIGIN_INDEX = 4;
    var VERTICAL_ORIGIN_INDEX = Billboard.VERTICAL_ORIGIN_INDEX = 5;
    var SCALE_INDEX = Billboard.SCALE_INDEX = 6;
    var IMAGE_INDEX_INDEX = Billboard.IMAGE_INDEX_INDEX = 7;
    var COLOR_INDEX = Billboard.COLOR_INDEX = 8;
    Billboard.NUMBER_OF_PROPERTIES = 9;

    function makeDirty(billboard, propertyChanged) {
        var billboardCollection = billboard._billboardCollection;
        if (typeof billboardCollection !== 'undefined') {
            billboardCollection._updateBillboard(billboard, propertyChanged);
            billboard._dirty = true;
        }
    }

    Billboard.prototype.getPickId = function(context) {
        this._pickId = this._pickId || context.createPickId(this._pickIdThis || this);
        return this._pickId;
    };

    /**
     * Returns true if this billboard will be shown.  Call {@link Billboard#setShow}
     * to hide or show a billboard, instead of removing it and re-adding it to the collection.
     *
     * @memberof Billboard
     *
     * @return {Boolean} <code>true</code> if this billboard will be shown; otherwise, <code>false</code>.
     *
     * @see Billboard#setShow
     */
    Billboard.prototype.getShow = function() {
        return this._show;
    };

    /**
     * Determines if this billboard will be shown.  Call this to hide or show a billboard, instead
     * of removing it and re-adding it to the collection.
     *
     * @memberof Billboard
     *
     * @param {Boolean} value Indicates if this billboard will be shown.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getShow
     */
    Billboard.prototype.setShow = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (value !== this._show) {
            this._show = value;
            makeDirty(this, SHOW_INDEX);
        }
    };

    /**
     * Returns the Cartesian position of this billboard.
     *
     * @memberof Billboard
     *
     * @return {Cartesian3} The Cartesian position of this billboard.
     *
     * @see Billboard#setPosition
     */
    Billboard.prototype.getPosition = function() {
        return this._position;
    };

    /**
     * Sets the Cartesian position of this billboard.
     * <br /><br />
     * As shown in the examples, <code>value</code> can be either a {@link Cartesian3}
     * or an object literal with <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * A copy of <code>value</code> is made, so changing it after calling <code>setPosition</code>
     * does not affect the billboard's position; an explicit call to <code>setPosition</code> is required.
     *
     * @memberof Billboard
     *
     * @param {Cartesian3} value The Cartesian position.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getPosition
     *
     * @example
     * // Example 1. Set a billboard's position using a Cartesian3.
     * b.setPosition(new Cartesian3(1.0, 2.0, 3.0));
     *
     * // Example 2. Set a billboard's position using an object literal.
     * b.setPosition({
     *   x : 1.0,
     *   y : 2.0,
     *   z : 3.0
     * });
     */
    Billboard.prototype.setPosition = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var position = this._position;
        if (!Cartesian3.equals(position, value)) {
            Cartesian3.clone(value, position);
            Cartesian3.clone(value, this._actualPosition);

            makeDirty(this, POSITION_INDEX);
        }
    };

    Billboard.prototype._getActualPosition = function() {
        return this._actualPosition;
    };

    Billboard.prototype._setActualPosition = function(value) {
        Cartesian3.clone(value, this._actualPosition);
        makeDirty(this, POSITION_INDEX);
    };

    /**
     * Returns the pixel offset from the origin of this billboard.
     *
     * @memberof Billboard
     *
     * @return {Cartesian2} The pixel offset of this billboard.
     *
     * @see Billboard#setPixelOffset
     */
    Billboard.prototype.getPixelOffset = function() {
        return this._pixelOffset;
    };

    /**
     * Sets the pixel offset in screen space from the origin of this billboard.  This is commonly used
     * to align multiple billboards and labels at the same position, e.g., an image and text.  The
     * screen space origin is the bottom, left corner of the canvas; <code>x</code> increases from
     * left to right, and <code>y</code> increases from bottom to top.
     * <br /><br />
     * <code>value</code> can be either a {@link Cartesian2}  or an object literal with
     * <code>x</code> and <code>y</code> properties.  A copy of <code>value</code> is made, so
     * changing it after calling <code>setPixelOffset</code> does not affect the billboard's pixel
     * offset; an explicit call to <code>setPixelOffset</code> is required.
     * <br /><br />
     * <div align='center'>
     * <table border='0' cellpadding='5'><tr>
     * <td align='center'><code>default</code><br/><img src='images/Billboard.setPixelOffset.default.png' width='250' height='188' /></td>
     * <td align='center'><code>b.setPixelOffset({ x : 50, y : -25 });</code><br/><img src='images/Billboard.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
     * </tr></table>
     * The billboard's origin is indicated by the yellow point.
     * </div>
     *
     * @memberof Billboard
     *
     * @param {Cartesian2} value The 2D Cartesian pixel offset.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getPixelOffset
     * @see Label#setPixelOffset
     */
    Billboard.prototype.setPixelOffset = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var pixelOffset = this._pixelOffset;
        if (!Cartesian2.equals(pixelOffset, value)) {
            Cartesian2.clone(value, pixelOffset);
            makeDirty(this, PIXEL_OFFSET_INDEX);
        }
    };

    /**
     * Returns the 3D Cartesian offset applied to this billboard in eye coordinates.
     *
     * @memberof Billboard
     *
     * @return {Cartesian3} The 3D Cartesian offset applied to this billboard in eye coordinates.
     *
     * @see Billboard#setEyeOffset
     */
    Billboard.prototype.getEyeOffset = function() {
        return this._eyeOffset;
    };

    /**
     * Sets the 3D Cartesian offset applied to this billboard in eye coordinates.  Eye coordinates is a left-handed
     * coordinate system, where <code>x</code> points towards the viewer's right, <code>y</code> points up, and
     * <code>z</code> points into the screen.  Eye coordinates use the same scale as world and model coordinates,
     * which is typically meters.
     * <br /><br />
     * An eye offset is commonly used to arrange multiple billboards or objects at the same position, e.g., to
     * arrange a billboard above its corresponding 3D model.
     * <br /><br />
     * <code>value</code> can be either a {@link Cartesian3} or an object literal with <code>x</code>,
     * <code>y</code>, and <code>z</code> properties.  A copy of <code>value</code> is made, so changing it after
     * calling <code>setEyeOffset</code> does not affect the billboard's eye offset; an explicit call to
     * <code>setEyeOffset</code> is required.
     * <br /><br />
     * Below, the billboard is positioned at the center of the Earth but an eye offset makes it always
     * appear on top of the Earth regardless of the viewer's or Earth's orientation.
     * <br /><br />
     * <div align='center'>
     * <table border='0' cellpadding='5'><tr>
     * <td align='center'><img src='images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
     * <td align='center'><img src='images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
     * </tr></table>
     * <code>b.setEyeOffset({ x : 0.0, y : 8000000.0, z : 0.0 });</code><br /><br />
     * </div>
     *
     * @memberof Billboard
     *
     * @param {Cartesian3} value The 3D Cartesian offset in eye coordinates.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getEyeOffset
     */
    Billboard.prototype.setEyeOffset = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var eyeOffset = this._eyeOffset;
        if (!Cartesian3.equals(eyeOffset, value)) {
            Cartesian3.clone(value, eyeOffset);
            makeDirty(this, EYE_OFFSET_INDEX);
        }
    };

    /**
     * Returns the horizontal origin of this billboard.
     *
     * @memberof Billboard
     *
     * @return {HorizontalOrigin} The horizontal origin of this billboard.
     *
     * @see Billboard#setHorizontalOrigin
     */
    Billboard.prototype.getHorizontalOrigin = function() {
        return this._horizontalOrigin;
    };

    /**
     * Sets the horizontal origin of this billboard, which determines if the billboard is
     * to the left, center, or right of its position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setHorizontalOrigin.png' width='400' height='300' /><br />
     * </div>
     *
     * @memberof Billboard
     *
     * @param {HorizontalOrigin} value The horizontal origin.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getHorizontalOrigin
     * @see Billboard#setVerticalOrigin
     *
     * @example
     * // Use a bottom, left origin
     * b.setHorizontalOrigin(HorizontalOrigin.LEFT);
     * b.setVerticalOrigin(VerticalOrigin.BOTTOM);
     */
    Billboard.prototype.setHorizontalOrigin = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (this._horizontalOrigin !== value) {
            this._horizontalOrigin = value;
            makeDirty(this, HORIZONTAL_ORIGIN_INDEX);
        }
    };

    /**
     * Returns the vertical origin of this billboard.
     *
     * @memberof Billboard
     *
     * @return {VerticalOrigin} The vertical origin of this billboard.
     *
     * @see Billboard#setVerticalOrigin
     */
    Billboard.prototype.getVerticalOrigin = function() {
        return this._verticalOrigin;
    };

    /**
     * Sets the vertical origin of this billboard, which determines if the billboard is
     * to the above, below, or at the center of its position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setVerticalOrigin.png' width='400' height='300' /><br />
     * </div>
     *
     * @memberof Billboard
     *
     * @param {VerticalOrigin} value The vertical origin.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getVerticalOrigin
     * @see Billboard#setHorizontalOrigin
     *
     * @example
     * // Use a bottom, left origin
     * b.setHorizontalOrigin(HorizontalOrigin.LEFT);
     * b.setVerticalOrigin(VerticalOrigin.BOTTOM);
     */
    Billboard.prototype.setVerticalOrigin = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (this._verticalOrigin !== value) {
            this._verticalOrigin = value;
            makeDirty(this, VERTICAL_ORIGIN_INDEX);
        }
    };

    /**
     * Returns the uniform scale that is multiplied with the billboard's image size in pixels.
     *
     * @memberof Billboard
     *
     * @return {Number} The scale used to size the billboard.
     *
     * @see Billboard#setScale
     */
    Billboard.prototype.getScale = function() {
        return this._scale;
    };

    /**
     * Sets the uniform scale that is multiplied with the billboard's image size in pixels.
     * A scale of <code>1.0</code> does not change the size of the billboard; a scale greater than
     * <code>1.0</code> enlarges the billboard; a positive scale less than <code>1.0</code> shrinks
     * the billboard.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setScale.png' width='400' height='300' /><br/>
     * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
     * and <code>2.0</code>.
     * </div>
     *
     * @memberof Billboard
     *
     * @param {Number} value The scale used to size the billboard.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getScale
     * @see Billboard#setImageIndex
     */
    Billboard.prototype.setScale = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (this._scale !== value) {
            this._scale = value;
            makeDirty(this, SCALE_INDEX);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Billboard
     *
     * @see Billboard#setImageIndex
     * @see BillboardCollection#setTextureAtlas
     */
    Billboard.prototype.getImageIndex = function() {
        return this._imageIndex;
    };

    /**
     * DOC_TBA
     *
     * @memberof Billboard
     *
     * @see Billboard#getImageIndex
     * @see BillboardCollection#setTextureAtlas
     */
    Billboard.prototype.setImageIndex = function(value) {
        if (typeof value !== 'number') {
            throw new DeveloperError('value is required and must be a number.');
        }

        if (this._imageIndex !== value) {
            this._imageIndex = value;
            makeDirty(this, IMAGE_INDEX_INDEX);
        }
    };

    /**
     * Returns the color that is multiplied with the billboard's texture.  The red, green, blue, and alpha values
     * are indicated by the returned object's <code>red</code>, <code>green</code>, <code>blue</code>, and <code>alpha</code>
     * properties, which range from <code>0</code> (no intensity) to <code>1.0</code> (full intensity).
     *
     * @memberof Billboard
     *
     * @return {Number} The color that is multiplied with the billboard's texture.
     *
     * @see Billboard#setColor
     */
    Billboard.prototype.getColor = function() {
        return this._color;
    };

    /**
     * Sets the color that is multiplied with the billboard's texture.  This has two common use cases.  First,
     * the same white texture may be used by many different billboards, each with a different color, to create
     * colored billboards.  Second, the color's alpha component can be used to make the billboard translucent as shown below.
     * An alpha of <code>0.0</code> makes the billboard transparent, and <code>1.0</code> makes the billboard opaque.
     * <br /><br />
     * <div align='center'>
     * <table border='0' cellpadding='5'><tr>
     * <td align='center'><code>default</code><br/><img src='images/Billboard.setColor.Alpha255.png' width='250' height='188' /></td>
     * <td align='center'><code>alpha : 0.5</code><br/><img src='images/Billboard.setColor.Alpha127.png' width='250' height='188' /></td>
     * </tr></table>
     * </div>
     * <br />
     * The red, green, blue, and alpha values are indicated by <code>value</code>'s <code>red</code>, <code>green</code>,
     * <code>blue</code>, and <code>alpha</code> properties as shown in Example 1.  These components range from <code>0.0</code>
     * (no intensity) to <code>1.0</code> (full intensity).
     *
     * @memberof Billboard
     *
     * @param {Object} value The color's red, green, blue, and alpha components.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Billboard#getColor
     *
     * @example
     * // Example 1. Assign yellow.
     * b.setColor({
     *   red   : 1.0,
     *   green : 1.0,
     *   blue  : 0.0,
     *   alpha : 1.0
     * });
     *
     * // Example 2. Make a billboard 50% translucent.
     * b.setColor({
     *   red   : 1.0,
     *   green : 1.0,
     *   blue  : 1.0,
     *   alpha : 0.5
     * });
     */
    Billboard.prototype.setColor = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var color = this._color;
        if (!Color.equals(color, value)) {
            Color.clone(value, color);
            makeDirty(this, COLOR_INDEX);
        }
    };

    var tempCartesian4 = new Cartesian4();
    var tempCartographic = new Cartographic();
    Billboard._computeActualPosition = function(position, frameState, morphTime, modelMatrix) {
        var mode = frameState.mode;

        if (mode === SceneMode.SCENE3D) {
            return position;
        }

        modelMatrix.multiplyByPoint(position, tempCartesian4);

        var projection = frameState.scene2D.projection;
        var cartographic = projection.getEllipsoid().cartesianToCartographic(tempCartesian4, tempCartographic);
        if (typeof cartographic === 'undefined') {
            return undefined;
        }

        var projectedPosition = projection.project(cartographic);
        if (mode === SceneMode.MORPHING) {
            var x = CesiumMath.lerp(projectedPosition.z, tempCartesian4.x, morphTime);
            var y = CesiumMath.lerp(projectedPosition.x, tempCartesian4.y, morphTime);
            var z = CesiumMath.lerp(projectedPosition.y, tempCartesian4.z, morphTime);
            return new Cartesian3(x, y, z);
        }
        if (mode === SceneMode.SCENE2D) {
            return new Cartesian3(0.0, projectedPosition.x, projectedPosition.y);
        }
        if (mode === SceneMode.COLUMBUS_VIEW) {
            return new Cartesian3(projectedPosition.z, projectedPosition.x, projectedPosition.y);
        }
        return undefined;
    };

    var scratchViewport = new BoundingRectangle();
    var scratchViewportTransform = new Matrix4();
    Billboard._computeScreenSpacePosition = function(modelMatrix, position, eyeOffset, pixelOffset, context, frameState) {
        // This function is basically a stripped-down JavaScript version of BillboardCollectionVS.glsl

        var camera = frameState.camera;
        var view = camera.getViewMatrix();
        var projection = camera.frustum.getProjectionMatrix();

        // Assuming viewport takes up the entire canvas...
        var canvas = context.getCanvas();
        scratchViewport.width = canvas.clientWidth;
        scratchViewport.height = canvas.clientHeight;
        var viewportTransformation = Matrix4.computeViewportTransformation(scratchViewport, 0.0, 1.0, scratchViewportTransform);

        // Model to eye coordinates
        var mv = view.multiply(modelMatrix);
        var positionEC = mv.multiplyByPoint(position);

        // Apply eye offset, e.g., czm_eyeOffset
        var zEyeOffset = eyeOffset.multiplyComponents(positionEC.normalize());
        positionEC.x += eyeOffset.x + zEyeOffset.x;
        positionEC.y += eyeOffset.y + zEyeOffset.y;
        positionEC.z += zEyeOffset.z;

        // Eye to window coordinates, e.g., czm_eyeToWindowCoordinates
        var q = projection.multiplyByVector(positionEC); // clip coordinates
        q.x /= q.w; // normalized device coordinates
        q.y /= q.w;
        q.z /= q.w;
        var positionWC = viewportTransformation.multiplyByPoint(q); // window coordinates

        // Apply pixel offset
        var uniformState = context.getUniformState();
        var po = pixelOffset.multiplyByScalar(uniformState.getHighResolutionSnapScale());
        positionWC.x += po.x;
        positionWC.y += po.y;

        return new Cartesian2(positionWC.x, positionWC.y);
    };

    /**
     * Computes the screen-space position of the billboard's origin, taking into account eye and pixel offsets.
     * The screen space origin is the bottom, left corner of the canvas; <code>x</code> increases from
     * left to right, and <code>y</code> increases from bottom to top.
     *
     * @memberof Billboard
     *
     * @param {Context} context The context.
     * @param {FrameState} frameState The same state object passed to {@link BillboardCollection#update}.
     *
     * @return {Cartesian2} The screen-space position of the billboard.
     *
     * @exception {DeveloperError} Billboard must be in a collection.
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} frameState is required.
     *
     * @see Billboard#setEyeOffset
     * @see Billboard#setPixelOffset
     *
     * @example
     * console.log(b.computeScreenSpacePosition(scene.getContext(), scene.getFrameState()).toString());
     */
    Billboard.prototype.computeScreenSpacePosition = function(context, frameState) {
        var billboardCollection = this._billboardCollection;
        if (typeof billboardCollection === 'undefined') {
            throw new DeveloperError('Billboard must be in a collection.  Was it removed?');
        }

        if (typeof context === 'undefined') {
            throw new DeveloperError('context is required.');
        }

        if (typeof frameState === 'undefined') {
            throw new DeveloperError('frameState is required.');
        }

        var modelMatrix = billboardCollection.modelMatrix;
        return Billboard._computeScreenSpacePosition(modelMatrix, this._actualPosition, this._eyeOffset, this._pixelOffset, context, frameState);
    };

    /**
     * Determines if this billboard equals another billboard.  Billboards are equal if all their properties
     * are equal.  Billboards in different collections can be equal.
     *
     * @memberof Billboard
     *
     * @param {Billboard} other The billboard to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the billboards are equal; otherwise, <code>false</code>.
     */
    Billboard.prototype.equals = function(other) {
        return this === other ||
               typeof other !== 'undefined' &&
               this._show === other._show &&
               this._imageIndex === other._imageIndex &&
               this._scale === other._scale &&
               this._verticalOrigin === other._verticalOrigin &&
               this._horizontalOrigin === other._horizontalOrigin &&
               Cartesian3.equals(this._position, other._position) &&
               Color.equals(this._color, other._color) &&
               Cartesian2.equals(this._pixelOffset, other._pixelOffset) &&
               Cartesian3.equals(this._eyeOffset, other._eyeOffset);
    };

    Billboard.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._billboardCollection = undefined;
    };

    return Billboard;
});
