/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/Event',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        Event,
        knockout) {
    "use strict";

    var cameraEnabledPath = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
    var cameraDisabledPath = 'M 27.34375 1.65625 L 5.28125 27.9375 L 8.09375 30.3125 L 30.15625 4.03125 L 27.34375 1.65625 z M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4724893 20.232036 9.5676108 20.7379 9.75 21.21875 L 21.65625 7.03125 L 13.84375 7.03125 z M 28.21875 7.71875 L 14.53125 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 9.8371439 29.456025 8.4902779 28.21875 7.71875 z';

    /**
     * The view model for {@link InfoBox}.
     * @alias InfoBoxViewModel
     * @constructor
     */
    function InfoBoxViewModel() {
        this._cameraClicked = new Event();
        this._closeClicked = new Event();

        /**
         * Gets or sets the maximum height of the info box in pixels.  This property is observable.
         * @type {Number}
         */
        this.maxHeight = 500;

        /**
         * Gets or sets whether the camera tracking icon is enabled.
         * @type {Boolean}
         */
        this.enableCamera = false;

        /**
         * Gets or sets the status of current camera tracking of the selected object.
         * @type {Boolean}
         */
        this.isCameraTracking = false;

        /**
         * Gets or sets the visibility of the info box.
         * @type {Boolean}
         */
        this.showInfo = false;

        /**
         * Gets or sets the title text in the info box.
         * @type {String}
         */
        this.titleText = '';

        /**
         * Gets or sets the description HTML for the info box.
         * @type {String}
         */
        this.description = '';

        knockout.track(this, ['showInfo', 'titleText', 'description', 'maxHeight', 'enableCamera', 'isCameraTracking']);

        this._loadingIndicatorHtml = '<div class="cesium-infoBox-loadingContainer"><span class="cesium-infoBox-loading"></span></div>';

        /**
         * Gets the SVG path of the camera icon, which can change to be "crossed out" or not.
         * @type {String}
         */
        this.cameraIconPath = undefined;
        knockout.defineProperty(this, 'cameraIconPath', {
            get : function() {
                return (!this.enableCamera || this.isCameraTracking) ? cameraDisabledPath : cameraEnabledPath;
            }
        });

        knockout.defineProperty(this, '_bodyless', {
            get : function() {
                return !defined(this.description) || this.description.length === 0;
            }
        });
    }

    /**
     * Gets the maximum height of sections within the info box, minus an offset, in CSS-ready form.
     * @param {Number} offset The offset in pixels.
     * @returns {String}
     */
    InfoBoxViewModel.prototype.maxHeightOffset = function(offset) {
        return (this.maxHeight - offset) + 'px';
    };

    defineProperties(InfoBoxViewModel.prototype, {
        /**
         * Gets an {@link Event} that is fired when the user clicks the camera icon.
         * @memberof InfoBoxViewModel.prototype
         * @type {Event}
         */
        cameraClicked : {
            get : function() {
                return this._cameraClicked;
            }
        },
        /**
         * Gets an {@link Event} that is fired when the user closes the info box.
         * @memberof InfoBoxViewModel.prototype
         * @type {Event}
         */
        closeClicked : {
            get : function() {
                return this._closeClicked;
            }
        }
    });

    return InfoBoxViewModel;
});
