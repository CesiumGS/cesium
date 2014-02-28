/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/NearFarScalar',
        '../Core/Matrix4',
        './HorizontalOrigin',
        './VerticalOrigin',
        './SceneMode',
        './SceneTransforms'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Color,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        NearFarScalar,
        Matrix4,
        HorizontalOrigin,
        VerticalOrigin,
        SceneMode,
        SceneTransforms) {
    "use strict";

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
     * @exception {DeveloperError} scaleByDistance.far must be greater than scaleByDistance.near
     * @exception {DeveloperError} translucencyByDistance.far must be greater than translucencyByDistance.near
     * @exception {DeveloperError} pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near
     *
     * @see BillboardCollection
     * @see BillboardCollection#add
     * @see Label
     *
     * @internalConstructor
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Billboards.html">Cesium Sandcastle Billboard Demo</a>
     */
    var Billboard = function(options, billboardCollection) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (defined(options.scaleByDistance) && options.scaleByDistance.far <= options.scaleByDistance.near) {
            throw new DeveloperError('scaleByDistance.far must be greater than scaleByDistance.near.');
        }
        if (defined(options.translucencyByDistance) &&
                options.translucencyByDistance.far <= options.translucencyByDistance.near) {
            throw new DeveloperError('translucencyByDistance.far must be greater than translucencyByDistance.near.');
        }
        if (defined(options.pixelOffsetScaleByDistance) &&
                options.pixelOffsetScaleByDistance.far <= options.pixelOffsetScaleByDistance.near) {
            throw new DeveloperError('pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near.');
        }
        //>>includeEnd('debug');

        this._show = defaultValue(options.show, true);
        this._position = Cartesian3.clone(defaultValue(options.position, Cartesian3.ZERO));
        this._actualPosition = Cartesian3.clone(this._position); // For columbus view and 2D
        this._pixelOffset = Cartesian2.clone(defaultValue(options.pixelOffset, Cartesian2.ZERO));
        this._translate = new Cartesian2(0.0, 0.0); // used by labels for glyph vertex translation
        this._eyeOffset = Cartesian3.clone(defaultValue(options.eyeOffset, Cartesian3.ZERO));
        this._verticalOrigin = defaultValue(options.verticalOrigin, VerticalOrigin.CENTER);
        this._horizontalOrigin = defaultValue(options.horizontalOrigin, HorizontalOrigin.CENTER);
        this._scale = defaultValue(options.scale, 1.0);
        this._imageIndex = defaultValue(options.imageIndex, -1);
        this._color = Color.clone(defaultValue(options.color, Color.WHITE));
        this._rotation = defaultValue(options.rotation, 0.0);
        this._alignedAxis = Cartesian3.clone(defaultValue(options.alignedAxis, Cartesian3.ZERO));
        this._width = options.width;
        this._height = options.height;
        this._scaleByDistance = options.scaleByDistance;
        this._translucencyByDistance = options.translucencyByDistance;
        this._pixelOffsetScaleByDistance = options.pixelOffsetScaleByDistance;
        this._id = options.id;
        this._collection = defaultValue(options.collection, billboardCollection);

        this._pickId = undefined;
        this._pickIdThis = options._pickIdThis;
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
    var ROTATION_INDEX = Billboard.ROTATION_INDEX = 9;
    var ALIGNED_AXIS_INDEX = Billboard.ALIGNED_AXIS_INDEX = 10;
    var SCALE_BY_DISTANCE_INDEX = Billboard.SCALE_BY_DISTANCE_INDEX = 11;
    var TRANSLUCENCY_BY_DISTANCE_INDEX = Billboard.TRANSLUCENCY_BY_DISTANCE_INDEX = 12;
    var PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX = Billboard.PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX = 13;
    Billboard.NUMBER_OF_PROPERTIES = 14;

    function makeDirty(billboard, propertyChanged) {
        var billboardCollection = billboard._billboardCollection;
        if (defined(billboardCollection)) {
            billboardCollection._updateBillboard(billboard, propertyChanged);
            billboard._dirty = true;
        }
    }

    Billboard.prototype.getPickId = function(context) {
        if (!defined(this._pickId)) {
            this._pickId = context.createPickId({
                primitive : defaultValue(this._pickIdThis, this),
                collection : this._collection,
                id : this._id
            });
        }

        return this._pickId;
    };

    /**
     * Returns true if this billboard will be shown.  Call {@link Billboard#setShow}
     * to hide or show a billboard, instead of removing it and re-adding it to the collection.
     *
     * @memberof Billboard
     *
     * @returns {Boolean} <code>true</code> if this billboard will be shown; otherwise, <code>false</code>.
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
     * @see Billboard#getShow
     */
    Billboard.prototype.setShow = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {Cartesian3} The Cartesian position of this billboard.
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
     * @see Billboard#getPosition
     *
     * @example
     * // Example 1. Set a billboard's position using a Cartesian3.
     * b.setPosition(new Cesium.Cartesian3(1.0, 2.0, 3.0));
     *
     * // Example 2. Set a billboard's position using an object literal.
     * b.setPosition({
     *   x : 1.0,
     *   y : 2.0,
     *   z : 3.0
     * });
     */
    Billboard.prototype.setPosition = function(value) {
        //>>includeStart('debug', pragmas.debug)
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {Cartesian2} The pixel offset of this billboard.
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
     * @see Billboard#getPixelOffset
     * @see Label#setPixelOffset
     */
    Billboard.prototype.setPixelOffset = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var pixelOffset = this._pixelOffset;
        if (!Cartesian2.equals(pixelOffset, value)) {
            Cartesian2.clone(value, pixelOffset);
            makeDirty(this, PIXEL_OFFSET_INDEX);
        }
    };

    Billboard.prototype._setTranslate = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var translate = this._translate;
        if (!Cartesian2.equals(translate, value)) {
            Cartesian2.clone(value, translate);
            makeDirty(this, PIXEL_OFFSET_INDEX);
        }
    };

    /**
     * Returns the near and far scaling properties of a Billboard based on the billboard's distance from the camera.
     *
     * @memberof Billboard
     *
     * @returns {NearFarScalar} The near/far scaling values based on camera distance to the billboard
     *
     * @see Billboard#setScaleByDistance
     */
    Billboard.prototype.getScaleByDistance = function() {
        return this._scaleByDistance;
    };

    /**
     * Sets near and far scaling properties of a Billboard based on the billboard's distance from the camera.
     * A billboard's scale will interpolate between the {@link NearFarScalar#nearValue} and
     * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
     * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
     * Outside of these ranges the billboard's scale remains clamped to the nearest bound.  If undefined,
     * scaleByDistance will be disabled.
     *
     * @memberof Billboard
     *
     * @param {NearFarScalar} scale The configuration of near and far distances and their respective scale values
     *
     * @exception {DeveloperError} far distance must be greater than near distance.
     *
     * @see Billboard#getScaleByDistance
     *
     * @example
     * // Example 1.
     * // Set a billboard's scaleByDistance to scale by 1.5 when the
     * // camera is 1500 meters from the billboard and disappear as
     * // the camera distance approaches 8.0e6 meters.
     * b.setScaleByDistance(new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e6, 0.0));
     *
     * // Example 2.
     * // disable scaling by distance
     * b.setScaleByDistance(undefined);
     */
    Billboard.prototype.setScaleByDistance = function(scale) {
        if (NearFarScalar.equals(this._scaleByDistance, scale)) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (scale.far <= scale.near) {
            throw new DeveloperError('far distance must be greater than near distance.');
        }
        //>>includeEnd('debug');

        makeDirty(this, SCALE_BY_DISTANCE_INDEX);
        this._scaleByDistance = NearFarScalar.clone(scale, this._scaleByDistance);
    };

    /**
     * Returns the near and far translucency properties of a Billboard based on the billboard's distance from the camera.
     *
     * @memberof Billboard
     *
     * @returns {NearFarScalar} The near/far translucency values based on camera distance to the billboard
     *
     * @see Billboard#setTranslucencyByDistance
     */
    Billboard.prototype.getTranslucencyByDistance = function() {
        return this._translucencyByDistance;
    };

    /**
     * Sets near and far translucency properties of a Billboard based on the billboard's distance from the camera.
     * A billboard's translucency will interpolate between the {@link NearFarScalar#nearValue} and
     * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
     * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
     * Outside of these ranges the billboard's translucency remains clamped to the nearest bound.  If undefined,
     * translucencyByDistance will be disabled.
     *
     * @memberof Billboard
     *
     * @param {NearFarScalar} translucency The configuration of near and far distances and their respective translucency values
     *
     * @exception {DeveloperError} far distance must be greater than near distance.
     *
     * @see Billboard#getTranslucencyByDistance
     *
     * @example
     * // Example 1.
     * // Set a billboard's translucency to 1.0 when the
     * // camera is 1500 meters from the billboard and disappear as
     * // the camera distance approaches 8.0e6 meters.
     * b.setTranslucencyByDistance(new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0));
     *
     * // Example 2.
     * // disable translucency by distance
     * b.setTranslucencyByDistance(undefined);
     */
    Billboard.prototype.setTranslucencyByDistance = function(translucency) {
        if (NearFarScalar.equals(this._translucencyByDistance, translucency)) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (translucency.far <= translucency.near) {
            throw new DeveloperError('far distance must be greater than near distance.');
        }
        //>>includeEnd('debug');

        makeDirty(this, TRANSLUCENCY_BY_DISTANCE_INDEX);
        this._translucencyByDistance = NearFarScalar.clone(translucency, this._translucencyByDistance);
    };

    /**
     * Returns the near and far pixel offset scaling properties of a Billboard based on the billboard's distance from the camera.
     *
     * @memberof Billboard
     *
     * @returns {NearFarScalar} The near/far pixel offset scaling values based on camera distance to the billboard
     *
     * @see Billboard#setPixelOffsetScaleByDistance
     * @see Billboard#setPixelOffset
     * @see Billboard#getPixelOffset
     */
    Billboard.prototype.getPixelOffsetScaleByDistance = function() {
        return this._pixelOffsetScaleByDistance;
    };

    /**
     * Sets near and far pixel offset scaling properties of a Billboard based on the billboard's distance from the camera.
     * A billboard's pixel offset will be scaled between the {@link NearFarScalar#nearValue} and
     * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
     * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
     * Outside of these ranges the billboard's pixel offset scale remains clamped to the nearest bound.  If undefined,
     * pixelOffsetScaleByDistance will be disabled.
     *
     * @memberof Billboard
     *
     * @param {NearFarScalar} pixelOffsetScale The configuration of near and far distances and their respective pixel offset scaling values
     *
     * @exception {DeveloperError} far distance must be greater than near distance.
     *
     * @see Billboard#getPixelOffsetScaleByDistance
     * @see Billboard#setPixelOffset
     * @see Billboard#getPixelOffset
     *
     * @example
     * // Example 1.
     * // Set a billboard's pixel offset scale to 0.0 when the
     * // camera is 1500 meters from the billboard and scale pixel offset to 10.0 pixels
     * // in the y direction the camera distance approaches 8.0e6 meters.
     * b.setPixelOffset(new Cesium.Cartesian2(0.0, 1.0);
     * b.setPixelOffsetScaleByDistance(new Cesium.NearFarScalar(1.5e2, 0.0, 8.0e6, 10.0));
     *
     * // Example 2.
     * // disable pixel offset by distance
     * b.setPixelOffsetScaleByDistance(undefined);
     */
    Billboard.prototype.setPixelOffsetScaleByDistance = function(pixelOffsetScale) {
        if (NearFarScalar.equals(this._pixelOffsetScaleByDistance, pixelOffsetScale)) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (pixelOffsetScale.far <= pixelOffsetScale.near) {
            throw new DeveloperError('far distance must be greater than near distance.');
        }
        //>>includeEnd('debug');

        makeDirty(this, PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX);
        this._pixelOffsetScaleByDistance = NearFarScalar.clone(pixelOffsetScale, this._pixelOffsetScaleByDistance);
    };

    /**
     * Returns the 3D Cartesian offset applied to this billboard in eye coordinates.
     *
     * @memberof Billboard
     *
     * @returns {Cartesian3} The 3D Cartesian offset applied to this billboard in eye coordinates.
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
     * @see Billboard#getEyeOffset
     */
    Billboard.prototype.setEyeOffset = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {HorizontalOrigin} The horizontal origin of this billboard.
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
     * @see Billboard#getHorizontalOrigin
     * @see Billboard#setVerticalOrigin
     *
     * @example
     * // Use a bottom, left origin
     * b.setHorizontalOrigin(Cesium.HorizontalOrigin.LEFT);
     * b.setVerticalOrigin(Cesium.VerticalOrigin.BOTTOM);
     */
    Billboard.prototype.setHorizontalOrigin = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {VerticalOrigin} The vertical origin of this billboard.
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
     * @see Billboard#getVerticalOrigin
     * @see Billboard#setHorizontalOrigin
     *
     * @example
     * // Use a bottom, left origin
     * b.setHorizontalOrigin(Cesium.HorizontalOrigin.LEFT);
     * b.setVerticalOrigin(Cesium.VerticalOrigin.BOTTOM);
     */
    Billboard.prototype.setVerticalOrigin = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {Number} The scale used to size the billboard.
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
     * @see Billboard#getScale
     * @see Billboard#setImageIndex
     */
    Billboard.prototype.setScale = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @see BillboardCollection#textureAtlas
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
     * @see BillboardCollection#textureAtlas
     */
    Billboard.prototype.setImageIndex = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (typeof value !== 'number') {
            throw new DeveloperError('value is required and must be a number.');
        }
        //>>includeEnd('debug');

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
     * @returns {Number} The color that is multiplied with the billboard's texture.
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var color = this._color;
        if (!Color.equals(color, value)) {
            Color.clone(value, color);
            makeDirty(this, COLOR_INDEX);
        }
    };

    /**
     * Gets the rotation angle in radians.
     *
     * @memberof Billboard
     *
     * @returns {Number} The rotation angle in radians.
     *
     * @see Billboard#setRotation
     * @see Billboard#getAlignedAxis
     * @see Billboard#setAlignedAxis
     */
    Billboard.prototype.getRotation = function() {
        return this._rotation;
    };

    /**
     * Sets the rotation angle in radians.
     *
     * @memberof Billboard
     *
     * @param {Number} value The rotation angle in radians.
     *
     * @see Billboard#getRotation
     * @see Billboard#getAlignedAxis
     * @see Billboard#setAlignedAxis
     */
    Billboard.prototype.setRotation = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        if (this._rotation !== value) {
            this._rotation = value;
            makeDirty(this, ROTATION_INDEX);
        }
    };

    /**
     * Gets the aligned axis in world space. The aligned axis is the unit vector that the billboard up vector points towards.
     * The default is the zero vector, which means the billboard is aligned to the screen up vector.
     *
     * @memberof Billboard
     *
     * @returns {Cartesian3} The aligned axis.
     *
     * @see Billboard#setRotation
     * @see Billboard#getRotation
     * @see Billboard#setAlignedAxis
     */
    Billboard.prototype.getAlignedAxis = function() {
        return this._alignedAxis;
    };

    /**
     * Sets the aligned axis in world space. The aligned axis is the unit vector that the billboard up vector points towards.
     * The default is the zero vector, which means the billboard is aligned to the screen up vector.
     *
     * @memberof Billboard
     *
     * @param {Cartesian3} value The aligned axis.
     *
     * @see Billboard#setRotation
     * @see Billboard#getRotation
     * @see Billboard#setAlignedAxis
     *
     * @example
     * // Example 1.
     * // Have the billboard up vector point north
     * billboard.setAlignedAxis(Cesium.Cartesian3.UNIT_Z);
     *
     * // Example 2.
     * // Have the billboard point east.
     * billboard.setAlignedAxis(Cartesian3.UNIT_Z);
     * billboard.setRotation(-Cesium.Math.PI_OVER_TWO);
     *
     * // Example 3.
     * // Reset the aligned axis
     * billboard.setAlignedAxis(Cesium.Cartesian3.ZERO);
     */
    Billboard.prototype.setAlignedAxis = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var axis = this._alignedAxis;
        if (!Cartesian3.equals(axis, value)) {
            Cartesian3.clone(value, axis);
            makeDirty(this, ALIGNED_AXIS_INDEX);
        }
    };

    /**
     * Gets the billboards custom width or undefined if the image width is used.
     *
     * @memberof Billboard
     *
     * @returns {Number} The billboard's width or undefined.
     *
     * @see Billboard#setWidth
     * @see Billboard#getHeight
     * @see Billboard#setHeight
     */
    Billboard.prototype.getWidth = function() {
        return this._width;
    };

    /**
     * Sets a custom width for the billboard. If undefined, the image width will be used.
     *
     * @memberof Billboard
     *
     * @param {Number} value The width of the billboard or undefined to use the image width.
     *
     * @see Billboard#getWidth
     * @see Billboard#getHeight
     * @see Billboard#setHeight
     */
    Billboard.prototype.setWidth = function(value) {
        if (this._width !== value) {
            this._width = value;
            makeDirty(this, IMAGE_INDEX_INDEX);
        }
    };

    /**
     * Gets the billboards custom height or undefined if the image height is used.
     *
     * @memberof Billboard
     *
     * @returns {Number} The billboard's height or undefined.
     *
     * @see Billboard#setHeight
     * @see Billboard#getWidth
     * @see Billboard#setWidth
     */
    Billboard.prototype.getHeight = function() {
        return this._height;
    };

    /**
     * Sets a custom height for the billboard. If undefined, the image height will be used.
     *
     * @memberof Billboard
     *
     * @param {Number} value The height of the billboard or undefined to use the image height.
     *
     * @see Billboard#getHeight
     * @see Billboard#getWidth
     * @see Billboard#setWidth
     */
    Billboard.prototype.setHeight = function(value) {
        if (this._height !== value) {
            this._height = value;
            makeDirty(this, IMAGE_INDEX_INDEX);
        }
    };

    /**
     * Returns the user-defined object returned when the billboard is picked.
     *
     * @memberof Billboard
     *
     * @returns {Object} The user-defined object returned when the billboard is picked.
     */
    Billboard.prototype.getId = function() {
        return this._id;
    };

    var tempCartesian3 = new Cartesian4();
    Billboard._computeActualPosition = function(position, frameState, modelMatrix) {
        if (frameState.mode === SceneMode.SCENE3D) {
            return position;
        }

        Matrix4.multiplyByPoint(modelMatrix, position, tempCartesian3);
        return SceneTransforms.computeActualWgs84Position(frameState, tempCartesian3);
    };

    var scracthMatrix4 = new Matrix4();
    var scratchCartesian4 = new Cartesian4();
    var scrachEyeOffset = new Cartesian3();
    var scratchCartesian2 = new Cartesian2();
    Billboard._computeScreenSpacePosition = function(modelMatrix, position, eyeOffset, pixelOffset, context, frameState) {
        // This function is basically a stripped-down JavaScript version of BillboardCollectionVS.glsl
        var camera = frameState.camera;
        var view = camera.viewMatrix;
        var projection = camera.frustum.projectionMatrix;

        // Model to eye coordinates
        var mv = Matrix4.multiplyTransformation(view, modelMatrix, scracthMatrix4);
        var positionEC = Matrix4.multiplyByVector(mv, Cartesian4.fromElements(position.x, position.y, position.z, 1, scratchCartesian4), scratchCartesian4);

        // Apply eye offset, e.g., czm_eyeOffset
        var zEyeOffset = Cartesian3.multiplyComponents(eyeOffset, Cartesian3.normalize(positionEC, scrachEyeOffset), scrachEyeOffset);
        positionEC.x += eyeOffset.x + zEyeOffset.x;
        positionEC.y += eyeOffset.y + zEyeOffset.y;
        positionEC.z += zEyeOffset.z;

        var positionCC = Matrix4.multiplyByVector(projection, positionEC, scratchCartesian4); // clip coordinates
        var positionWC = SceneTransforms.clipToWindowCoordinates(context, positionCC, new Cartesian2());

        // Apply pixel offset
        var uniformState = context.getUniformState();
        var po = Cartesian2.multiplyByScalar(pixelOffset, uniformState.getHighResolutionSnapScale(), scratchCartesian2);
        positionWC.x += po.x;
        positionWC.y += po.y;

        return positionWC;
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
     * @returns {Cartesian2} The screen-space position of the billboard.
     *
     * @exception {DeveloperError} Billboard must be in a collection.
     *
     * @see Billboard#setEyeOffset
     * @see Billboard#setPixelOffset
     *
     * @example
     * console.log(b.computeScreenSpacePosition(scene.context, scene.frameState).toString());
     */
    var tempPixelOffset = new Cartesian2(0.0, 0.0);
    Billboard.prototype.computeScreenSpacePosition = function(context, frameState) {
        var billboardCollection = this._billboardCollection;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(billboardCollection)) {
            throw new DeveloperError('Billboard must be in a collection.  Was it removed?');
        }
        if (!defined(context)) {
            throw new DeveloperError('context is required.');
        }
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        //>>includeEnd('debug');

        // pixel offset for screenspace computation is the pixelOffset + screenspace translate
        Cartesian2.clone(this._pixelOffset, tempPixelOffset);
        Cartesian2.add(tempPixelOffset, this._translate, tempPixelOffset);

        var modelMatrix = billboardCollection.modelMatrix;
        return Billboard._computeScreenSpacePosition(modelMatrix, this._actualPosition, this._eyeOffset, tempPixelOffset, context, frameState);
    };

    /**
     * Determines if this billboard equals another billboard.  Billboards are equal if all their properties
     * are equal.  Billboards in different collections can be equal.
     *
     * @memberof Billboard
     *
     * @param {Billboard} other The billboard to compare for equality.
     *
     * @returns {Boolean} <code>true</code> if the billboards are equal; otherwise, <code>false</code>.
     */
    Billboard.prototype.equals = function(other) {
        return this === other ||
               defined(other) &&
               this._show === other._show &&
               this._imageIndex === other._imageIndex &&
               this._scale === other._scale &&
               this._verticalOrigin === other._verticalOrigin &&
               this._horizontalOrigin === other._horizontalOrigin &&
               Cartesian3.equals(this._position, other._position) &&
               Color.equals(this._color, other._color) &&
               Cartesian2.equals(this._pixelOffset, other._pixelOffset) &&
               Cartesian2.equals(this._translate, other._translate) &&
               Cartesian3.equals(this._eyeOffset, other._eyeOffset) &&
               NearFarScalar.equals(this._scaleByDistance, other._scaleByDistance) &&
               NearFarScalar.equals(this._translucencyByDistance, other._translucencyByDistance) &&
               NearFarScalar.equals(this._pixelOffsetScaleByDistance, other._pixelOffsetScaleByDistance) &&
               this._id === other._id;
    };

    Billboard.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._billboardCollection = undefined;
    };

    return Billboard;
});
