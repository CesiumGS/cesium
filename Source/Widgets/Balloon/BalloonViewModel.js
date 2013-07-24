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

    var BalloonViewModel = function(scene, container, contentElement, balloonElement) {
        this._scene = scene;
        this._balloonElement = balloonElement;
        this._contentElement = contentElement;
        this._con = contentElement.innerHTML;
        this._position = new Cartesian2();
        this._callback = function() {};
        document.addEventListener(function(){}, this._callback);

        this.dragging = false;

        this._balloonVisible = false;
        this._positionX = '0';
        this._positionY = '0';
        this._updateContent = false;
        this._updatePosition = false;
        knockout.track(this, ['_balloonVisible', '_positionX', '_positionY']);

        var that = this;

        this._render = createCommand(function() { //TODO: streamline so positions don't run over fade
            if (that._updateContent) {
                that._balloonVisible = false;
                setTimeout(function () {
                    that._contentElement.innerHTML = that._content;
                    that._positionX = that._position.x + 'px';
                    that._positionY = that._position.y + 'px';
                    that._balloonVisible = true;
                    that.balloonVisible = true;
                }, 250);
                that._updatePosition = false;
                that._updateContent = false;
            } else if (that._updatePosition) {
                that._balloonVisible = that.balloonVisible;
                that._positionX = that._position.x + 'px';
                that._positionY = that._position.y + 'px';
                that._updatePosition = false;
            }
        });
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
                    throw new DeveloperError('value must be a string');
                }
                if (value !== this._content) {
                    this._content = value;
                    this._updateContent = true;
                }
            }
        },

        screenPosition: {
            get : function() {
                return this._position;
            },
            set: function(value) {
                if (!Cartesian2.equals(this._position, value)) {
                    this._position = Cartesian2.clone(value, this._position);
                    this._updatePosition = true;
                }
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