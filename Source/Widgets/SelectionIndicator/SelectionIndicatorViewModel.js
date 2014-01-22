/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout',
        '../../ThirdParty/Tween'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
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
        this._container = defaultValue(container, document.body);
        this._selectionIndicatorElement = selectionIndicatorElement;
        this._content = '';
        this._position = undefined;
        this._updateContent = false;
        this._timerRunning = false;
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
         * Determines the visibility of the selection indicator.
         * @memberof SelectionIndicatorViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showSelection = undefined;
        var showSelection = knockout.observable();
        knockout.defineProperty(this, 'showSelection', {
            get : function() {
                return showSelection();
            },
            set : function(value) {
                showSelection(value);
            }
        });

        knockout.track(this, ['_positionX', '_positionY', 'triangleDistance']);

        knockout.defineProperty(this, '_transform0', {
            get : function() {
                return 'translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform1', {
            get : function() {
                return 'rotate(90) translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform2', {
            get : function() {
                return 'rotate(180) translate(0,' + (-this.triangleDistance) + ')';
            }
        });
        knockout.defineProperty(this, '_transform3', {
            get : function() {
                return 'rotate(270) translate(0,' + (-this.triangleDistance) + ')';
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
     * Animate the triangles to draw attention to the selection.
     * @memberof SelectionIndicatorViewModel
     */
    SelectionIndicatorViewModel.prototype.animateTriangles = function() {
        var viewModel = this;
        var duration = 1500;
        var easingFunction = Tween.Easing.Bounce.Out;

        var value = {
            offset : 60
        };
        var tween = new Tween.Tween(value);
        tween.to({
            offset : 20
        }, duration);
        tween.easing(easingFunction);
        tween.onUpdate(function() {
            viewModel.triangleDistance = value.offset;
        });
        tween.start();
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
        }
    });

    return SelectionIndicatorViewModel;
});
