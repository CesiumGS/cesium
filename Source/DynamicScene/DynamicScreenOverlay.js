/*global define*/
define(['../Core/defaultValue',
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
     * A time-dynamic screen overlay.
     * @alias DynamicPath
     * @constructor
     */
    var DynamicScreenOverlay = function() {
        this._show = undefined;
        this._position = undefined;
        this._width = undefined;
        this._height = undefined;
        this._material = undefined;

        this._definitionChanged = new Event();
    };

    defineProperties(DynamicScreenOverlay.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPath.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying if the screen overlay should be shown.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),

        /**
         * Gets or sets the {@link Property} specifying the screen overlay's position on the screen.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        position : createDynamicPropertyDescriptor('position'),

        /**
         * Gets or sets the numeric {@link Property} specifying the width of the screen overlay.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        width : createDynamicPropertyDescriptor('width'),

        /**
         * Gets or sets the numeric {@link Property} specifying the height of the screen overlay.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        height : createDynamicPropertyDescriptor('height'),

        /**
         * Gets or sets the {@link Material} {@link Property} specifying the material used to texture the screen overlay.
         * @memberof DynamicPath.prototype
         * @type {Property}
         */
        material : createDynamicPropertyDescriptor('material')
    });

    /**
     * Duplicates a DynamicScreenOverlay instance.
     * @memberof DynamicScreenOverlay
     *
     * @param {DynamicScreenOverlay} [result] The object onto which to store the result.
     * @returns {DynamicScreenOverlay} The modified result parameter or a new instance if one was not provided.
     */
    DynamicScreenOverlay.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicScreenOverlay();
        }
        result.show = this.show;
        result.position = this.position;
        result.width = this.width;
        result.height = this.height;
        result.material = this.material;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicScreenOverlay
     *
     * @param {DynamicScreenOverlay} source The object to be merged into this object.
     */
    DynamicScreenOverlay.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.position = defaultValue(this.position, source.position);
        this.width = defaultValue(this.width, source.width);
        this.height = defaultValue(this.height, source.height);
        this.material = defaultValue(this.material, source.material);
    };

    return DynamicScreenOverlay;
});
