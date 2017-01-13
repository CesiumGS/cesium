/*global define*/
define([
    '../../Core/Check',
    '../../Core/defineProperties',
    '../../ThirdParty/knockout',
    '../getElement',
    '../CesiumInspector/Cesium3DTilesInspectorViewModel'
    ], function(
        Check,
        defineProperties,
        knockout,
        getElement,
        Cesium3DTilesInspectorViewModel) {
    'use strict';

    /**
     * Inspector widget to aid in debugging 3D tiles
     *
     * @alias Cesium3DTilesInspector
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene the Scene instance to use.
     *
     * @exception {DeveloperError} container is requred.
     * @exception {DeveloperError} scene is required.
     */
    function Cesium3DTilesInspector(container, scene) {
        //>includeStart('debug', pragmas.debug);
        Check.defined(container, 'container');
        Check.typeOf.object(scene, 'scene');

        container = getElement(container);

        var that = this;
        var viewModel = new Cesium3DTilesInspectorViewModel(scene, function(tileset) {
            that._onLoad(tileset);
        });

        this._viewModel = viewModel;
        this._container = container;

        var element = document.createElement('div');
        this._element = element;
        var text = document.createElement('div');
        text.textContent = 'Cesium 3D Tiles Inspector';
        text.className = 'cesium-cesiumInspector-button';
        element.appendChild(text);
        // text.setAttribute('data-bind', 'click: toggleDropDown');
        element.className = 'cesium-cesiumInspector';
        // element.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-visible" : dropDownVisible, "cesium-cesiumInspector-hidden" : !dropDownVisible }');
        container.appendChild(this._element);

        var tilesets = document.createElement('select');
        tilesets.setAttribute('data-bind', 'options: _tilesetOptions, ' +
                                           'optionsText: "name", ' +
                                           'value: _selectedTileset, ' +
                                           'optionsCaption: "Choose a Tileset..."');
        element.appendChild(tilesets);

        knockout.applyBindings(viewModel, this._element);
    }

    Cesium3DTilesInspector.prototype.onLoad = function(callback) {
        this._onLoad = callback;
    };

    defineProperties(Cesium3DTilesInspector.prototype, {
        /**
         * Gets the parent container.
         * @memberof Cesium3DTilesInspector.prototype
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
         * @memberof Cesium3DTilesInspector.prototype
         *
         * @type {Cesium3DTilesInspectorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    return Cesium3DTilesInspector;
});
