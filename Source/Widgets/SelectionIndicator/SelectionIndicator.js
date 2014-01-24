/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../getElement',
        './SelectionIndicatorViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        destroyObject,
        getElement,
        SelectionIndicatorViewModel,
        knockout) {
    "use strict";

    /**
     * A widget for displaying an indicator on a selected object.
     *
     * @alias SelectionIndicator
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     */
    var SelectionIndicator = function(container, scene) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        container.setAttribute('data-bind', 'css: { "cesium-selection-container" : true, "cesium-selection-container-visible" : showSelection }');

        var el = document.createElement('div');
        el.className = 'cesium-selection-wrapper';
        el.setAttribute('data-bind', 'style: { "bottom" : _positionY, "left" : _positionX }');
        container.appendChild(el);
        this._element = el;

        var svgNS = 'http://www.w3.org/2000/svg';
        var trianglePath = 'm -10,-40 20,0 -10,40 z';
        var circlePath = 'm 0,-35 c -19.329966,0 -35,15.67003 -35,35 0,19.32997 15.670034,35 35,35 C 19.329966,35 35,19.32997 35,0 35,-19.32997 19.329966,-35 0,-35 z m 0,5 c 16.568542,0 30,13.43146 30,30 0,16.56854 -13.431458,30 -30,30 -16.568542,0 -30,-13.43146 -30,-30 0,-16.56854 13.431458,-30 30,-30 z';

        var svg = document.createElementNS(svgNS, 'svg:svg');
        svg.setAttribute('width', 160);
        svg.setAttribute('height', 160);
        svg.setAttribute('viewBox', '0 0 160 160');

        var group = document.createElementNS(svgNS, 'g');
        group.setAttribute('transform', 'translate(80,80)');
        svg.appendChild(group);

        var circlePathElement = document.createElementNS(svgNS, 'path');
        circlePathElement.setAttribute('class', 'cesium-selection-circle');
        circlePathElement.setAttribute('d', circlePath);
        group.appendChild(circlePathElement);

        for (var i = 0; i < 4; ++i) {
            var pathElement = document.createElementNS(svgNS, 'path');
            pathElement.setAttribute('data-bind', 'attr: { transform: _transform' + i + ' }');
            pathElement.setAttribute('d', trianglePath);
            group.appendChild(pathElement);
        }

        el.appendChild(svg);

        var infoElement = document.createElement('div');
        infoElement.className = 'cesium-selection-info';
        infoElement.setAttribute('data-bind', 'css: { "cesium-selection-info-visible" : showSelection }');
        container.appendChild(infoElement);
        this._infoElement = infoElement;

        var titleElement = document.createElement('div');
        titleElement.className = 'cesium-selection-info-title';
        titleElement.setAttribute('data-bind', 'text: titleText');
        infoElement.appendChild(titleElement);
        this._titleElement = titleElement;

        var closeElement = document.createElement('button');
        closeElement.type = 'button';
        closeElement.className = 'cesium-selection-info-close';
        closeElement.setAttribute('data-bind', 'click: function () { onCloseInfo.raiseEvent(); }');
        closeElement.innerHTML = '&times;';
        infoElement.appendChild(closeElement);

        var infoBodyElement = document.createElement('div');
        infoBodyElement.className = 'cesium-selection-info-body';
        infoElement.appendChild(infoBodyElement);

        var descriptionElement = document.createElement('div');
        descriptionElement.className = 'cesium-selection-info-description';
        descriptionElement.setAttribute('data-bind', 'html: descriptionText, style : { maxHeight : maxHeightOffset(40) }');
        infoBodyElement.appendChild(descriptionElement);

        var viewModel = new SelectionIndicatorViewModel(scene, this._element, this._container);
        this._viewModel = viewModel;

        knockout.applyBindings(this._viewModel, this._container);
    };

    defineProperties(SelectionIndicator.prototype, {
        /**
         * Gets the parent container.
         * @memberof SelectionIndicator.prototype
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
         * @memberof SelectionIndicator.prototype
         *
         * @type {SelectionIndicatorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof SelectionIndicator
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    SelectionIndicator.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof SelectionIndicator
     */
    SelectionIndicator.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return SelectionIndicator;
});