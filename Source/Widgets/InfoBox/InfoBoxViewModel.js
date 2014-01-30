/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../ThirdParty/knockout',
        '../../ThirdParty/sanitize-caja'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        knockout,
        sanitizeCaja) {
    "use strict";

    var screenSpacePos = new Cartesian2();
    var cameraIconPath = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
    var cameraDisabledPath = 'M 27.34375 1.65625 L 5.28125 27.9375 L 8.09375 30.3125 L 30.15625 4.03125 L 27.34375 1.65625 z M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4724893 20.232036 9.5676108 20.7379 9.75 21.21875 L 21.65625 7.03125 L 13.84375 7.03125 z M 28.21875 7.71875 L 14.53125 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 9.8371439 29.456025 8.4902779 28.21875 7.71875 z';

    /**
     * The view model for {@link InfoBox}.
     * @alias InfoBoxViewModel
     * @constructor
     */
    var InfoBoxViewModel = function() {
        this._sanitizer = undefined;
        this._descriptionRawHtml = '';
        this._descriptionSanitizedHtml = '';
        this._cameraClicked = new Event();
        this._closeClicked = new Event();

        /**
         * Gets or sets the maximum height of the info box in pixels.  This property is observable.
         * @type {Number}
         */
        this.maxHeight = 500;

        /**
         * Gets or sets the availability of camera tracking.
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
         * @memberof InfoBoxViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showInfo = false;

        /**
         * Gets or sets the title text in the info box.
         * @memberof InfoBoxViewModel.prototype
         *
         * @type {String}
         */
        this.titleText = '';

        knockout.track(this, ['showInfo', 'titleText', '_descriptionRawHtml', '_descriptionSanitizedHtml', 'maxHeight', 'enableCamera', 'isCameraTracking']);

        /**
         * Gets or sets the un-sanitized description HTML for the info box.
         * @memberof InfoBoxViewModel.prototype
         *
         * @type {String}
         */
        this.descriptionRawHtml = undefined;
        knockout.defineProperty(this, 'descriptionRawHtml', {
            get : function() {
                return this._descriptionRawHtml;
            },
            set : function(value) {
                if (this._descriptionRawHtml !== value) {
                    this._descriptionRawHtml = value;
                    this._descriptionSanitizedHtml = this.sanitizer(value);
                }
            }
        });

        /**
         * Gets the sanitized description HTML for the info box.
         * @memberof InfoBoxViewModel.prototype
         *
         * @type {String}
         */
        this.descriptionSanitizedHtml = undefined;
        knockout.defineProperty(this, 'descriptionSanitizedHtml', {
            get : function() {
                return this._descriptionSanitizedHtml;
            }
        });

        knockout.defineProperty(this, '_cameraIconPath', {
            get : function() {
                return (this.enableCamera || this.isCameraTracking) ? cameraIconPath : cameraDisabledPath;
            }
        });

        /**
         * Gets the maximum height of sections within the info box, minus an offset, in CSS-ready form.
         * @param {Number} offset The offset in pixels.
         * @memberof InfoBoxViewModel.prototype
         * @returns {String}
         */
        InfoBoxViewModel.prototype.maxHeightOffset = function(offset) {
            return (this.maxHeight - offset).toString() + 'px';
        };

        knockout.defineProperty(this, '_bodyless', {
            get : function() {
                return !this._descriptionSanitizedHtml;
            }
        });
    };

    /**
     * Gets or sets the default HTML sanitization function to use for all instances.
     * By default, Google Caja is used with only basic HTML allowed.
     * A specific instance can override this property by setting its prototype sanitizer property.
     *
     * This property is a function which takes a unsanitized HTML string and returns a
     * sanitized version.
     * @memberof InfoBoxViewModel
     */
    InfoBoxViewModel.defaultSanitizer = sanitizeCaja;

    defineProperties(InfoBoxViewModel.prototype, {
        /**
         * Gets an {@link Event} that is fired when the user clicks the camera icon.
         */
        cameraClicked : {
            get : function() {
                return this._cameraClicked;
            }
        },
        /**
         * Gets an {@link Event} that is fired when the user closes the info box.
         */
        closeClicked : {
            get : function() {
                return this._closeClicked;
            }
        },
        /**
         * Gets the HTML sanitization function to use for the selection description.
         */
        sanitizer : {
            get : function() {
                return defaultValue(this._sanitizer, InfoBoxViewModel.defaultSanitizer);
            },
            set : function(value) {
                this._sanitizer = value;
                //Force resanitization of existing text
                var oldHtml = this._descriptionRawHtml;
                this._descriptionRawHtml = '';
                this.descriptionRawHtml = oldHtml;
            }
        }
    });

    return InfoBoxViewModel;
});
