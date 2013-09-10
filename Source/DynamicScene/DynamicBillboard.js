/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createObservableProperty'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createObservableProperty) {
    "use strict";

    /**
     * An optionally time-dynamic billboard.
     *
     * @alias DynamicBillboard
     * @constructor
     */
    var DynamicBillboard = function() {
        this._image = undefined;
        this._scale = undefined;
        this._rotation = undefined;
        this._alignedAxis = undefined;
        this._horizontalOrigin = undefined;
        this._verticalOrigin = undefined;
        this._color = undefined;
        this._eyeOffset = undefined;
        this._pixelOffset = undefined;
        this._show = undefined;
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicBillboard.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicBillboard.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the string {@link Property} specifying the URL of the billboard's texture.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        image : createObservableProperty('image', '_image'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's scale.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        scale : createObservableProperty('scale', '_scale'),

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's rotation.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        rotation : createObservableProperty('rotation', '_rotation'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard rotation's aligned axis.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        alignedAxis : createObservableProperty('alignedAxis', '_alignedAxis'),

        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the billboard's horizontal origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        horizontalOrigin : createObservableProperty('horizontalOrigin', '_horizontalOrigin'),

        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the billboard's vertical origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        verticalOrigin : createObservableProperty('verticalOrigin', '_verticalOrigin'),

        /**
         * Gets or sets the {@link Color} {@link Property} specifying the billboard's color.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        color : createObservableProperty('color', '_color'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard's eye offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        eyeOffset : createObservableProperty('eyeOffset', '_eyeOffset'),

        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the billboard's pixel offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        pixelOffset : createObservableProperty('pixelOffset', '_pixelOffset'),

        /**
         * Gets or sets the boolean {@link Property} specifying the billboard's visibility.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        show : createObservableProperty('show', '_show')
    });

    /**
     * Duplicates a DynamicBillboard instance.
     * @memberof DynamicBillboard
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
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicBillboard
     *
     * @param {DynamicBillboard} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicBillboard.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
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
    };

    return DynamicBillboard;
});
