define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        '../InspectorShared',
        './CesiumInspectorViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        InspectorShared,
        CesiumInspectorViewModel) {
    'use strict';

    /**
     * Inspector widget to aid in debugging
     *
     * @alias CesiumInspector
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     *
     * @demo {@link https://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Inspector.html|Cesium Sandcastle Cesium Inspector Demo}
     */
    function CesiumInspector(container, scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var performanceContainer = document.createElement('div');

        var viewModel = new CesiumInspectorViewModel(scene, performanceContainer);
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

        var createSection = InspectorShared.createSection;
        var createCheckbox = InspectorShared.createCheckbox;

        // General
        var generalSection = createSection(panel, 'General', 'generalVisible', 'toggleGeneral');

        var debugShowFrustums = createCheckbox('Show Frustums', 'frustums');
        var frustumStatistics = document.createElement('div');
        frustumStatistics.className = 'cesium-cesiumInspector-frustumStatistics';
        frustumStatistics.setAttribute('data-bind', 'visible: frustums, html: frustumStatisticText');
        debugShowFrustums.appendChild(frustumStatistics);
        generalSection.appendChild(debugShowFrustums);

        generalSection.appendChild(createCheckbox('Show Frustum Planes', 'frustumPlanes'));
        generalSection.appendChild(createCheckbox('Performance Display', 'performance'));

        performanceContainer.className = 'cesium-cesiumInspector-performanceDisplay';
        generalSection.appendChild(performanceContainer);

        var shaderCacheDisplay = document.createElement('div');
        shaderCacheDisplay.className = 'cesium-cesiumInspector-shaderCache';
        shaderCacheDisplay.setAttribute('data-bind', 'html: shaderCacheText');
        generalSection.appendChild(shaderCacheDisplay);

        // https://github.com/AnalyticalGraphicsInc/cesium/issues/6763
        // var globeDepth = createCheckbox('Show globe depth', 'globeDepth');
        // generalSection.appendChild(globeDepth);
        //
        // var globeDepthFrustum = document.createElement('div');
        // globeDepth.appendChild(globeDepthFrustum);
        //
        // generalSection.appendChild(createCheckbox('Show pick depth', 'pickDepth'));

        var depthFrustum = document.createElement('div');
        generalSection.appendChild(depthFrustum);

        // Use a span with HTML binding so that we can indent with non-breaking spaces.
        var gLabel = document.createElement('span');
        gLabel.setAttribute('data-bind', 'html: "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Frustum:"');
        depthFrustum.appendChild(gLabel);

        var gText = document.createElement('span');
        gText.setAttribute('data-bind', 'text: depthFrustumText');
        depthFrustum.appendChild(gText);

        var gMinusButton = document.createElement('input');
        gMinusButton.type = 'button';
        gMinusButton.value = '-';
        gMinusButton.className = 'cesium-cesiumInspector-pickButton';
        gMinusButton.setAttribute('data-bind', 'click: decrementDepthFrustum');
        depthFrustum.appendChild(gMinusButton);

        var gPlusButton = document.createElement('input');
        gPlusButton.type = 'button';
        gPlusButton.value = '+';
        gPlusButton.className = 'cesium-cesiumInspector-pickButton';
        gPlusButton.setAttribute('data-bind', 'click: incrementDepthFrustum');
        depthFrustum.appendChild(gPlusButton);

        // Primitives
        var primSection = createSection(panel, 'Primitives', 'primitivesVisible', 'togglePrimitives');
        var pickPrimRequired = document.createElement('div');
        pickPrimRequired.className = 'cesium-cesiumInspector-pickSection';
        primSection.appendChild(pickPrimRequired);

        var pickPrimitiveButton = document.createElement('input');
        pickPrimitiveButton.type = 'button';
        pickPrimitiveButton.value = 'Pick a primitive';
        pickPrimitiveButton.className = 'cesium-cesiumInspector-pickButton';
        pickPrimitiveButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickPrimitiveActive}, click: pickPrimitive');
        var buttonWrap = document.createElement('div');
        buttonWrap.className = 'cesium-cesiumInspector-center';
        buttonWrap.appendChild(pickPrimitiveButton);
        pickPrimRequired.appendChild(buttonWrap);

        pickPrimRequired.appendChild(createCheckbox('Show bounding sphere', 'primitiveBoundingSphere', 'hasPickedPrimitive'));
        pickPrimRequired.appendChild(createCheckbox('Show reference frame', 'primitiveReferenceFrame', 'hasPickedPrimitive'));

        this._primitiveOnly = createCheckbox('Show only selected', 'filterPrimitive', 'hasPickedPrimitive');
        pickPrimRequired.appendChild(this._primitiveOnly);

        // Terrain
        var terrainSection = createSection(panel, 'Terrain', 'terrainVisible', 'toggleTerrain');
        var pickTileRequired = document.createElement('div');
        pickTileRequired.className = 'cesium-cesiumInspector-pickSection';
        terrainSection.appendChild(pickTileRequired);
        var pickTileButton = document.createElement('input');
        pickTileButton.type = 'button';
        pickTileButton.value = 'Pick a tile';
        pickTileButton.className = 'cesium-cesiumInspector-pickButton';
        pickTileButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickTileActive}, click: pickTile');
        buttonWrap = document.createElement('div');
        buttonWrap.appendChild(pickTileButton);
        buttonWrap.className = 'cesium-cesiumInspector-center';
        pickTileRequired.appendChild(buttonWrap);
        var tileInfo = document.createElement('div');
        pickTileRequired.appendChild(tileInfo);
        var parentTile = document.createElement('input');
        parentTile.type = 'button';
        parentTile.value = 'Parent';
        parentTile.className = 'cesium-cesiumInspector-pickButton';
        parentTile.setAttribute('data-bind', 'click: selectParent');
        var nwTile = document.createElement('input');
        nwTile.type = 'button';
        nwTile.value = 'NW';
        nwTile.className = 'cesium-cesiumInspector-pickButton';
        nwTile.setAttribute('data-bind', 'click: selectNW');
        var neTile = document.createElement('input');
        neTile.type = 'button';
        neTile.value = 'NE';
        neTile.className = 'cesium-cesiumInspector-pickButton';
        neTile.setAttribute('data-bind', 'click: selectNE');
        var swTile = document.createElement('input');
        swTile.type = 'button';
        swTile.value = 'SW';
        swTile.className = 'cesium-cesiumInspector-pickButton';
        swTile.setAttribute('data-bind', 'click: selectSW');
        var seTile = document.createElement('input');
        seTile.type = 'button';
        seTile.value = 'SE';
        seTile.className = 'cesium-cesiumInspector-pickButton';
        seTile.setAttribute('data-bind', 'click: selectSE');

        var tileText = document.createElement('div');
        tileText.className = 'cesium-cesiumInspector-tileText';
        tileInfo.className = 'cesium-cesiumInspector-frustumStatistics';
        tileInfo.appendChild(tileText);
        tileInfo.setAttribute('data-bind', 'visible: hasPickedTile');
        tileText.setAttribute('data-bind', 'html: tileText');

        var relativeText = document.createElement('div');
        relativeText.className = 'cesium-cesiumInspector-relativeText';
        relativeText.textContent = 'Select relative:';
        tileInfo.appendChild(relativeText);

        var table = document.createElement('table');
        var tr1 = document.createElement('tr');
        var tr2 = document.createElement('tr');
        var td1 = document.createElement('td');
        td1.appendChild(parentTile);
        var td2 = document.createElement('td');
        td2.appendChild(nwTile);
        var td3 = document.createElement('td');
        td3.appendChild(neTile);
        tr1.appendChild(td1);
        tr1.appendChild(td2);
        tr1.appendChild(td3);
        var td4 = document.createElement('td');
        var td5 = document.createElement('td');
        td5.appendChild(swTile);
        var td6 = document.createElement('td');
        td6.appendChild(seTile);
        tr2.appendChild(td4);
        tr2.appendChild(td5);
        tr2.appendChild(td6);
        table.appendChild(tr1);
        table.appendChild(tr2);

        tileInfo.appendChild(table);

        pickTileRequired.appendChild(createCheckbox('Show bounding volume', 'tileBoundingSphere', 'hasPickedTile'));
        pickTileRequired.appendChild(createCheckbox('Show only selected', 'filterTile', 'hasPickedTile'));

        terrainSection.appendChild(createCheckbox('Wireframe', 'wireframe'));
        terrainSection.appendChild(createCheckbox('Suspend LOD update', 'suspendUpdates'));
        terrainSection.appendChild(createCheckbox('Show tile coordinates', 'tileCoordinates'));

        knockout.applyBindings(viewModel, this._element);
    }

    defineProperties(CesiumInspector.prototype, {
        /**
         * Gets the parent container.
         * @memberof CesiumInspector.prototype
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
         * @memberof CesiumInspector.prototype
         *
         * @type {CesiumInspectorViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    CesiumInspector.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    CesiumInspector.prototype.destroy = function() {
        knockout.cleanNode(this._element);
        this._container.removeChild(this._element);
        this.viewModel.destroy();

        return destroyObject(this);
    };

    return CesiumInspector;
});
