/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        defineProperties,
        DeveloperError,
        knockout) {
    "use strict";

    var screenPosition = new Cartesian2();
    var pointMin = 4;

    function shiftPosition(viewModel, position){
        var pointX;
        var pointY;
        var posX;
        var posY;

        var containerWidth = viewModel._container.clientWidth;
        var containerHeight = viewModel._container.clientHeight;

        var pointMaxY = containerHeight - 28;
        var pointMaxX = containerWidth - 28;
        var pointXOffset = position.x - 11;

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
            pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX);
            pointY = pointMin;
        } else if (top) {
            posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
            posY = containerHeight - height - 15;
            pointX = Math.min(Math.max(pointXOffset, pointMin), pointMaxX);
            pointY = pointMaxY;
        } else if (left) {
            posX = 15;
            posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            pointX = pointMin;
            pointY = Math.min(Math.max((position.y - 15), pointMin), pointMaxY);
        } else if (right) {
            posX = containerWidth - width - 15;
            posY = Math.min(Math.max((position.y - height/2), posMin), posMaxY);
            pointX = pointMaxX;
            pointY = Math.min(Math.max((position.y - 15), pointMin), pointMaxY);
        } else {
            posX = Math.min(Math.max(posXOffset, posMin), posMaxX);
            posY = Math.min(Math.max((position.y + 25), posMin), posMaxY);
            pointX = pointXOffset;
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

        this._positionX = '0';
        this._positionY = '0';
        this._pointX = '0';
        this._pointY = '0';
        this._updateContent = false;
        this._timerRunning = false;

        this.balloonVisible = false;

        knockout.track(this, ['balloonVisible', '_positionX', '_positionY', '_pointX', '_pointY']);

        var that = this;

        this._update = function() {
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
                                that._pointX = pos.point.x + 'px';
                                that._pointY = pos.point.y + 'px';

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
                        that._pointX = pos.point.x + 'px';
                        that._pointY = pos.point.y + 'px';

                        that._positionX = pos.screen.x + 'px';
                        that._positionY = pos.screen.y + 'px';
                    }
                }
            }
        };
    };

    defineProperties(BalloonViewModel.prototype, {
        update: {
            get: function() {
                return this._update;
            }
        },

        pickObject: {
            set: function(value) {
                var scene = this._scene;
                if (typeof value.balloon === 'undefined') {
                    value.balloon = '<a href="#">balloon data</a>';
                }
                if (typeof value !== 'undefined' && typeof value.balloon === 'string') {
                    if (typeof value.computeScreenSpacePosition === 'function') {
                        this._computeScreenPosition = function() { return value.computeScreenSpacePosition(scene.getContext(), scene.getFrameState()); };
                    } else if (typeof value.getPosition === 'function') {
                        var position = value.getPosition();
                        this._computeScreenPosition = function() { return scene.computeScreenSpacePosition( position, screenPosition); };
                    }
                    this._content = value.balloon;
                    this._updateContent = true;
                    this.balloonVisible = true;
                }

            }

        }
    });

    return BalloonViewModel;
});