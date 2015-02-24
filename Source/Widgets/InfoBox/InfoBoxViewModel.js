/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/deprecationWarning',
        '../../Core/Event',
        '../../Core/formatError',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        Event,
        formatError,
        knockout,
        when) {
    "use strict";

    var cameraEnabledPath = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
    var cameraDisabledPath = 'M 27.34375 1.65625 L 5.28125 27.9375 L 8.09375 30.3125 L 30.15625 4.03125 L 27.34375 1.65625 z M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4724893 20.232036 9.5676108 20.7379 9.75 21.21875 L 21.65625 7.03125 L 13.84375 7.03125 z M 28.21875 7.71875 L 14.53125 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 9.8371439 29.456025 8.4902779 28.21875 7.71875 z';
    var defaultPreprocessor;

    /**
     * The view model for {@link InfoBox}.
     * @alias InfoBoxViewModel
     * @constructor
     */
    var InfoBoxViewModel = function() {
        this._preprocessor = undefined;
        this._description = '';
        this._processedDescription = '';
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
         * Gets or sets the HTML for the loading indicator during any preprocessing of the description.
         * @type {String}
         */
        this.loadingIndicatorHtml = '<div class="cesium-infoBox-loadingContainer"><span class="cesium-infoBox-loading"></span></div>';

        knockout.track(this, ['showInfo', 'titleText', '_description', '_processedDescription', 'maxHeight', 'enableCamera', 'isCameraTracking']);

        /**
         * Gets or sets the unprocessed description HTML for the info box.
         * @type {String}
         */
        this.description = undefined;
        knockout.defineProperty(this, 'description', {
            get : function() {
                return this._description;
            },
            set : function(value) {
                if (this._description !== value) {
                    this._description = value;
                    var that = this;
                    if (defined(this.preprocessor)) {
                        this._processedDescription = this.loadingIndicatorHtml;
                        when(this.preprocessor(value), function(processed) {
                            // make sure the raw HTML still matches the input we processed,
                            // in case it was changed again while we were processing.
                            if (that._description === value) {
                                that._processedDescription = processed;
                            }
                        }).otherwise(function(error) {
                            /*global console*/
                            console.log('An error occurred while processed the description: ' + formatError(error));
                        });
                    } else {
                        that._processedDescription = value;
                    }
                }
            }
        });

        knockout.defineProperty(this, 'descriptionRawHtml', {
            get : function() {
                deprecationWarning('InfoBoxViewModel.descriptionRawHtml', 'InfoBoxViewModel.descriptionRawHtml has been deprecated.  Use InfoBoxViewModel.description instead.');
                return this.description;
            },
            set : function(value) {
                deprecationWarning('InfoBoxViewModel.descriptionRawHtml', 'InfoBoxViewModel.descriptionRawHtml has been deprecated.  Use InfoBoxViewModel.description instead.');
                this.description = value;
            }
        });

        /**
         * Gets the processed description HTML for the info box.
         * @type {String}
         */
        this.processedDescription = undefined;
        knockout.defineProperty(this, 'processedDescription', {
            get : function() {
                return this._processedDescription;
            }
        });

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
                return !this._processedDescription;
            }
        });
    };

    /**
     * Gets the maximum height of sections within the info box, minus an offset, in CSS-ready form.
     * @param {Number} offset The offset in pixels.
     * @returns {String}
     */
    InfoBoxViewModel.prototype.maxHeightOffset = function(offset) {
        return (this.maxHeight - offset) + 'px';
    };

    defineProperties(InfoBoxViewModel, {
        /**
         * Gets or sets the default HTML preprocessor function to use for all instances.
         * By default, no preprocessing is done.
         *
         * @member InfoBoxViewModel
         * @type {InfoBoxViewModel~Preprocessor}
         */
        defaultPreprocessor : {
            get : function() {
                return defaultPreprocessor;
            },
            set : function(value) {
                defaultPreprocessor = value;
            }
        },
        defaultSanitizer : {
            get : function() {
                deprecationWarning('InfoBoxViewModel.defaultSanitizer', 'InfoBoxViewModel.defaultSanitizer has been deprecated.  Use InfoBoxViewModel.defaultPreprocessor instead.');
                return InfoBoxViewModel.defaultPreprocessor;
            },
            set : function(value) {
                deprecationWarning('InfoBoxViewModel.defaultSanitizer', 'InfoBoxViewModel.defaultSanitizer has been deprecated.  Use InfoBoxViewModel.defaultPreprocessor instead.');
                InfoBoxViewModel.defaultPreprocessor = value;
            }
        }
    });

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
        },
        /**
         * Gets the preprocessor function to use for the selection description.
         * @memberof InfoBoxViewModel.prototype
         * @type {InfoBoxViewModel~Preprocessor}
         */
        preprocessor : {
            get : function() {
                return defaultValue(this._preprocessor, InfoBoxViewModel.defaultPreprocessor);
            },
            set : function(value) {
                this._preprocessor = value;
                //Force reprocessing of existing text
                var oldHtml = this._description;
                this._description = '';
                this.description = oldHtml;
            }
        },
        sanitizer : {
            get : function() {
                deprecationWarning('InfoBoxViewModel.sanitizer', 'InfoBoxViewModel.sanitizer has been deprecated.  Use InfoBoxViewModel.preprocessor instead.');
                return defaultValue(this.preprocessor, InfoBoxViewModel.defaultPreprocessor);
            },
            set : function(value) {
                deprecationWarning('InfoBoxViewModel.sanitizer', 'InfoBoxViewModel.sanitizer has been deprecated.  Use InfoBoxViewModel.preprocessor instead.');
                this.preprocessor = value;
            }
        }
    });

    /**
     * A function that preprocesses data for display in the info box.
     * @callback InfoBoxViewModel~Preprocessor
     *
     * @param {String} value Unprocessed string to display.
     * @returns {String|Promise} Processed HTML, or a Promise for the processed HTML.
     *
     * @see InfoBoxViewModel.defaultPreprocessor
     */

    return InfoBoxViewModel;
});
