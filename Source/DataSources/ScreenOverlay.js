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
     * Describes a polyline defined as the path made by an {@link Entity} as it moves over time.
     *
     * @alias ScreenOverlay
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the path.
     * @param {Property} [options.rotation=1.0] A numeric Property specifying the rotation in pixels.
     * @param {Property} [options.position] A Property specifying the position used to draw the path.
     * @param {Property} [options.rotationCenter=60] A numeric Property specifying the rotation in pixels.
     */
    var ScreenOverlay = function(options) {
        this._html = undefined;
        this._htmlSubscription = undefined;
        this._position = undefined;
        this._positionSubscription = undefined;
        this._rotation = undefined;
        this._rotationSubscription = undefined;
        this._rotationCenter = undefined;
        this._rotationCenterSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._horizontalOrigin = undefined;
        this._horizontalOriginSubscription = undefined;
        this._verticalOrigin = undefined;
        this._verticalOriginSubscription = undefined;

        this._definitionChanged = new Event();
        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    };

    defineProperties(ScreenOverlay.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof ScreenOverlay.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean Property specifying the visibility of the path.
         * @memberof ScreenOverlay.prototype
         * @type {Property}
         * @default true
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets the Property specifying the position used to draw the path.
         * @memberof ScreenOverlay.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        html : createPropertyDescriptor('html'),

        /**
         * Gets or sets the Property specifying the position used to draw the path.
         * @memberof ScreenOverlay.prototype
         * @type {Property}
         * @default Color.WHITE
         */
        position : createPropertyDescriptor('position'),

        /**
         * Gets or sets the numeric Property specifying the rotation in pixels.
         * @memberof ScreenOverlay.prototype
         * @type {Property}
         * @default 1.0
         */
        rotation : createPropertyDescriptor('rotation'),

        /**
         * Gets or sets the Property specifying the maximum number of seconds to step when sampling the position.
         * @memberof ScreenOverlay.prototype
         * @type {Property}
         * @default 60
         */
        rotationCenter : createPropertyDescriptor('rotationCenter'),

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
        verticalOrigin : createPropertyDescriptor('verticalOrigin')
    });

    /**
     * Duplicates this instance.
     *
     * @param {ScreenOverlay} [result] The object onto which to store the result.
     * @returns {ScreenOverlay} The modified result parameter or a new instance if one was not provided.
     */
    ScreenOverlay.prototype.clone = function(result) {
        if (!defined(result)) {
            return new ScreenOverlay(this);
        }
        result.html = this.html;
        result.position = this.position;
        result.rotation = this.rotation;
        result.rotationCenter = this.rotationCenter;
        result.show = this.show;
        result.horizontalOrigin = this._horizontalOrigin;
        result.verticalOrigin = this._verticalOrigin;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {ScreenOverlay} source The object to be merged into this object.
     */
    ScreenOverlay.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.html = defaultValue(this.html, source.html);
        this.position = defaultValue(this.position, source.position);
        this.rotation = defaultValue(this.rotation, source.rotation);
        this.rotationCenter = defaultValue(this.rotationCenter, source.rotationCenter);
        this.show = defaultValue(this.show, source.show);
        this.horizontalOrigin = defaultValue(this._horizontalOrigin, source.horizontalOrigin);
        this.verticalOrigin = defaultValue(this._verticalOrigin, source.verticalOrigin);
    };

    return ScreenOverlay;
});