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
        var containerWidth = viewModel._container.clientWidth;
        var containerHeight = viewModel._container.clientHeight;

        var width = viewModel._balloonElement.offsetWidth;
        var height = viewModel._balloonElement.offsetHeight;
        position.x = Math.min(Math.max((position.x - width/2), 0), containerWidth - width);
        position.y = Math.min(Math.max((position.y + 20), 0), containerHeight - height);

        return position;
    }

    var BalloonViewModel = function(scene, contentElement, balloonElement, container) {
        this._scene = scene;
        this._container = container;
        this._balloonElement = balloonElement;
        this._contentElement = contentElement;
        this._content = contentElement.innerHTML;
        this._computeScreenPosition = undefined;

        this.balloonVisible = false;
        this._positionX = '0';
        this._positionY = '0';
        this._updateContent = false;
        this._updatePosition = false;
        this._timerRunning = false;

        knockout.track(this, ['balloonVisible', '_positionX', '_positionY']);

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
                                screenPos = shiftPosition(that, screenPos);
                                that._positionX = screenPos.x + 'px';
                                that._positionY = screenPos.y + 'px';
                            }
                        }
                        that.balloonVisible = true;
                        that._timerRunning = false;
                    }, 100);
                    that._updateContent = false;
                } else  if (typeof that._computeScreenPosition === 'function') {
                    var screenPos = that._computeScreenPosition();
                    screenPos = shiftPosition(that, screenPos);
                    that._positionX = screenPos.x + 'px';
                    that._positionY = screenPos.y + 'px';
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