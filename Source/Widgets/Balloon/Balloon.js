/*global define*/
define([
        '../../Core/Cartesian2',
        '../../Core/Cartesian3',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../Core/ScreenSpaceEventHandler',
        '../../Core/ScreenSpaceEventType',
        '../getElement',
        './BalloonViewModel',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian2,
        Cartesian3,
        defineProperties,
        DeveloperError,
        destroyObject,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        getElement,
        BalloonViewModel,
        knockout) {
    "use strict";
    var screenPosition = new Cartesian2();

    function clickOrTouch(widget, e) {
        var scene = widget._scene;
        var viewModel = widget.viewModel;

        var clientX;
        var clientY;
        if (e.type === 'touchend') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        var pickedObject = scene.pick({x: clientX, y: clientY});
        if (typeof pickedObject !== 'undefined' && typeof pickedObject.balloon !== 'undefined') {
            if (typeof pickedObject.computeScreenSpacePosition === 'function') {
                viewModel.computeScreenPosition = function() { return pickedObject.computeScreenSpacePosition(scene.getContext(), scene.getFrameState()); };
            } else if (typeof pickedObject.getPosition === 'function') {
                var position = pickedObject.getPosition();
                viewModel.computeScreenPosition = function() { return scene.computeWindowPosition( position, screenPosition); };
            }
            viewModel.content = pickedObject.balloon;
        }
    }

    var Balloon = function(container, scene) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        var el = document.createElement('div');
        this._element = el;
        this._scene = scene;
        el.className = 'cesium-balloon-wrapper';
        container.appendChild(el);
        el.setAttribute('data-bind',
                'css: { "cesium-balloon-wrapper-visible" : balloonVisible, "cesium-balloon-wrapper-hidden" : !balloonVisible },\
                style: { "bottom" : _positionY, "left" : _positionX}');

        var contentWrapper = document.createElement('div');
        contentWrapper.className = 'cesium-balloon-content';
        el.appendChild(contentWrapper);
        var ex = document.createElement('div');
        var exA = document.createElement('a');
        exA.href = '#';
        exA.textContent = '[x]';
        ex.appendChild(exA);
        ex.className = 'ceisum-balloon-close';
        ex.setAttribute('data-bind', 'click: function(){balloonVisible = false;}');
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

        var viewModel = new BalloonViewModel(scene, this._content, this._element, this._container);
        this._viewModel = viewModel;

        var that = this;
        var mouseCallback = function(e) {
            clickOrTouch(that, e);
        };

        document.addEventListener('click', mouseCallback, false);
        document.addEventListener('touchend', mouseCallback, false);

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

    Balloon.prototype.render = function() {
        this.viewModel.render();
    };

    return Balloon;
});