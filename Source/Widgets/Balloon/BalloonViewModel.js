/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Scene/SceneTransforms',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        defineProperties,
        DeveloperError,
        SceneTransforms,
        knockout) {
    "use strict";

    var pointMin = 0;
    var screenSpacePos = new Cartesian2();

    function shiftPosition(viewModel, position){
        var pointX;
        var pointY;
        var posX;
        var posY;

        var containerWidth = viewModel._container.clientWidth;
        var containerHeight = viewModel._container.clientHeight;

        viewModel._maxWidth = Math.floor(viewModel._container.clientWidth*0.95) + 'px';
        viewModel._maxHeight = Math.floor(viewModel._container.clientHeight*0.50) + 'px';

        var pointMaxY = containerHeight - 15;
        var pointMaxX = containerWidth - 16;
        var pointXOffset = position.x - 15;

        var width = viewModel._balloonElement.offsetWidth;
        var height = viewModel._balloonElement.offsetHeight;

        var posMaxY = containerHeight - height;
        var posMaxX = containerWidth - width - 2;
        var posMin = 0;
        var posXOffset = position.x - width/2;

        var top = position.y > containerHeight;
        var bottom = position.y < -10;
        var left = position.x < 0;
        var right = position.x > containerWidth;

        if (bottom) {
            posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
            posY = 15;
            pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX - 15);
            pointY = pointMin;
            viewModel._down = true;
            viewModel._up = false;
            viewModel._left = false;
            viewModel._right = false;
        } else if (top) {
            posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
            posY = containerHeight - height - 14;
            pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX - 15);
            pointY = pointMaxY;
            viewModel._down = false;
            viewModel._up = true;
            viewModel._left = false;
            viewModel._right = false;
        } else if (left) {
            posX = 15;
            posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            pointX = pointMin;
            pointY = Math.min(Math.max((position.y - 16), pointMin), pointMaxY - 15);
            viewModel._down = false;
            viewModel._up = false;
            viewModel._left = true;
            viewModel._right = false;
        } else if (right) {
            posX = containerWidth - width - 15;
            posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            pointX = pointMaxX;
            pointY = Math.min(Math.max((position.y - 16), pointMin), pointMaxY - 15);
            viewModel._down = false;
            viewModel._up = false;
            viewModel._left = false;
            viewModel._right = true;
        } else {
            posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
            posY = Math.min(Math.max((position.y + 25), posMin), posMaxY);
            pointX = pointXOffset;
            pointY = Math.min(position.y + 10, posMaxY - 15);
            viewModel._down = true;
            viewModel._up = false;
            viewModel._left = false;
            viewModel._right = false;
        }

        return {
            point: {
                x: Math.floor(pointX),
                y: Math.floor(pointY)
            },
            screen: {
                x: Math.floor(posX),
                y: Math.floor(posY)
            }
        };
    }

    /**
     * The view model for {@link Balloon}.
     * @alias BalloonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Element} contentElement The element in which to display balloon content.
     * @param {Element} balloonElement The element containing all elements that make up the balloon.
     * @param {Element} [container = document.body] The element containing the balloon.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} contentElement is required.
     * @exception {DeveloperError} balloonElement is required.
     *
     */
    var BalloonViewModel = function(scene, contentElement, balloonElement, container) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        if (typeof contentElement === 'undefined') {
            throw new DeveloperError('contentElement is required.');
        }

        if (typeof balloonElement === 'undefined') {
            throw new DeveloperError('balloonElement is required.');
        }

        this._scene = scene;
        this._container = defaultValue(container, document.body);
        this._balloonElement = balloonElement;
        this._contentElement = contentElement;
        this._content = contentElement.innerHTML;
        this._position = undefined;
        this._computeScreenSpacePosition = function(position, result) {
            return SceneTransforms.wgs84ToWindowCoordinates(scene, position, result);
        };
        this._positionX = '0';
        this._positionY = '0';
        this._pointX = '0';
        this._pointY = '0';
        this._updateContent = false;
        this._timerRunning = false;

        /**
         * Determines the visibility of the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Boolean}
         */
        this.showBalloon = false;

        this._down = true;
        this._up = false;
        this._left = false;
        this._right = false;

        this._maxWidth = Math.floor(this._container.clientWidth*0.95) + 'px';
        this._maxHeight = Math.floor(this._container.clientHeight*0.50) + 'px';

        knockout.track(this, ['showBalloon', '_positionX', '_positionY', '_pointX', '_pointY',
                              '_down', '_up', '_left', '_right', '_maxWidth', '_maxHeight']);
    };

    /**
     * Updates the view of the balloon to match the position and content properties of the view model
     * @memberof BalloonViewModel
     */
    BalloonViewModel.prototype.update = function() {
        if (!this._timerRunning) {
            if (this._updateContent) {
                this.showBalloon = false;
                this._timerRunning = true;
                var that = this;
                setTimeout(function () {
                    that._contentElement.innerHTML = that._content;
                    if (typeof that._position !== 'undefined') {
                        var pos = that._computeScreenSpacePosition(that._position, screenSpacePos);
                        pos = shiftPosition(that, pos);
                        that._pointX = pos.point.x + 'px';
                        that._pointY = pos.point.y + 'px';

                        that._positionX = pos.screen.x + 'px';
                        that._positionY = pos.screen.y + 'px';
                    }
                    that.showBalloon = true;
                    that._timerRunning = false;
                }, 100);
                this._updateContent = false;
            } else  if (typeof this._position !== 'undefined') {
                var pos = this._computeScreenSpacePosition(this._position, screenSpacePos);
                pos = shiftPosition(this, pos);
                this._pointX = pos.point.x + 'px';
                this._pointY = pos.point.y + 'px';

                this._positionX = pos.screen.x + 'px';
                this._positionY = pos.screen.y + 'px';
            }
        }
    };

    defineProperties(BalloonViewModel.prototype, {
        /**
         * Gets or sets the HTML element containing the balloon
         * @memberof BalloonViewModel.prototype
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
         * Gets or sets the HTML element that makes up the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        balloonElement : {
            get : function() {
                return this._balloonElement;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._balloonElement = value;
            }
        },
        /**
         * Gets or sets the HTML element that displays the content of the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        contentElement : {
            get : function() {
                return this._contentElement;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._contentElement = value;
            }
        },
        /**
         * Gets or sets the content of the balloon
         * @memberof BalloonViewModel.prototype
         *
         * @type {Element}
         */
        content: {
            set : function(value) {
                if (typeof value === 'undefined') {
                    throw new DeveloperError('value must defined');
                }
                this._content = value;
                this._updateContent = true;
            }
        },
        /**
         * Gets the scene to control.
         * @memberof BalloonViewModel.prototype
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
         * Defaults to scene.computeScreenSpacePosition.
         *
         * @example
         * balloonViewModel.computeScreenSpacePosition = function(position, result) {
         *     return Cartesian2.clone(position, result);
         * };
         *
         * @memberof BalloonViewModel
         *
         * @type {Function}
         */
        computeScreenSpacePosition: {
            set: function(value) {
                if (typeof value === 'function') {
                    this._computeScreenSpacePosition = value;
                }
            }
        },
        /**
         * Sets the world position of the object for which to display the balloon.
         * @memberof BalloonViewModel
         *
         * @type {Cartesian3}
         */
        position: {
            set: function(value) {
                if (typeof value !== 'undefined') {
                    this._position = value;
                }
            }
        }
    });

    return BalloonViewModel;
});