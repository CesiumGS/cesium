/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './CesiumInspectorViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
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
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} scene is required.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Cesium%20Inspector.html|Cesium Sandcastle Cesium Inspector Demo}
     */
    function CesiumInspector(container, scene) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

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

        // General
        var general = document.createElement('div');
        general.className = 'cesium-cesiumInspector-sectionHeader';
        var plus = document.createElement('span');
        plus.className = 'cesium-cesiumInspector-toggleSwitch';
        plus.setAttribute('data-bind', 'click: toggleGeneral, text: generalSwitchText');
        general.appendChild(plus);
        general.appendChild(document.createTextNode('General'));
        panel.appendChild(general);

        var generalSection = document.createElement('div');
        generalSection.className = 'cesium-cesiumInspector-section';
        generalSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : generalVisible, "cesium-cesiumInspector-hide" : !generalVisible}');
        panel.appendChild(generalSection);
        var debugShowFrustums = document.createElement('div');
        generalSection.appendChild(debugShowFrustums);
        var frustumStats = document.createElement('div');
        frustumStats.className = 'cesium-cesiumInspector-frustumStats';
        frustumStats.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : frustums, "cesium-cesiumInspector-hide" : !frustums}, html: frustumStatisticText');
        var frustumsCheckbox = document.createElement('input');
        frustumsCheckbox.type = 'checkbox';
        frustumsCheckbox.setAttribute('data-bind', 'checked: frustums, click: showFrustums');
        debugShowFrustums.appendChild(frustumsCheckbox);
        debugShowFrustums.appendChild(document.createTextNode('Show Frustums'));
        debugShowFrustums.appendChild(frustumStats);

        var performanceDisplay = document.createElement('div');
        generalSection.appendChild(performanceDisplay);
        var pdCheckbox = document.createElement('input');
        pdCheckbox.type = 'checkbox';
        pdCheckbox.setAttribute('data-bind', 'checked: performance, click: showPerformance');
        performanceDisplay.appendChild(pdCheckbox);
        performanceDisplay.appendChild(document.createTextNode('Performance Display'));

        performanceContainer.className = 'cesium-cesiumInspector-performanceDisplay';
        generalSection.appendChild(performanceContainer);

        var shaderCacheDisplay = document.createElement('div');
        shaderCacheDisplay.className = 'cesium-cesiumInspector-shaderCache';
        shaderCacheDisplay.setAttribute('data-bind', 'html: shaderCacheText');
        generalSection.appendChild(shaderCacheDisplay);

        var globeDepth = document.createElement('div');
        generalSection.appendChild(globeDepth);
        var gCheckbox = document.createElement('input');
        gCheckbox.type = 'checkbox';
        gCheckbox.setAttribute('data-bind', 'checked: globeDepth, click: showGlobeDepth');
        globeDepth.appendChild(gCheckbox);
        globeDepth.appendChild(document.createTextNode('Show globe depth'));

        var globeDepthFrustum = document.createElement('div');
        globeDepth.appendChild(globeDepthFrustum);

        var pickDepth = document.createElement('div');
        generalSection.appendChild(pickDepth);
        var pCheckbox = document.createElement('input');
        pCheckbox.type = 'checkbox';
        pCheckbox.setAttribute('data-bind', 'checked: pickDepth, click: showPickDepth');
        pickDepth.appendChild(pCheckbox);
        pickDepth.appendChild(document.createTextNode('Show pick depth'));

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
        var prim = document.createElement('div');
        prim.className = 'cesium-cesiumInspector-sectionHeader';
        plus = document.createElement('span');
        plus.className = 'cesium-cesiumInspector-toggleSwitch';
        plus.setAttribute('data-bind', 'click: togglePrimitives, text: primitivesSwitchText');
        prim.appendChild(plus);
        prim.appendChild(document.createTextNode('Primitives'));
        panel.appendChild(prim);

        var primitivesSection = document.createElement('div');
        primitivesSection.className = 'cesium-cesiumInspector-section';
        primitivesSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : primitivesVisible, "cesium-cesiumInspector-hide" : !primitivesVisible}');
        panel.appendChild(primitivesSection);
        var pickPrimRequired = document.createElement('div');
        pickPrimRequired.className = 'cesium-cesiumInspector-pickSection';
        primitivesSection.appendChild(pickPrimRequired);

        var pickPrimitiveButton = document.createElement('input');
        pickPrimitiveButton.type = 'button';
        pickPrimitiveButton.value = 'Pick a primitive';
        pickPrimitiveButton.className = 'cesium-cesiumInspector-pickButton';
        pickPrimitiveButton.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-pickButtonHighlight" : pickPrimitiveActive}, click: pickPrimitive');
        var buttonWrap = document.createElement('div');
        buttonWrap.className = 'cesium-cesiumInspector-center';
        buttonWrap.appendChild(pickPrimitiveButton);
        pickPrimRequired.appendChild(buttonWrap);

        var debugSphere = document.createElement('div');
        pickPrimRequired.appendChild(debugSphere);
        var bsCheckbox = document.createElement('input');
        bsCheckbox.type = 'checkbox';
        bsCheckbox.setAttribute('data-bind', 'checked: primitiveBoundingSphere, click: showPrimitiveBoundingSphere, enable: hasPickedPrimitive');
        debugSphere.appendChild(bsCheckbox);
        debugSphere.appendChild(document.createTextNode('Show bounding sphere'));

        var refFrame = document.createElement('div');
        pickPrimRequired.appendChild(refFrame);
        var rfCheckbox = document.createElement('input');
        rfCheckbox.type = 'checkbox';
        rfCheckbox.setAttribute('data-bind', 'checked: primitiveReferenceFrame, click: showPrimitiveReferenceFrame, enable: hasPickedPrimitive');
        refFrame.appendChild(rfCheckbox);
        refFrame.appendChild(document.createTextNode('Show reference frame'));

        var primitiveOnly = document.createElement('div');
        this._primitiveOnly = primitiveOnly;
        pickPrimRequired.appendChild(primitiveOnly);
        var primitiveOnlyCheckbox = document.createElement('input');
        primitiveOnlyCheckbox.type = 'checkbox';
        primitiveOnlyCheckbox.setAttribute('data-bind', 'checked: filterPrimitive, click: doFilterPrimitive, enable: hasPickedPrimitive');
        primitiveOnly.appendChild(primitiveOnlyCheckbox);
        primitiveOnly.appendChild(document.createTextNode('Show only selected'));

        // Terrain
        var terrain = document.createElement('div');
        terrain.className = 'cesium-cesiumInspector-sectionHeader';
        plus = document.createElement('span');
        plus.className = 'cesium-cesiumInspector-toggleSwitch';
        plus.setAttribute('data-bind', 'click: toggleTerrain, text: terrainSwitchText');
        terrain.appendChild(plus);
        terrain.appendChild(document.createTextNode('Terrain'));
        panel.appendChild(terrain);

        var terrainSection = document.createElement('div');
        terrainSection.className = 'cesium-cesiumInspector-section';
        terrainSection.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : terrainVisible, "cesium-cesiumInspector-hide" : !terrainVisible}');
        panel.appendChild(terrainSection);
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
        tileInfo.className = 'cesium-cesiumInspector-frustumStats';
        tileInfo.appendChild(tileText);
        tileInfo.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : hasPickedTile, "cesium-cesiumInspector-hide" : !hasPickedTile}');
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

        var tileBoundingSphere = document.createElement('div');
        pickTileRequired.appendChild(tileBoundingSphere);
        var tbsCheck = document.createElement('input');
        tbsCheck.type = 'checkbox';
        tbsCheck.setAttribute('data-bind', 'checked: tileBoundingSphere, enable: hasPickedTile, click: showTileBoundingSphere');
        tileBoundingSphere.appendChild(tbsCheck);
        tileBoundingSphere.appendChild(document.createTextNode('Show bounding volume'));

        var renderTile = document.createElement('div');
        pickTileRequired.appendChild(renderTile);
        var rCheck = document.createElement('input');
        rCheck.type = 'checkbox';
        rCheck.setAttribute('data-bind', 'checked: filterTile, enable: hasPickedTile, click: doFilterTile');
        renderTile.appendChild(rCheck);
        renderTile.appendChild(document.createTextNode('Show only selected'));

        var wireframe = document.createElement('div');
        terrainSection.appendChild(wireframe);
        var wCheckbox = document.createElement('input');
        wCheckbox.type = 'checkbox';
        wCheckbox.setAttribute('data-bind', 'checked: wireframe, click: showWireframe');
        wireframe.appendChild(wCheckbox);
        wireframe.appendChild(document.createTextNode('Wireframe'));

        var suspendUpdates = document.createElement('div');
        terrainSection.appendChild(suspendUpdates);
        var upCheckbox = document.createElement('input');
        upCheckbox.type = 'checkbox';
        upCheckbox.setAttribute('data-bind', 'checked: suspendUpdates, click: doSuspendUpdates');
        suspendUpdates.appendChild(upCheckbox);
        suspendUpdates.appendChild(document.createTextNode('Suspend LOD update'));

        var tileCoords = document.createElement('div');
        terrainSection.appendChild(tileCoords);
        var coordCheck = document.createElement('input');
        coordCheck.type = 'checkbox';
        coordCheck.setAttribute('data-bind', 'checked: tileCoordinates, click: showTileCoordinates');
        tileCoords.appendChild(coordCheck);
        tileCoords.appendChild(document.createTextNode('Show tile coordinates'));

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
