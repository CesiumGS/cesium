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
     * Describes a graphical point located at the position of the containing {@link Entity}.
     *
     * @alias PointGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.color=Color.WHITE] A Property specifying the {@link Color} of the point.
     * @param {Property} [options.pixelSize=1] A numeric Property specifying the size in pixels.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
     * @param {Property} [options.outlineWidth=0] A numeric Property specifying the the outline width in pixels.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the point.
     * @param {Property} [options.scaleByDistance] A {@link NearFarScalar} Property used to scale the point based on distance.
     */
    var PointGraphics = function(options) {
        this._color = undefined;
        this._colorSubscription = undefined;
        this._pixelSize = undefined;
        this._pixelSizeSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._scaleByDistance = undefined;
        this._scaleByDistanceSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(PointGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof PointGraphics.prototype
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
         * Gets or sets the Property specifying the {@link Color} of the point.
         * @memberof PointGraphics.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        color : createPropertyDescriptor('color'),

        /**
         * Gets or sets the numeric Property specifying the size in pixels.
         * @memberof PointGraphics.prototype
         * @type {Property}
         * @default 1
         */
        pixelSize : createPropertyDescriptor('pixelSize'),

        /**
         * Gets or sets the Property specifying the {@link Color} of the outline.
         * @memberof PointGraphics.prototype
         * @type {Property}
         * @default Color.BLACK
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the the outline width in pixels.
         * @memberof PointGraphics.prototype
         * @type {Property}
         * @default 0
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the boolean Property specifying the visibility of the point.
         * @memberof PointGraphics.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link NearFarScalar} Property used to scale the point based on distance.
         * If undefined, a constant size is used.
         * @memberof PointGraphics.prototype
         * @type {Property}
         */
        scaleByDistance : createPropertyDescriptor('scaleByDistance')
    });

    /**
     * Duplicates this instance.
     *
     * @param {PointGraphics} [result] The object onto which to store the result.
     * @returns {PointGraphics} The modified result parameter or a new instance if one was not provided.
     */
    PointGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new PointGraphics(this);
        }
        result.color = this.color;
        result.pixelSize = this.pixelSize;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.show = this.show;
        result.scaleByDistance = this.scaleByDistance;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {PointGraphics} source The object to be merged into this object.
     */
    PointGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.color = defaultValue(this.color, source.color);
        this.pixelSize = defaultValue(this.pixelSize, source.pixelSize);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.show = defaultValue(this.show, source.show);
        this.scaleByDistance = defaultValue(this.scaleByDistance, source.scaleByDistance);
    };

    return PointGraphics;
});
