/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout',
        '../../ThirdParty/sanitize-caja',
        '../../ThirdParty/Tween'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        SceneTransforms,
        knockout,
        sanitizeCaja,
        Tween) {
    "use strict";

    var screenSpacePos = new Cartesian2();
    var cameraIconPath = 'M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4853444 22.104033 11.423165 24.0625 13.84375 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 8.975298 28.305952 7.03125 25.875 7.03125 L 13.84375 7.03125 z';
    var cameraDisabledPath = 'M 27.34375 1.65625 L 5.28125 27.9375 L 8.09375 30.3125 L 30.15625 4.03125 L 27.34375 1.65625 z M 13.84375 7.03125 C 11.412798 7.03125 9.46875 8.975298 9.46875 11.40625 L 9.46875 11.59375 L 2.53125 7.21875 L 2.53125 24.0625 L 9.46875 19.6875 C 9.4724893 20.232036 9.5676108 20.7379 9.75 21.21875 L 21.65625 7.03125 L 13.84375 7.03125 z M 28.21875 7.71875 L 14.53125 24.0625 L 25.875 24.0625 C 28.305952 24.0625 30.28125 22.087202 30.28125 19.65625 L 30.28125 11.40625 C 30.28125 9.8371439 29.456025 8.4902779 28.21875 7.71875 z';

    function toPx(value) {
        if (value === 0) {
            return '0';
        }
        return value.toString() + 'px';
    }

    function shiftPosition(viewModel, position, arrow, screen) {
        var posX = 0;
        var posY = 0;
        var container = viewModel._container;
        var containerWidth = container.parentNode.clientWidth;
        var containerHeight = container.parentNode.clientHeight;

        var selectionIndicatorElement = viewModel._selectionIndicatorElement;
        var width = selectionIndicatorElement.offsetWidth;
        var height = selectionIndicatorElement.offsetHeight;

        var posMin = width * -0.5;
        var posMaxY = containerHeight + posMin;
        var posMaxX = containerWidth + posMin;

        posX = Math.min(Math.max(position.x + posMin, posMin), posMaxX);
        posY = Math.min(Math.max(position.y + posMin, posMin), posMaxY);

        var positionXPx = toPx(posX);
        if (viewModel._positionX !== positionXPx) {
            viewModel._positionX = positionXPx;
        }
        var positionYPx = toPx(posY);
        if (viewModel._positionY !== positionYPx) {
            viewModel._positionY = positionYPx;
        }
    }

    /**
     * The view model for {@link SelectionIndicator}.
     * @alias SelectionIndicatorViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Element} selectionIndicatorElement The element containing all elements that make up the selection indicator.
     * @param {Element} [container = document.body] The element containing the selection indicator.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} selectionIndicatorElement is required.
     *
     */
    var SelectionIndicatorViewModel = function(scene, selectionIndicatorElement, container) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        if (!defined(selectionIndicatorElement)) {
            throw new DeveloperError('selectionIndicatorElement is required.');
        }

        this._sanitizer = undefined;
        this._scene = scene;
        this._animationCollection = scene.getAnimations();
        this._container = defaultValue(container, document.body);
        this._selectionIndicatorElement = selectionIndicatorElement;
        this._content = '';
        this._position = undefined;
        this._updateContent = false;
        this._timerRunning = false;
        this._showSelection = false;
        this._titleText = '';
        this._descriptionHtml = '';
        this._unsanitizedDescriptionHtml = '';
        this._onCamera = new Event();
        this._onCloseInfo = new Event();
        this._computeScreenSpacePosition = function(position, result) {
            return SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
        };

        /**
         * The x screen position of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this._positionX = '-1000px';

        /**
         * The y screen position of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this._positionY = '0';

        /**
         * The scale of the indicator relative to its default size.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.scale = 1;

        /**
         * The rotation angle of the indicator, in degrees.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.rotation = 0;

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

        knockout.track(this, ['_position', '_positionX', '_positionY', 'scale', 'rotation', '_showSelection', '_titleText', '_descriptionHtml', 'maxHeight', 'enableCamera', 'isCameraTracking']);

        /**
         * Gets or sets the visibility of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showSelection = undefined;
        knockout.defineProperty(this, 'showSelection', {
            get : function() {
                return this._showSelection;
            },
            set : function(value) {
                this._showSelection = value;
            }
        });

        /**
         * Gets the visibility of the position indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showPosition = undefined;
        knockout.defineProperty(this, 'showPosition', {
            get : function() {
                return this._showSelection && defined(this._position);
            }
        });

        /**
         * The title text in the info box.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {String}
         */
        this.titleText = undefined;
        knockout.defineProperty(this, 'titleText', {
            get : function() {
                return this._titleText;
            },
            set : function(value) {
                if (this._titleText !== value) {
                    this._titleText = value;
                }
            }
        });

        /**
         * The description text in the info box.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {String}
         */
        this.descriptionHtml = undefined;
        knockout.defineProperty(this, 'descriptionHtml', {
            get : function() {
                return this._descriptionHtml;
            },
            set : function(value) {
                if (this._unsanitizedDescriptionHtml !== value) {
                    this._unsanitizedDescriptionHtml = value;
                    if (defined(this._sanitizer)) {
                        value = this._sanitizer(value);
                    } else if (defined(SelectionIndicatorViewModel.defaultSanitizer)) {
                        value = SelectionIndicatorViewModel.defaultSanitizer(value);
                    }
                    this._descriptionHtml = value;
                }
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
         * @memberof SelectionIndicatorViewModel.prototype
         * @returns {String}
         */
        SelectionIndicatorViewModel.prototype.maxHeightOffset = function(offset) {
            return toPx(this.maxHeight - offset);
        };

        knockout.defineProperty(this, '_transform', {
            get : function() {
                return 'rotate(' + (this.rotation) + ') scale(' + (this.scale) + ')';
            }
        });

        knockout.defineProperty(this, '_bodyless', {
            get : function() {
                return !this.descriptionHtml;
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
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.defaultSanitizer = sanitizeCaja;

    /**
     * Updates the view of the selection indicator to match the position and content properties of the view model
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.update = function() {
        if (this.showSelection) {
            if (defined(this._position)) {
                var pos = this._computeScreenSpacePosition(this._position, screenSpacePos);
                pos.x = Math.floor(pos.x + 0.25);
                pos.y = Math.floor(pos.y + 0.25);
                shiftPosition(this, pos);
            }
        }
    };

    /**
     * Animate the indicator to draw attention to the selection.
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.animateAppear = function() {
        var viewModel = this;
        this._animationCollection.add({
            startValue : {
                scale : 2
            },
            stopValue : {
                scale: 1
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.scale = value.scale;
            }
        });
    };

    /**
     * Animate the indicator to release the selection.
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.animateDepart = function() {
        var viewModel = this;
        this._animationCollection.add({
            startValue : {
                scale : viewModel.scale
            },
            stopValue : {
                scale : 1.5
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.scale = value.scale;
            }
        });
    };

    defineProperties(SelectionIndicatorViewModel.prototype, {
        /**
         * Gets or sets the HTML element containing the selection indicator
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._container = value;
            }
        },
        /**
         * Gets or sets the HTML element that makes up the selection indicator
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Element}
         */
        selectionIndicatorElement : {
            get : function() {
                return this._selectionIndicatorElement;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._selectionIndicatorElement = value;
            }
        },
        /**
         * Gets the scene to control.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },
        /**
         * Sets the function for converting the world position of the object to the screen space position.
         * Expects the {Cartesian3} parameter for the position and the optional {Cartesian2} parameter for the result.
         * Should return a {Cartesian2}.
         *
         * Defaults to SceneTransforms.wgs84ToWindowCoordinates
         *
         * @example
         * selectionIndicatorViewModel.computeScreenSpacePosition = function(position, result) {
         *     return Cartesian2.clone(position, result);
         * };
         *
         * @memberof SelectionIndicatorViewModel
         *
         * @type {Function}
         */
        computeScreenSpacePosition : {
            get : function() {
                return this._computeScreenSpacePosition;
            },
            set : function(value) {
                this._computeScreenSpacePosition = value;
            }
        },
        /**
         * Sets the world position of the object for which to display the selection indicator.
         * @memberof SelectionIndicatorViewModel
         *
         * @type {Cartesian3}
         */
        position : {
            get : function() {
                return this._position;
            },
            set : function(value) {
                this._position = value;
            }
        },
        /**
         * Gets an {@link Event} that is fired when the user clicks the camera icon.
         */
        onCamera : {
            get : function() {
                return this._onCamera;
            }
        },
        /**
         * Gets an {@link Event} that is fired when the user closes the selection info window.
         */
        onCloseInfo : {
            get : function() {
                return this._onCloseInfo;
            }
        },
        /**
         * Gets the HTML sanitization function to use for the selection description.
         */
        sanitizer : {
            get : function() {
                return this._sanitizer;
            },
            set : function(value) {
                this._sanitizer = value;
                //Force resanitization of existing text
                var oldHtml = this._unsanitizedDescriptionHtml;
                this._unsanitizedDescriptionHtml = '';
                this.descriptionHtml = oldHtml;
            }
        }
    });

    return SelectionIndicatorViewModel;
});
