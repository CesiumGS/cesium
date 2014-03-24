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
        this._cameraIcon = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
        this._bookmarkIcon = 'M17.396,1.841L6.076,25.986l7.341-4.566l1.186,8.564l11.32-24.146L17.396,1.841zM19.131,9.234c-0.562-0.264-0.805-0.933-0.541-1.495c0.265-0.562,0.934-0.805,1.496-0.541s0.805,0.934,0.541,1.496S19.694,9.498,19.131,9.234z';
        this._editIcon = 'M25.31,2.872l-3.384-2.127c-0.854-0.536-1.979-0.278-2.517,0.576l-1.334,2.123l6.474,4.066l1.335-2.122C26.42,4.533,26.164,3.407,25.31,2.872zM6.555,21.786l6.474,4.066L23.581,9.054l-6.477-4.067L6.555,21.786zM5.566,26.952l-0.143,3.819l3.379-1.787l3.14-1.658l-6.246-3.925L5.566,26.952z';

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

        /**
         * An array of view names
         * @type {Array}
         */
        this.viewNames = ['Home'];

        knockout.track(this, ['dropDownVisible', 'tooltip', 'viewNames']);

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