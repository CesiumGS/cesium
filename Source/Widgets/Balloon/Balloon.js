/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../getElement',
        './BalloonViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        destroyObject,
        getElement,
        BalloonViewModel,
        knockout) {
    "use strict";

    /**
     * A widget for displaying data in a balloon pointing to a picked object
     *
     * @alias Balloon
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @see Fullscreen
     */
    var Balloon = function(container, scene) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        container = getElement(container);

        this._container = container;
        container.setAttribute('data-bind',
                'css: { "cesium-balloon-wrapper-visible" : balloonVisible, "cesium-balloon-wrapper-hidden" : !balloonVisible }');
        var el = document.createElement('div');
        this._element = el;
        el.className = 'cesium-balloon-wrapper';
        container.appendChild(el);
        el.setAttribute('data-bind', 'style: { "bottom" : _positionY, "left" : _positionX}');

        var contentWrapper = document.createElement('div');
        contentWrapper.className = 'cesium-balloon-content';
        el.appendChild(contentWrapper);
        var exA = document.createElement('a');
        exA.href = '#';
        exA.className = 'cesium-balloon-close';
        exA.setAttribute('data-bind', 'click: function(){balloonVisible = false; return false;}');
        contentWrapper.appendChild(exA);
        el.appendChild(contentWrapper);

        this._content = document.createElement('div');
        var balloon = document.createElement('div');
        balloon.className = 'cesium-balloon';
        balloon.appendChild(this._content);
        contentWrapper.appendChild(balloon);
        var point = document.createElement('div');
        point.className = 'cesium-balloon-point';
        point.setAttribute('data-bind', 'style: { "bottom" : _pointY, "left" : _pointX}');
        container.appendChild(point);

        var viewModel = new BalloonViewModel(scene, this._content, this._element, this._container);
        this._viewModel = viewModel;

        this._point = point;

        knockout.applyBindings(this._viewModel, this._element);
        knockout.applyBindings(this._viewModel, this._point);
        knockout.applyBindings(this._viewModel, this._container);
    };

    defineProperties(Balloon.prototype, {
        /**
         * Gets the parent container.
         * @memberof Balloon.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof Balloon.prototype
         *
         * @type {BalloonViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof Balloon
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Balloon.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof Balloon
     */
    Balloon.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        this._viewModel.destroy();
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return Balloon;
});