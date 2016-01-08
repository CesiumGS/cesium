/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    "use strict";

    /**
     * Describes a two dimensional icon located at the position of the containing {@link Entity}.
     * <p>
     * <div align='center'>
     * <img src='images/Billboard.png' width='400' height='300' /><br />
     * Example billboards
     * </div>
     * </p>
     *
     * @alias BillboardGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.image] A Property specifying the Image, URI, or Canvas to use for the billboard.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the billboard.
     * @param {Property} [options.scale=1.0] A numeric Property specifying the scale to apply to the image size.
     * @param {Property} [options.horizontalOrigin=HorizontalOrigin.CENTER] A Property specifying the {@link HorizontalOrigin}.
     * @param {Property} [options.verticalOrigin=VerticalOrigin.CENTER] A Property specifying the {@link VerticalOrigin}.
     * @param {Property} [options.eyeOffset=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the eye offset.
     * @param {Property} [options.pixelOffset=Cartesian2.ZERO] A {@link Cartesian2} Property specifying the pixel offset.
     * @param {Property} [options.rotation=0] A numeric Property specifying the rotation about the alignedAxis.
     * @param {Property} [options.alignedAxis=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the axis of rotation.
     * @param {Property} [options.width] A numeric Property specifying the width of the billboard in pixels, overriding the native size.
     * @param {Property} [options.height] A numeric Property specifying the height of the billboard in pixels, overriding the native size.
     * @param {Property} [options.color=Color.WHITE] A Property specifying the tint {@link Color} of the image.
     * @param {Property} [options.scaleByDistance] A {@link NearFarScalar} Property used to scale the point based on distance from the camera.
     * @param {Property} [options.translucencyByDistance] A {@link NearFarScalar} Property used to set translucency based on distance from the camera.
     * @param {Property} [options.pixelOffsetScaleByDistance] A {@link NearFarScalar} Property used to set pixelOffset based on distance from the camera.
     * @param {Property} [options.imageSubRegion] A Property specifying a {@link BoundingRectangle} that defines a sub-region of the image to use for the billboard, rather than the entire image.
     * @param {Property} [options.sizeInMeters] A boolean Property specifying whether this billboard's size should be measured in meters.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Billboards.html|Cesium Sandcastle Billboard Demo}
     */
    function BillboardGraphics(options) {
        this._image = undefined;
        this._imageSubscription = undefined;
        this._imageSubRegion = undefined;
        this._imageSubRegionSubscription = undefined;
        this._width = undefined;
        this._widthSubscription = undefined;
        this._height = undefined;
        this._heightSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._rotation = undefined;
        this._rotationSubscription = undefined;
        this._alignedAxis = undefined;
        this._alignedAxisSubscription = undefined;
        this._horizontalOrigin = undefined;
        this._horizontalOriginSubscription = undefined;
        this._verticalOrigin = undefined;
        this._verticalOriginSubscription = undefined;
        this._color = undefined;
        this._colorSubscription = undefined;
        this._eyeOffset = undefined;
        this._eyeOffsetSubscription = undefined;
        this._pixelOffset = undefined;
        this._pixelOffsetSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._scaleByDistance = undefined;
        this._scaleByDistanceSubscription = undefined;
        this._translucencyByDistance = undefined;
        this._translucencyByDistanceSubscription = undefined;
        this._pixelOffsetScaleByDistance = undefined;
        this._pixelOffsetScaleByDistanceSubscription = undefined;
        this._sizeInMeters = undefined;
        this._sizeInMetersSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(BillboardGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof BillboardGraphics.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the Property specifying the Image, URI, or Canvas to use for the billboard.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        image : createPropertyDescriptor('image'),

        /**
         * Gets or sets the Property specifying a {@link BoundingRectangle} that defines a
         * sub-region of the <code>image</code> to use for the billboard, rather than the entire image.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        imageSubRegion : createPropertyDescriptor('imageSubRegion'),

        /**
         * Gets or sets the numeric Property specifying the uniform scale to apply to the image.
         * A scale greater than <code>1.0</code> enlarges the billboard while a scale less than <code>1.0</code> shrinks it.
         * <p>
         * <div align='center'>
         * <img src='images/Billboard.setScale.png' width='400' height='300' /><br/>
         * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>, and <code>2.0</code>.
         * </div>
         * </p>
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the numeric Property specifying the rotation of the image
         * counter clockwise from the <code>alignedAxis</code>.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default 0
         */
        rotation : createPropertyDescriptor('rotation'),

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the axis of rotation
         * in the fixed frame. When set to Cartesian3.ZERO the rotation is from the top of the screen.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default Cartesian3.ZERO
         */
        alignedAxis : createPropertyDescriptor('alignedAxis'),

        /**
         * Gets or sets the Property specifying the {@link HorizontalOrigin}.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default HorizontalOrigin.CENTER
         */
        horizontalOrigin : createPropertyDescriptor('horizontalOrigin'),

        /**
         * Gets or sets the Property specifying the {@link VerticalOrigin}.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default VerticalOrigin.CENTER
         */
        verticalOrigin : createPropertyDescriptor('verticalOrigin'),

        /**
         * Gets or sets the Property specifying the {@link Color} that is multiplied with the <code>image</code>.
         * This has two common use cases.  First, the same white texture may be used by many different billboards,
         * each with a different color, to create colored billboards. Second, the color's alpha component can be
         * used to make the billboard translucent as shown below. An alpha of <code>0.0</code> makes the billboard
         * transparent, and <code>1.0</code> makes the billboard opaque.
         * <p>
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>default</code><br/><img src='images/Billboard.setColor.Alpha255.png' width='250' height='188' /></td>
         * <td align='center'><code>alpha : 0.5</code><br/><img src='images/Billboard.setColor.Alpha127.png' width='250' height='188' /></td>
         * </tr></table>
         * </div>
         * </p>
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        color : createPropertyDescriptor('color'),

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the billboard's offset in eye coordinates.
         * Eye coordinates is a left-handed coordinate system, where <code>x</code> points towards the viewer's
         * right, <code>y</code> points up, and <code>z</code> points into the screen.
         * <p>
         * An eye offset is commonly used to arrange multiple billboards or objects at the same position, e.g., to
         * arrange a billboard above its corresponding 3D model.
         * </p>
         * Below, the billboard is positioned at the center of the Earth but an eye offset makes it always
         * appear on top of the Earth regardless of the viewer's or Earth's orientation.
         * <p>
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><img src='images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
         * <td align='center'><img src='images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
         * </tr></table>
         * <code>b.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code>
         * </div>
         * </p>
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default Cartesian3.ZERO
         */
        eyeOffset : createPropertyDescriptor('eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} Property specifying the billboard's pixel offset in screen space
         * from the origin of this billboard.  This is commonly used to align multiple billboards and labels at
         * the same position, e.g., an image and text.  The screen space origin is the top, left corner of the
         * canvas; <code>x</code> increases from left to right, and <code>y</code> increases from top to bottom.
         * <p>
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>default</code><br/><img src='images/Billboard.setPixelOffset.default.png' width='250' height='188' /></td>
         * <td align='center'><code>b.pixeloffset = new Cartesian2(50, 25);</code><br/><img src='images/Billboard.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
         * </tr></table>
         * The billboard's origin is indicated by the yellow point.
         * </div>
         * </p>
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default Cartesian2.ZERO
         */
        pixelOffset : createPropertyDescriptor('pixelOffset'),

        /**
         * Gets or sets the boolean Property specifying the visibility of the billboard.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric Property specifying the billboard's width in pixels.
         * When undefined, the native width is used.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        width : createPropertyDescriptor('width'),

        /**
         * Gets or sets the numeric Property specifying the height of the billboard in pixels.
         * When undefined, the native height is used.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),

        /**
         * Gets or sets {@link NearFarScalar} Property specifying the scale of the billboard based on the distance from the camera.
         * A billboard's scale will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the billboard's scale remains clamped to the nearest bound.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        scaleByDistance : createPropertyDescriptor('scaleByDistance'),

        /**
         * Gets or sets {@link NearFarScalar} Property specifying the translucency of the billboard based on the distance from the camera.
         * A billboard's translucency will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the billboard's translucency remains clamped to the nearest bound.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        translucencyByDistance : createPropertyDescriptor('translucencyByDistance'),

        /**
         * Gets or sets {@link NearFarScalar} Property specifying the pixel offset of the billboard based on the distance from the camera.
         * A billboard's pixel offset will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the billboard's pixel offset remains clamped to the nearest bound.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         */
        pixelOffsetScaleByDistance : createPropertyDescriptor('pixelOffsetScaleByDistance'),

        /**
         * Gets or sets the boolean Property specifying if this billboard's size will be measured in meters.
         * @memberof BillboardGraphics.prototype
         * @type {Property}
         * @default false
         */
        sizeInMeters : createPropertyDescriptor('sizeInMeters')
    });

    /**
     * Duplicates this instance.
     *
     * @param {BillboardGraphics} [result] The object onto which to store the result.
     * @returns {BillboardGraphics} The modified result parameter or a new instance if one was not provided.
     */
    BillboardGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new BillboardGraphics(this);
        }
        result.color = this._color;
        result.eyeOffset = this._eyeOffset;
        result.horizontalOrigin = this._horizontalOrigin;
        result.image = this._image;
        result.imageSubRegion = this._imageSubRegion;
        result.pixelOffset = this._pixelOffset;
        result.scale = this._scale;
        result.rotation = this._rotation;
        result.alignedAxis = this._alignedAxis;
        result.show = this._show;
        result.verticalOrigin = this._verticalOrigin;
        result.width = this._width;
        result.height = this._height;
        result.scaleByDistance = this._scaleByDistance;
        result.translucencyByDistance = this._translucencyByDistance;
        result.pixelOffsetScaleByDistance = this._pixelOffsetScaleByDistance;
        result.sizeInMeters = this._sizeInMeters;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {BillboardGraphics} source The object to be merged into this object.
     */
    BillboardGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.color = defaultValue(this._color, source.color);
        this.eyeOffset = defaultValue(this._eyeOffset, source.eyeOffset);
        this.horizontalOrigin = defaultValue(this._horizontalOrigin, source.horizontalOrigin);
        this.image = defaultValue(this._image, source.image);
        this.imageSubRegion = defaultValue(this._imageSubRegion, source.imageSubRegion);
        this.pixelOffset = defaultValue(this._pixelOffset, source.pixelOffset);
        this.scale = defaultValue(this._scale, source.scale);
        this.rotation = defaultValue(this._rotation, source.rotation);
        this.alignedAxis = defaultValue(this._alignedAxis, source.alignedAxis);
        this.show = defaultValue(this._show, source.show);
        this.verticalOrigin = defaultValue(this._verticalOrigin, source.verticalOrigin);
        this.width = defaultValue(this._width, source.width);
        this.height = defaultValue(this._height, source.height);
        this.scaleByDistance = defaultValue(this._scaleByDistance, source.scaleByDistance);
        this.translucencyByDistance = defaultValue(this._translucencyByDistance, source.translucencyByDistance);
        this.pixelOffsetScaleByDistance = defaultValue(this._pixelOffsetScaleByDistance, source.pixelOffsetScaleByDistance);
        this.sizeInMeters = defaultValue(this._sizeInMeters, source.sizeInMeters);
    };

    return BillboardGraphics;
});
