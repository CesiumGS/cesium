/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './PropertyHelper'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        PropertyHelper) {
    "use strict";

    /**
     * An optionally time-dynamic box.
     *
     * @alias BoxGraphics
     * @constructor
     */
    var BoxGraphics = function(options) {
        this._minimumCorner = undefined;
        this._minimumCornerSubscription = undefined;
        this._maximumCorner = undefined;
        this._maximumCornerSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._fill = undefined;
        this._fillSubscription = undefined;
        this._material = undefined;
        this._materialSubscription = undefined;
        this._outline = undefined;
        this._outlineSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(BoxGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof BoxGraphics.prototype
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
         * Gets or sets the boolean {@link Property} specifying the box's visibility.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        show : PropertyHelper.createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Cartesian3} specifying the box's minimum corner.
         * @memberof BoxGraphics.prototype
         * @type {PositionProperty}
         */
        minimumCorner : PropertyHelper.createPropertyDescriptor('minimumCorner'),

        /**
         * Gets or sets the {@link Cartesian3} specifying the box's maximum corner.
         * @memberof BoxGraphics.prototype
         * @type {PositionProperty}
         */
        maximumCorner : PropertyHelper.createPropertyDescriptor('maximumCorner'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the box.
         * @memberof BoxGraphics.prototype
         * @type {MaterialProperty}
         */
        material : PropertyHelper.createPropertyDescriptor('material'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the box should be filled.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        fill : PropertyHelper.createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the box should be outlined.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outline : PropertyHelper.createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outlineColor : PropertyHelper.createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outlineWidth : PropertyHelper.createPropertyDescriptor('outlineWidth')
    });

    /**
     * Duplicates a BoxGraphics instance.
     *
     * @param {BoxGraphics} [result] The object onto which to store the result.
     * @returns {BoxGraphics} The modified result parameter or a new instance if one was not provided.
     */
    BoxGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new BoxGraphics();
        }
        result.minimumCorner = this.minimumCorner;
        result.maximumCorner = this.maximumCorner;
        result.show = this.show;
        result.material = this.material;
        result.fill = this.fill;
        result.outline = this.outline;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {BoxGraphics} source The object to be merged into this object.
     */
    BoxGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.minimumCorner = defaultValue(this.minimumCorner, source.minimumCorner);
        this.maximumCorner = defaultValue(this.maximumCorner, source.maximumCorner);
        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
    };

    return BoxGraphics;
});
