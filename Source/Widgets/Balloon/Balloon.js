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

    var Balloon = function(container, balloonElement) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        var el = document.createElement('div');
        this._element = el;
        el.className = 'cesium-balloon-wrapper';
        container.appendChild(el);
        el.setAttribute('data-bind', 'css: { "cesium-balloon-wrapper-visible" : balloonVisible, "cesium-balloon-wrapper-hidden" : !balloonVisible }, style: { "top" : positionY, "left" : positionX}');

        var contentWrapper = document.createElement('div');
        contentWrapper.className = 'cesium-balloon-content';
        el.appendChild(contentWrapper);
        var ex = document.createElement('div');
        var exA = document.createElement('a');
        exA.href = '#';
        exA.textContent = '[x]';
        ex.appendChild(exA);
        ex.className = 'ceisum-balloon-close';
        ex.setAttribute('data-bind', 'click: showBalloon');
        contentWrapper.appendChild(ex);
        el.appendChild(contentWrapper);

        this._content = document.createElement('div');
        var balloon = document.createElement('div');
        balloon.className = 'cesium-balloon';
        balloon.appendChild(this._content);
        contentWrapper.appendChild(balloon);
        var point = document.createElement('div');
        point.className = 'cesium-balloon-point';
        el.appendChild(point);


        this._viewModel = new BalloonViewModel(balloonElement, this._content, this._element);

        knockout.applyBindings(this._viewModel, this._element);
    };

    defineProperties(Balloon.prototype, {
        container : {
            get : function() {
                return this._container;
            }
        },

        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    Balloon.prototype.isDestroyed = function() {
        return false;
    };

    Balloon.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        this._viewModel.destroy();
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return Balloon;
});