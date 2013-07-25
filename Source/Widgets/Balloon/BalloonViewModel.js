/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        Cartesian3,
        defaultValue,
        defineProperties,
        DeveloperError,
        knockout) {
    "use strict";

    function shiftPosition(viewModel, position){
        var pointX;
        var pointY;
        var posX;
        var posY;

        var containerWidth = viewModel._container.clientWidth;
        var containerHeight = viewModel._container.clientHeight;

        var width = viewModel._balloonElement.offsetWidth;
        var height = viewModel._balloonElement.offsetHeight;

        var top = position.y > containerHeight;
        var bottom = position.y < -10;
        var left = position.x < 0;
        var right = position.x > containerWidth;
        if (bottom) {
            posX = Math.min(Math.max((position.x - width/2), 0), containerWidth - width - 2);
            posY = 15;
            pointX = Math.min(Math.max((position.x - 11), 4), containerWidth - 29);
            pointY = 4;
        } else if (top) {
            posX = Math.min(Math.max((position.x - width/2), 0), containerWidth - width - 2);
            posY = containerHeight - height - 15;
            pointX = Math.min(Math.max((position.x - 11), 4), containerWidth - 29);
            pointY = containerHeight - 27;
        } else if (left) {
            posX = 15;
            posY = Math.min(Math.max((position.y - height/2), 0), containerHeight - height);
            pointX = 4;
            pointY = Math.min(Math.max((position.y - 15), 4), containerHeight - 27);
        } else if (right) {
            posX = containerWidth - width - 15;
            posY = Math.min(Math.max((position.y - height/2), 0), containerHeight - height);
            pointX = containerWidth - 29;
            pointY = Math.min(Math.max((position.y - 15), 4), containerHeight - 27);
        } else {
            posX = Math.min(Math.max((position.x - width/2), 0), containerWidth - width - 2);
            posY = Math.min(Math.max((position.y + 25), 0), containerHeight - height);

            pointX = position.x - 11;
            pointY = position.y + 15;
        }

        return {
            point: {
                x: pointX,
                y: pointY
            },
            screen: {
                x: posX,
                y: posY
            }
        };

    }

    var BalloonViewModel = function(scene, contentElement, balloonElement, container) {
        this._scene = scene;
        this._container = container;
        this._balloonElement = balloonElement;
        this._contentElement = contentElement;
        this._content = contentElement.innerHTML;
        this._computeScreenPosition = undefined;

        this.balloonVisible = false;
        this._pointVisible = false;
        this._positionX = '0';
        this._positionY = '0';
        this._pointX = '0';
        this._pointY = '0';
        this._updateContent = false;
        this._updatePosition = false;
        this._timerRunning = false;

        knockout.track(this, ['_pointVisible', 'balloonVisible', '_positionX', '_positionY', '_pointX', '_pointY']);

        var that = this;

        this._render = function() {
            if (!that._timerRunning) {
                if (that._updateContent) {
                    that.balloonVisible = false;
                    that._timerRunning = true;
                    setTimeout(function () {
                        that._contentElement.innerHTML = that._content;
                        if (typeof that._computeScreenPosition === 'function') {
                            var screenPos = that._computeScreenPosition();
                            if (typeof screenPos !== 'undefined') {
                                var pos = shiftPosition(that, screenPos);
                                that._pointX = (pos.point.x) + 'px';
                                that._pointY = (pos.point.y) + 'px';

                                that._positionX = pos.screen.x + 'px';
                                that._positionY = pos.screen.y + 'px';
                            }
                        }
                        that.balloonVisible = true;
                        that._timerRunning = false;
                    }, 100);
                    that._updateContent = false;
                } else  if (typeof that._computeScreenPosition === 'function') {
                    var screenPos = that._computeScreenPosition();
                    if (typeof screenPos !== 'undefined') {
                        var pos = shiftPosition(that, screenPos);
                        that._pointX = (pos.point.x) + 'px';
                        that._pointY = (pos.point.y) + 'px';

                        that._positionX = pos.screen.x + 'px';
                        that._positionY = pos.screen.y + 'px';
                    }
                }
            }
        };
    };

    defineProperties(BalloonViewModel.prototype, {
        render: {
            get: function() {
                return this._render;
            }
        },

        content : {
            get : function() {
                return this._content;
            },
            set : function(value) {
                if (typeof value !== 'string') {
                    throw new DeveloperError('content value must be a string');
                }
                this._content = value;
                this._updateContent = true;
                this.balloonVisible = true;
            }
        },

        computeScreenPosition: {
            set: function(value) {
                if (typeof value !== 'function') {
                    throw new DeveloperError('computeScreenPosition must be a function');
                }
                this._computeScreenPosition = value;
            }
        }
    });

    return BalloonViewModel;
});