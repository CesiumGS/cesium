/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        defaultValue,
        defineProperties,
        destroyObject,
        DeveloperError,
        createCommand,
        knockout) {
    "use strict";

    var BalloonViewModel = function(balloonElement, contentElement, balloonDiv) {
        var that = this;
        this._balloonElement = defaultValue(balloonElement, document.body);
        this._balloonDiv = balloonDiv;
        this._contentElement = contentElement;
        this._callback = function() {};
        document.addEventListener(function(){}, this._callback);

        this.balloonVisible = false;
        this.positionX = '0';
        this.positionY = '0';
        knockout.track(this, ['balloonVisible', 'positionX', 'positionY']);

        this._showBalloon = createCommand(function() {
            that.balloonVisible = true;
        });

        this._hideBalloon = createCommand(function() {
            that.balloonVisible = false;
        });

    };

    defineProperties(BalloonViewModel.prototype, {
        content : {
            get : function() {
                return this._contentElement.innerHTML;
            },
            set : function(value) {
                if (typeof value !== 'string') {
                    throw new DeveloperError('value must be a string');
                }
                this._contentElement.innerHTML = value;
                this.balloonVisible = true;
            }
        },

        showBalloon: {
            get: function() {
                return this._showBalloon;
            }
        },

        hideBalloon: {
            get: function() {
                return this._hideBalloon;
            }
        },

        screenPosition: {
            get : function() {
                return this.position;
            },
            set: function(value) {
                var that = this;
                setTimeout(function () {
                    var height = that._balloonDiv.offsetHeight;
                    var width = that._balloonDiv.offsetWidth / 2;
                    that.positionX = Math.max((value.x - width), 0) + 'px';
                    that.positionY = Math.max((value.y - height - 20), 0) + 'px';
                }, 25);
            }
        }
    });

    BalloonViewModel.prototype.isDestroyed = function() {
        return false;
    };

    BalloonViewModel.prototype.destroy = function() {
        document.removeEventListener(function(){}, this._callback);
        destroyObject(this);
    };

    return BalloonViewModel;
});