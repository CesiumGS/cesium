/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './CesiumInspectorViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        CesiumInspectorViewModel,
        knockout) {
    "use strict";

    /**
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
        this._element.className = 'cesium-widget-button cesium-cesiumInspector-button';
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
        var frustumsCheckbox = document.createElement('input');
        frustumsCheckbox.className="cesium-cesiumInspectorPanel-frustumsCheckbox";
        frustumsCheckbox.type = 'checkbox';
        frustumsCheckbox.onclick = function() {
            scene.debugShowFrustums = this.checked;
        };
        debugShowFrustums.textContent = 'Show Frustums';
        debugShowFrustums.appendChild(frustumsCheckbox);

        knockout.applyBindings(viewModel, this._element);
        knockout.applyBindings(viewModel, panel);

        this._closeDropDown = function(e) {
            if (!(element.contains(e.target) || panel.contains(e.target))) {
                viewModel.dropDownVisible = false;
            }
        };

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