/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createMaterialPropertyDescriptor',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createMaterialPropertyDescriptor,
        createPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic box.
     *
     * @alias BoxGraphics
     * @constructor
     */
    var BoxGraphics = function(options) {
        this._dimensions = undefined;
        this._dimensionsSubscription = undefined;
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
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the dimensions of the box.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        dimensions : createPropertyDescriptor('dimensions'),

        /**
         * Gets or sets the {@link MaterialProperty} specifying the appearance of the box.
         * @memberof BoxGraphics.prototype
         * @type {MaterialProperty}
         */
        material : createMaterialPropertyDescriptor('material'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the box should be filled.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        fill : createPropertyDescriptor('fill'),

        /**
         * Gets or sets the Boolean {@link Property} specifying whether the box should be outlined.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outline : createPropertyDescriptor('outline'),

        /**
         * Gets or sets the Color {@link Property} specifying whether the color of the outline.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the Number {@link Property} specifying the width of the outline.
         * @memberof BoxGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth')
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
        result.dimensions = this.dimensions;
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

        this.dimensions = defaultValue(this.dimensions, source.dimensions);
        this.show = defaultValue(this.show, source.show);
        this.material = defaultValue(this.material, source.material);
        this.fill = defaultValue(this.fill, source.fill);
        this.outline = defaultValue(this.outline, source.outline);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
    };

    return BoxGraphics;
});
