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

        var element = document.createElement('div');
        this._element = element;
        var text = document.createElement('div');
        text.textContent = 'Cesium Inspector';
        text.className = 'cesium-cesiumInspector-button';
        text.setAttribute('data-bind', 'click: toggleDropDown');
        element.appendChild(text);
        element.className = 'cesium-cesiumInspector';
        element.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-visible" : dropDownVisible, "cesium-cesiumInspector-hidden" : !dropDownVisible }');
        container.appendChild(this._element);

        var panel = document.createElement('div');
        this._panel = panel;
        panel.className = 'cesium-cesiumInspector-dropDown';
        element.appendChild(panel);

        // General
        var general = document.createElement('div');
        general.textContent = 'General';
        panel.appendChild(general);

        var debugShowFrustums = document.createElement('div');
        panel.appendChild(debugShowFrustums);
        var frustumStats = document.createElement('div');
        frustumStats.className = 'cesium-cesiumInspector-frustumStats';
        frustumStats.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : showFrustums, "cesium-cesiumInspector-hide" : !showFrustums}, html: frustumStatText');
        var frustumsCheckbox = document.createElement('input');
        frustumsCheckbox.type = 'checkbox';
        frustumsCheckbox.setAttribute('data-bind', 'click: toggleFrustums');
        debugShowFrustums.appendChild(frustumsCheckbox);
        debugShowFrustums.appendChild(document.createTextNode('Show Frustums'));
        debugShowFrustums.appendChild(frustumStats);

        var performanceDisplay = document.createElement('div');
        panel.appendChild(performanceDisplay);
        var pdCheckbox = document.createElement('input');
        pdCheckbox.type = 'checkbox';
        pdCheckbox.setAttribute('data-bind', 'click: togglePerformance');
        performanceDisplay.appendChild(pdCheckbox);
        performanceDisplay.appendChild(document.createTextNode('Performance Display'));

        // Primitives
        var prim = document.createElement('div');
        prim.innerHTML = '<br>Primitives';
        panel.appendChild(prim);

        var pickPrimitiveButton = document.createElement('input');
        pickPrimitiveButton.type = 'button';
        pickPrimitiveButton.value = 'Pick a primitive';
        pickPrimitiveButton.className = 'cesium-cesiumInspector-pickButton';
        pickPrimitiveButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickPrimitiveActive}, click: pickPrimitive');
        panel.appendChild(pickPrimitiveButton);

        var debugSphere = document.createElement('div');
        panel.appendChild(debugSphere);
        var bsCheckbox = document.createElement('input');
        bsCheckbox.type = 'checkbox';
        bsCheckbox.setAttribute('data-bind', 'click: toggleBoundingSphere, enable: hasPickedPrimitive');
        debugSphere.appendChild(bsCheckbox);
        debugSphere.appendChild(document.createTextNode('Show bounding sphere'));

        var refFrame = document.createElement('div');
        panel.appendChild(refFrame);
        var rfCheckbox = document.createElement('input');
        rfCheckbox.type = 'checkbox';
        rfCheckbox.setAttribute('data-bind', 'click: toggleRefFrame, enable: hasPickedPrimitive');
        refFrame.appendChild(rfCheckbox);
        refFrame.appendChild(document.createTextNode('Show reference frame'));

        var primitiveOnly = document.createElement('div');
        this._primitiveOnly = primitiveOnly;
        panel.appendChild(primitiveOnly);
        var primitiveOnlyCheckbox = document.createElement('input');
        primitiveOnlyCheckbox.type = 'checkbox';
        primitiveOnlyCheckbox.setAttribute('data-bind', 'click: toggleFilterPrimitive, enable: hasPickedPrimitive');
        primitiveOnly.appendChild(primitiveOnlyCheckbox);
        primitiveOnly.appendChild(document.createTextNode('Show only this primitive'));

        // Terrain
        var terrain = document.createElement('div');
        terrain.innerHTML = '<br>Terrain';
        panel.appendChild(terrain);

        var wireframe = document.createElement('div');
        panel.appendChild(wireframe);
        var wCheckbox = document.createElement('input');
        wCheckbox.type = 'checkbox';
        wCheckbox.setAttribute('data-bind', 'click: toggleWireframe');
        wireframe.appendChild(wCheckbox);
        wireframe.appendChild(document.createTextNode('Wireframe'));

        var suspendUpdates = document.createElement('div');
        panel.appendChild(suspendUpdates);
        var upCheckbox = document.createElement('input');
        upCheckbox.type = 'checkbox';
        upCheckbox.setAttribute('data-bind', 'click: toggleSuspendUpdates');
        suspendUpdates.appendChild(upCheckbox);
        suspendUpdates.appendChild(document.createTextNode('Suspend LOD update'));

        var tileCoords = document.createElement('div');
        panel.appendChild(tileCoords);
        var coordCheck = document.createElement('input');
        coordCheck.type = 'checkbox';
        coordCheck.setAttribute('data-bind', 'click: toggleShowTileCoords');
        tileCoords.appendChild(coordCheck);
        tileCoords.appendChild(document.createTextNode('Show tile coordinates'));

        var pickTileButton = document.createElement('input');
        pickTileButton.type = 'button';
        pickTileButton.value = 'Pick a tile';
        pickTileButton.className = 'cesium-cesiumInspector-pickButton';
        pickTileButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickTileActive}, click: pickTile');
        panel.appendChild(pickTileButton);
        var tileInfo = document.createElement('div');
        panel.appendChild(tileInfo);
        tileInfo.textContent = 'Tile: ';
        var tileText = document.createElement('span');
        tileInfo.appendChild(tileText);
        tileText.setAttribute('data-bind', 'html: tileText');

        knockout.applyBindings(viewModel, this._element);
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