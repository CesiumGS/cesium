/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/isArray',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link CameraControl}.
     * @alias CameraControlViewModel
     * @constructor
     */
    var CameraControlViewModel = function() {
        var that = this;

        /**
         * Gets or sets whether the camera control drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'Camera options...';

        knockout.track(this, ['dropDownVisible', 'tooltip']);

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });
    };

    defineProperties(CameraControlViewModel.prototype, {
        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof CameraControlViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        }
    });

    return CameraControlViewModel;
});