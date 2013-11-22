/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/BoundingRectangle',
        '../../Core/Color',
        '../../Core/DeveloperError',
        '../../Scene/PerformanceDisplay',
        '../../Scene/DebugModelMatrixPrimitive',
        '../getElement',
        './CesiumInspectorViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        BoundingRectangle,
        Color,
        DeveloperError,
        PerformanceDisplay,
        DebugModelMatrixPrimitive,
        getElement,
        CesiumInspectorViewModel,
        knockout) {
    "use strict";

    /**
     * Inspector widget to aid in debugging
     *
     * @alias CesiumInspector
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} scene is required.
     */

    var CesiumInspector = function(container, scene) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        container = getElement(container);

        var viewModel = new CesiumInspectorViewModel(scene);
        this._viewModel = viewModel;
        this._container = container;

        var element = document.createElement('button');
        this._element = element;
        this._element.type = 'button';
        this._element.textContent = 'Cesium Inspector';
        this._element.className = 'cesium-cesiumInspector';
        this._element.setAttribute('data-bind', 'click: toggleDropDown');
        container.appendChild(this._element);

        var panel = document.createElement('div');
        this._panel = panel;
        panel.className = 'cesium-cesiumInspectorPanel-dropDown';
        panel.setAttribute('data-bind', 'css: { "cesium-cesiumInspectorPanel-visible" : dropDownVisible, "cesium-cesiumInspectorPanel-hidden" : !dropDownVisible }');
        container.appendChild(panel);

        var debugShowFrustums = document.createElement('div');
        this._debugShowFrustums = debugShowFrustums;
        panel.appendChild(debugShowFrustums);
        var frustumStats = document.createElement('div');
        this._frustumStats = frustumStats;frustumStats.className = 'cesium-cesiumInspectorPanel-frustumStats';
        frustumStats.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : showFrustums, "cesium-cesiumInspector-hide" : !showFrustums}, html: frustumStatText');
        var frustumsCheckbox = document.createElement('input');
        this._frustumsCheckbox = frustumsCheckbox;
        frustumsCheckbox.type = 'checkbox';
        frustumsCheckbox.setAttribute('data-bind', 'click: toggleFrustums');
        debugShowFrustums.appendChild(frustumsCheckbox);
        debugShowFrustums.appendChild(document.createTextNode('Show Frustums'));
        debugShowFrustums.appendChild(frustumStats);

        var performanceDisplay = document.createElement('div');
        this._performanceDisplay = performanceDisplay;
        panel.appendChild(performanceDisplay);
        var pdCheckbox = document.createElement('input');
        pdCheckbox.type = 'checkbox';
        pdCheckbox.setAttribute('data-bind', 'click: togglePerformance');
        performanceDisplay.appendChild(pdCheckbox);
        performanceDisplay.appendChild(document.createTextNode('Performance Display'));

        var debugSphere = document.createElement('div');
        this._performanceDisplay = debugSphere;
        panel.appendChild(debugSphere);
        var bsCheckbox = document.createElement('input');
        bsCheckbox.type = 'checkbox';
        bsCheckbox.setAttribute('data-bind', 'click: toggleBoundingSphere');
        debugSphere.appendChild(bsCheckbox);
        debugSphere.appendChild(document.createTextNode('Debug bounding sphere'));

        var refFrame = document.createElement('div');
        this._refFrame = refFrame;
        panel.appendChild(refFrame);
        var rfCheckbox = document.createElement('input');
        rfCheckbox.type = 'checkbox';
        rfCheckbox.setAttribute('data-bind', 'click: toggleRefFrame');
        refFrame.appendChild(rfCheckbox);
        refFrame.appendChild(document.createTextNode('Show reference frame'));

        var primitiveOnly = document.createElement('div');
        this._primitiveOnly = primitiveOnly;
        panel.appendChild(primitiveOnly);
        var primitiveOnlyCheckbox = document.createElement('input');
        primitiveOnlyCheckbox.type = 'checkbox';
        primitiveOnlyCheckbox.setAttribute('data-bind', 'click: togglePickPrimitive');
        primitiveOnly.appendChild(primitiveOnlyCheckbox);
        primitiveOnly.appendChild(document.createTextNode('Show only this primitive'));

        knockout.applyBindings(viewModel, this._element);
        knockout.applyBindings(viewModel, this._panel);
    };

    defineProperties(CesiumInspector.prototype, {
        /**
         * Gets the parent container.
         * @memberof BaseLayerPicker.prototype
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
         * @memberof BaseLayerPicker.prototype
         *
         * @type {BaseLayerPickerViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof BaseLayerPicker
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumInspector.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof BaseLayerPicker
     */
    CesiumInspector.prototype.destroy = function() {
        knockout.cleanNode(this._element);
        knockout.cleanNode(this._panel);
        var container = this._container;
        container.removeChild(this._element);
        container.removeChild(this._panel);
        return destroyObject(this);
    };

    return CesiumInspector;
});