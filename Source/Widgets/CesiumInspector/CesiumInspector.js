/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/BoundingRectangle',
        '../../Core/Color',
        '../../Core/DeveloperError',
        '../../Scene/PerformanceDisplay',
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
    function frustumStatsToString(stats) {
        var str;
        if (defined(stats)) {
            str = 'Total commands: ' + stats.totalCommands + '<br>Commands in frustums:';
            var com = stats.commandsInFrustums;
            for (var n in com) {
                if (com.hasOwnProperty(n)) {
                    str += '<br>&nbsp;&nbsp;&nbsp;&nbsp;' + n + ': ' + com[n];
                }
            }
        }

        return str;
    }

    var br = new BoundingRectangle(10, 250, 80, 40);
    var bc = new Color(0.15, 0.15, 0.15, 0.75);
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
        var frustumStats = document.createElement('div');
        frustumStats.className = 'cesium-cesiumInspectorPanel-frustumStats cesium-cesiumInspector-show';
        var frustumsCheckbox = document.createElement('input');
        frustumsCheckbox.type = 'checkbox';
        var interval;
        frustumsCheckbox.onclick = function() {
            if (this.checked) {
                scene.debugShowFrustums = true;
                interval = setInterval(function() {
                    frustumStats.innerHTML = frustumStatsToString(scene.debugFrustumStatistics);
                }, 100);
                frustumStats.className = 'cesium-cesiumInspectorPanel-frustumStats cesium-cesiumInspector-show';
            } else {
                clearInterval(interval);
                scene.debugShowFrustums = false;
                frustumStats.className = 'cesium-cesiumInspectorPanel-frustumStats cesium-cesiumInspector-hide';
            }
        };
        debugShowFrustums.textContent = 'Show Frustums: ';
        debugShowFrustums.appendChild(frustumsCheckbox);
        debugShowFrustums.appendChild(frustumStats);

        var performanceDisplay = document.createElement('div');
        this._performanceDisplay = performanceDisplay;
        panel.appendChild(performanceDisplay);
        var pdCheckbox = document.createElement('input');
        pdCheckbox.type = 'checkbox';
        var pd;
        pdCheckbox.onclick = function() {
            if (this.checked) {
                pd = new PerformanceDisplay({
                    rectangle : br,
                    backgroundColor: bc
                });
                scene.getPrimitives().add(pd);
            } else {
                scene.getPrimitives().remove(pd);
            }

        };
        performanceDisplay.textContent = 'Performance Display: ';
        performanceDisplay.appendChild(pdCheckbox);

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