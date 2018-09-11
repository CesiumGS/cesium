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

        function createCheckBox(checkboxBinding, labelText) {
            var checkboxContainer = document.createElement('div');
            var checkboxLabel = document.createElement('label');
            var checkboxInput = document.createElement('input');
            checkboxInput.type = 'checkbox';
            checkboxInput.setAttribute('data-bind', checkboxBinding);
            checkboxLabel.appendChild(checkboxInput);
            checkboxLabel.appendChild(document.createTextNode(labelText));
            checkboxContainer.appendChild(checkboxLabel);
            return checkboxContainer;
        }

        function addSection(panel, headerText, sectionVisibleDataBinding, sectionVisibilityToogleClickEvent) {
            var section = document.createElement('div');
            section.className = 'cesium-cesiumInspector-section';
            section.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-section-collapsed": !' + sectionVisibleDataBinding + ' }');
            panel.appendChild(section);

            var sectionHeader = document.createElement('h3');
            sectionHeader.className = 'cesium-cesiumInspector-sectionHeader';
            sectionHeader.appendChild(document.createTextNode(headerText));
            sectionHeader.setAttribute('data-bind', 'click: ' + sectionVisibilityToogleClickEvent);
            section.appendChild(sectionHeader);

            var sectionContent = document.createElement('div');
            sectionContent.className = 'cesium-cesiumInspector-sectionContent';
            section.appendChild(sectionContent);
            return sectionContent;
        }

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
        var generalSection = addSection(panel, 'General', 'generalVisible', 'toggleGeneral');

        var debugShowFrustums = createCheckBox('checked: frustums', 'Show Frustums');
        var frustumStatistics = document.createElement('div');
        frustumStatistics.className = 'cesium-cesiumInspector-frustumStatistics';
        frustumStatistics.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : frustums, "cesium-cesiumInspector-hide" :  !frustums}, html: frustumStatisticText');
        debugShowFrustums.appendChild(frustumStatistics);
        generalSection.appendChild(debugShowFrustums);

        generalSection.appendChild(createCheckBox('checked: frustumPlanes', 'Show Frustum Planes'));
        generalSection.appendChild(createCheckBox('checked: performance', 'Performance Display'));

        performanceContainer.className = 'cesium-cesiumInspector-performanceDisplay';
        generalSection.appendChild(performanceContainer);

        var shaderCacheDisplay = document.createElement('div');
        shaderCacheDisplay.className = 'cesium-cesiumInspector-shaderCache';
        shaderCacheDisplay.setAttribute('data-bind', 'html: shaderCacheText');
        generalSection.appendChild(shaderCacheDisplay);

        // https://github.com/AnalyticalGraphicsInc/cesium/issues/6763
        // var globeDepth = createCheckBox('checked: globeDepth', 'Show globe depth');
        // generalSection.appendChild(globeDepth);
        //
        // var globeDepthFrustum = document.createElement('div');
        // globeDepth.appendChild(globeDepthFrustum);
        //
        // generalSection.appendChild(createCheckBox('checked: pickDepth', 'Show pick depth'));

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
        var primSection = addSection(panel, 'Primitives', 'primitivesVisible', 'togglePrimitives');
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

        pickPrimRequired.appendChild(createCheckBox('checked: primitiveBoundingSphere, enable: hasPickedPrimitive', 'Show bounding sphere'));
        pickPrimRequired.appendChild(createCheckBox('checked: primitiveReferenceFrame, enable: hasPickedPrimitive', 'Show reference frame'));

        this._primitiveOnly = createCheckBox('checked: filterPrimitive, enable: hasPickedPrimitive', 'Show only selected');
        pickPrimRequired.appendChild(this._primitiveOnly);

        // Terrain
        var terrainSection = addSection(panel, 'Terrain', 'terrainVisible', 'toggleTerrain');
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
        tileInfo.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : hasPickedTile, "cesium-cesiumInspector-hide" :  !hasPickedTile}');
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

        pickTileRequired.appendChild(createCheckBox('checked: tileBoundingSphere, enable: hasPickedTile', 'Show bounding volume'));
        pickTileRequired.appendChild(createCheckBox('checked: filterTile, enable: hasPickedTile', 'Show only selected'));

        terrainSection.appendChild(createCheckBox('checked: wireframe', 'Wireframe'));
        terrainSection.appendChild(createCheckBox('checked: suspendUpdates', 'Suspend LOD update'));
        terrainSection.appendChild(createCheckBox('checked: tileCoordinates', 'Show tile coordinates'));

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
