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
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @see Fullscreen
     */
    var Balloon = function(container, scene) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        container.setAttribute('data-bind',
                'css: { "cesium-balloon-wrapper-visible" : showBalloon, "cesium-balloon-wrapper-hidden" : !showBalloon }');
        var el = document.createElement('div');
        this._element = el;
        el.className = 'cesium-balloon-wrapper';
        container.appendChild(el);
        el.setAttribute('data-bind', 'style: { "bottom" : _positionY, "left" : _positionX}');

        var contentWrapper = document.createElement('div');
        contentWrapper.className = 'cesium-balloon-content';
        contentWrapper.setAttribute('data-bind', 'style: {"max-width": _maxWidth, "max-height": _maxHeight}');
        el.appendChild(contentWrapper);
        var ex = document.createElement('a');
        ex.href = '#';
        ex.className = 'cesium-balloon-close';
        ex.setAttribute('data-bind', 'click: function(){showBalloon = false; return false;}');
        el.appendChild(ex);


        this._content = document.createElement('div');
        contentWrapper.appendChild(this._content);
        var pointContainer = document.createElement('div');
        pointContainer.className = 'cesium-balloon-point-container';
        pointContainer.setAttribute('data-bind',
                'css: { "cesium-balloon-point-container-downup" : _down || _up, "cesium-balloon-point-container-leftright" : _left || _right,\
                "cesium-balloon-point-show" : showBalloon && showPoint, "cesium-balloon-point-hide" : !showBalloon || !showPoint},\
                style: { "bottom" : _pointY, "left" : _pointX}');
        var point = document.createElement('div');
        point.className = 'cesium-balloon-point';
        point.setAttribute('data-bind',
                'css: { "cesium-balloon-point-down" : _down,\
                        "cesium-balloon-point-up" : _up,\
                        "cesium-balloon-point-left" : _left,\
                        "cesium-balloon-point-right" : _right}');
        pointContainer.appendChild(point);
        container.appendChild(pointContainer);

        var viewModel = new BalloonViewModel(scene, this._content, this._element, this._container);
        this._viewModel = viewModel;

        this._pointContainer = pointContainer;
        this._point = point;
        this._contentWrapper = contentWrapper;

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
        container.removeChild(this._element);
        container.removeChild(this._pointContainer);
        return destroyObject(this);
    };

    return Balloon;
});