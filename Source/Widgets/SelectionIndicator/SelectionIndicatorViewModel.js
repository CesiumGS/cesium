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
        Tween) {
    "use strict";

    var screenSpacePos = new Cartesian2();

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
        this._descriptionText = '';
        this._onCloseInfo = new Event();
        this._defaultPosition = new Cartesian2(this._container.clientWidth, this._container.clientHeight / 2);
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
         * The distance from the center to the triangle tips.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.triangleDistance = 20;

        /**
         * The rotation angle offset for the triangles, in degrees.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Number}
         */
        this.triangleRotation = 45;

        /**
         * Gets or sets the maximum height of the info box in pixels.  This property is observable.
         * @type {Number}
         */
        this.maxHeight = 500;

        knockout.track(this, ['_positionX', '_positionY', 'triangleDistance', 'triangleRotation', '_showSelection', '_titleText', '_descriptionText', 'maxHeight']);

        /**
         * Determines the visibility of the selection indicator.
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
        this.descriptionText = undefined;
        knockout.defineProperty(this, 'descriptionText', {
            get : function() {
                return this._descriptionText;
            },
            set : function(value) {
                if (this._descriptionText !== value) {
                    this._descriptionText = value;
                }
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

        knockout.defineProperty(this, '_transform0', {
            get : function() {
                return 'rotate(' + (this.triangleRotation) + ') translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform1', {
            get : function() {
                return 'rotate(' + (this.triangleRotation + 90) + ') translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform2', {
            get : function() {
                return 'rotate(' + (this.triangleRotation + 180) + ') translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform3', {
            get : function() {
                return 'rotate(' + (this.triangleRotation + 270) + ') translate(0,' + (-this.triangleDistance) + ')';
            }
        });
    };

    /**
     * Updates the view of the selection indicator to match the position and content properties of the view model
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.update = function() {
        var pos;
        if (this.showSelection) {
            if (defined(this._position)) {
                pos = this._computeScreenSpacePosition(this._position, screenSpacePos);
                pos.x = Math.floor(pos.x + 0.25);
                pos.y = Math.floor(pos.y + 0.25);
            } else {
                pos = this._defaultPosition;
            }
            shiftPosition(this, pos);
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
                distance : 60,
                rotation: 0
            },
            stopValue : {
                distance : 20,
                rotation: 45
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.triangleDistance = value.distance;
                viewModel.triangleRotation = value.rotation;
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
                distance : viewModel.triangleDistance,
                rotation: viewModel.triangleRotation
            },
            stopValue : {
                distance : 60,
                rotation: 25
            },
            duration : 800,
            easingFunction : Tween.Easing.Exponential.Out,
            onUpdate : function (value) {
                viewModel.triangleDistance = value.distance;
                viewModel.triangleRotation = value.rotation;
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
         * Gets or sets the default screen space position of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Cartesain2}
         */
        defaultPosition : {
            get : function() {
                return this._defaultPosition;
            },
            set : function(value) {
                this._defaultPosition = Cartesian2.clone(value, this._defaultPosition);
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
         * Gets an {@link Event} that is fired when the user closes the selection info window.
         */
        onCloseInfo : {
            get : function() {
                return this._onCloseInfo;
            }
        }
    });

    return SelectionIndicatorViewModel;
});
