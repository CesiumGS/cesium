/*global define*/
define([
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
    var position;
    var pickedObject;

    function updatePosition(widget, screenPosition) {
        var containerWidth = widget.container.clientWidth;
        var containerHeight = widget.container.clientHeight;

        var width = widget._element.offsetWidth;
        var height = widget._element.offsetHeight;
        screenPosition.x = Math.min(Math.max((screenPosition.x - width/2), 0), containerWidth - width);
        screenPosition.y = Math.min(Math.max((screenPosition.y + 20), 0), containerHeight - height);

        return screenPosition;
    }

    function mouseOrTouch(widget, e) {
        var scene = widget._scene;
        var viewModel = widget.viewModel;
        var dragging = viewModel.dragging;

        var clientX;
        var clientY;
        if (e.type === 'touchstart' || e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        if (e.type === 'mouseup') {
            var newPickedObject = scene.pick({x: clientX, y: clientY});
            if (typeof newPickedObject !== 'undefined' && typeof newPickedObject.balloon !== 'undefined') {
                position = newPickedObject.getPosition();
                if (typeof position !== 'undefined') {
                    if (pickedObject === newPickedObject) {
                        viewModel.screenPosition = updatePosition(widget, scene.computeWindowPosition(position));
                    } else {
                        viewModel.content = newPickedObject.balloon;
                        viewModel.screenPosition = updatePosition(widget, scene.computeWindowPosition(position));
                        pickedObject = newPickedObject;
                    }

                }
            }
            viewModel.dragging = false;
        } else if (e.type === 'mousedown' || (dragging && e.type === 'mousemove') ||
                (e.type === 'touchstart' && e.touches.length === 1) ||
                (dragging && e.type === 'touchmove' && e.touches.length === 1)) {

            if ((e.type === 'mousedown') || (e.type === 'touchstart')) {
                viewModel.dragging = true;
            } else if (dragging && (e.type === 'touchmove' || e.type === 'mousemove') &&
                viewModel.balloonVisible && typeof position !== 'undefined') {
                viewModel.screenPosition = updatePosition(widget, scene.computeWindowPosition(position));
            } else {
                viewModel.dragging = false;
            }
        }
    }

    var Balloon = function(container, scene) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        this._scene = scene;
        var el = document.createElement('div');
        this._element = el;
        el.className = 'cesium-balloon-wrapper';
        container.appendChild(el);
        el.setAttribute('data-bind',
                'css: { "cesium-balloon-wrapper-visible" : _balloonVisible, "cesium-balloon-wrapper-hidden" : !_balloonVisible },\
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

        var viewModel = new BalloonViewModel(scene, container, this._content, this._element);
        this._viewModel = viewModel;

        var that = this;
        var mouseCallback = function(e) {
            mouseOrTouch(that, e);
        };

        document.addEventListener('mousedown', mouseCallback, true);
        document.addEventListener('touchstart', mouseCallback, true);
        document.addEventListener('mousemove', mouseCallback, true);
        document.addEventListener('touchmove', mouseCallback, true);
        document.addEventListener('mouseup', mouseCallback, true);
        document.addEventListener('touchend', mouseCallback, true);

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
        var viewModel = this.viewModel;
        if (typeof position !== 'undefined') {
            viewModel.screenPosition = updatePosition(this, this._scene.computeWindowPosition(position));
            viewModel.render();
        }
    };

    return Balloon;
});