/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic billboard.
     *
     * @alias DynamicBillboard
     * @constructor
     */
    var DynamicBillboard = function() {
        this._image = undefined;
        this._imageSubscription = undefined;
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
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicBillboard.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicBillboard.prototype
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
         * Gets or sets the string {@link Property} specifying the URL of the billboard's texture.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        image : createDynamicPropertyDescriptor('image'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's scale.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        scale : createDynamicPropertyDescriptor('scale'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's rotation.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        rotation : createDynamicPropertyDescriptor('rotation'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard rotation's aligned axis.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        alignedAxis : createDynamicPropertyDescriptor('alignedAxis'),

        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the billboard's horizontal origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        horizontalOrigin : createDynamicPropertyDescriptor('horizontalOrigin'),

        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the billboard's vertical origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        verticalOrigin : createDynamicPropertyDescriptor('verticalOrigin'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the billboard's color.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        color : createDynamicPropertyDescriptor('color'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard's eye offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        eyeOffset : createDynamicPropertyDescriptor('eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the billboard's pixel offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        pixelOffset : createDynamicPropertyDescriptor('pixelOffset'),

        /**
         * Gets or sets the boolean {@link Property} specifying the billboard's visibility.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's width in pixels.
         * If undefined, the native width is used.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        width : createDynamicPropertyDescriptor('width'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's height in pixels.
         * If undefined, the native height is used.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        height : createDynamicPropertyDescriptor('height'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to scale billboards based on distance.
         * If undefined, a constant size is used.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        scaleByDistance : createDynamicPropertyDescriptor('scaleByDistance'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set translucency based on distance.
         * If undefined, a constant size is used.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        translucencyByDistance : createDynamicPropertyDescriptor('translucencyByDistance'),

        /**
         * Gets or sets the {@link NearFarScalar} {@link Property} used to set pixel offset scaling based on distance.
         * If undefined, no additional scale is applied to the pixel offset
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        pixelOffsetScaleByDistance : createDynamicPropertyDescriptor('pixelOffsetScaleByDistance')
    });

    /**
     * Duplicates a DynamicBillboard instance.
     *
     * @param {DynamicBillboard} [result] The object onto which to store the result.
     * @returns {DynamicBillboard} The modified result parameter or a new instance if one was not provided.
     */
    DynamicBillboard.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicBillboard();
        }
        result.color = this._color;
        result.eyeOffset = this._eyeOffset;
        result.horizontalOrigin = this._horizontalOrigin;
        result.image = this._image;
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
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicBillboard} source The object to be merged into this object.
     */
    DynamicBillboard.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.color = defaultValue(this._color, source._color);
        this.eyeOffset = defaultValue(this._eyeOffset, source._eyeOffset);
        this.horizontalOrigin = defaultValue(this._horizontalOrigin, source._horizontalOrigin);
        this.image = defaultValue(this._image, source._image);
        this.pixelOffset = defaultValue(this._pixelOffset, source._pixelOffset);
        this.scale = defaultValue(this._scale, source._scale);
        this.rotation = defaultValue(this._rotation, source._rotation);
        this.alignedAxis = defaultValue(this._alignedAxis, source._alignedAxis);
        this.show = defaultValue(this._show, source._show);
        this.verticalOrigin = defaultValue(this._verticalOrigin, source._verticalOrigin);
        this.width = defaultValue(this._width, source._width);
        this.height = defaultValue(this._height, source._height);
        this.scaleByDistance = defaultValue(this._scaleByDistance, source._scaleByDistance);
        this.translucencyByDistance = defaultValue(this._translucencyByDistance, source._translucencyByDistance);
        this.pixelOffsetScaleByDistance = defaultValue(this._pixelOffsetScaleByDistance, source._pixelOffsetScaleByDistance);
    };

    return DynamicBillboard;
});
