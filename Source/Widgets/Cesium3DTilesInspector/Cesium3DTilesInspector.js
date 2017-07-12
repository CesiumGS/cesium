define([
        '../../Core/Check',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout',
        '../getElement',
        './Cesium3DTilesInspectorViewModel'
    ], function(
        Check,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        knockout,
        getElement,
        Cesium3DTilesInspectorViewModel) {
    'use strict';

    /**
     * Inspector widget to aid in debugging 3D Tiles
     *
     * @alias Cesium3DTilesInspector
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene the Scene instance to use.
     */
    function Cesium3DTilesInspector(container, scene) {
        //>includeStart('debug', pragmas.debug);
        Check.defined('container', container);
        Check.typeOf.object('scene', scene);
        //>>includeEnd('debug');

        container = getElement(container);
        var element = document.createElement('div');
        var performanceContainer = document.createElement('div');
        performanceContainer.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : performance, "cesium-cesiumInspector-hide" : !performance}');
        var viewModel = new Cesium3DTilesInspectorViewModel(scene, performanceContainer);

        this._viewModel = viewModel;
        this._container = container;
        this._element = element;

        var text = document.createElement('div');
        text.textContent = '3D Tiles Inspector';
        text.className = 'cesium-cesiumInspector-button';
        text.setAttribute('data-bind', 'click: toggleInspector');
        element.appendChild(text);
        element.className = 'cesium-cesiumInspector cesium-3DTilesInspector';
        element.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible}');
        container.appendChild(element);

        var tilesetPanelContents = document.createElement('div');
        var displayPanelContents = document.createElement('div');
        var updatePanelContents = document.createElement('div');
        var loggingPanelContents = document.createElement('div');
        var tileDebugLabelsPanelContents = document.createElement('div');
        var stylePanelContents = document.createElement('div');
        var optimizationPanelContents = document.createElement('div');

        var properties = document.createElement('div');
        properties.className = 'field-group';
        var propertiesLabel = document.createElement('label');
        propertiesLabel.className = 'field-label';
        propertiesLabel.appendChild(document.createTextNode('Properties: '));
        var propertiesField = document.createElement('div');
        propertiesField.setAttribute('data-bind', 'text: properties');
        properties.appendChild(propertiesLabel);
        properties.appendChild(propertiesField);
        tilesetPanelContents.appendChild(properties);
        tilesetPanelContents.appendChild(makeButton('togglePickTileset', 'Pick Tileset', 'pickActive'));
        tilesetPanelContents.appendChild(makeButton('trimTilesCache', 'Trim Tiles Cache'));
        tilesetPanelContents.appendChild(makeCheckbox('picking', 'Enable Picking'));

        displayPanelContents.appendChild(makeCheckbox('colorize', 'Colorize'));
        displayPanelContents.appendChild(makeCheckbox('wireframe', 'Wireframe'));
        displayPanelContents.appendChild(makeCheckbox('showBoundingVolumes', 'Bounding Volumes'));
        displayPanelContents.appendChild(makeCheckbox('showContentBoundingVolumes', 'Content Volumes'));
        displayPanelContents.appendChild(makeCheckbox('showRequestVolumes', 'Request Volumes'));

        updatePanelContents.appendChild(makeCheckbox('freezeFrame', 'Freeze Frame'));
        updatePanelContents.appendChild(makeCheckbox('dynamicScreenSpaceError', 'Dynamic Screen Space Error'));
        var sseContainer = document.createElement('div');
        sseContainer.appendChild(makeRangeInput('maximumScreenSpaceError', 0, 128, 1, 'Maximum Screen Space Error'));
        updatePanelContents.appendChild(sseContainer);
        var dynamicScreenSpaceErrorContainer = document.createElement('div');
        dynamicScreenSpaceErrorContainer.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : dynamicScreenSpaceError, "cesium-cesiumInspector-hide" : !dynamicScreenSpaceError}');
        dynamicScreenSpaceErrorContainer.appendChild(makeRangeInput('dynamicScreenSpaceErrorDensitySliderValue', 0, 1, 0.005, 'Screen Space Error Density', 'dynamicScreenSpaceErrorDensity'));
        dynamicScreenSpaceErrorContainer.appendChild(makeRangeInput('dynamicScreenSpaceErrorFactor', 1, 10, 0.1, 'Screen Space Error Factor'));
        updatePanelContents.appendChild(dynamicScreenSpaceErrorContainer);

        loggingPanelContents.appendChild(makeCheckbox('performance', 'Performance'));
        loggingPanelContents.appendChild(performanceContainer);
        loggingPanelContents.appendChild(makeCheckbox('showStatistics', 'Statistics'));
        var statistics = document.createElement('div');
        statistics.className = 'cesium-3dTilesInspector-statistics';
        statistics.setAttribute('data-bind', 'html: statisticsText, visible: showStatistics');
        loggingPanelContents.appendChild(statistics);
        loggingPanelContents.appendChild(makeCheckbox('showPickStatistics', 'Pick Statistics'));
        var pickStatistics = document.createElement('div');
        pickStatistics.className = 'cesium-3dTilesInspector-statistics';
        pickStatistics.setAttribute('data-bind', 'html: pickStatisticsText, visible: showPickStatistics');
        loggingPanelContents.appendChild(pickStatistics);

        stylePanelContents.appendChild(document.createTextNode('Color Blend Mode: '));
        var blendDropdown = document.createElement('select');
        blendDropdown.setAttribute('data-bind', 'options: colorBlendModes, ' +
                                                'optionsText: "text", ' +
                                                'optionsValue: "value", ' +
                                                'value: colorBlendMode');
        stylePanelContents.appendChild(blendDropdown);
        var styleEditor = document.createElement('textarea');
        styleEditor.setAttribute('data-bind', 'textInput: styleString, event: { keydown: styleEditorKeyPress }');
        stylePanelContents.className = 'cesium-cesiumInspector-styleEditor';
        stylePanelContents.appendChild(styleEditor);
        var closeStylesBtn = makeButton('compileStyle', 'Compile (Ctrl+Enter)');
        stylePanelContents.appendChild(closeStylesBtn);
        var errorBox = document.createElement('div');
        errorBox.className = 'cesium-cesiumInspector-error';
        errorBox.setAttribute('data-bind', 'text: editorError');
        stylePanelContents.appendChild(errorBox);

        tileDebugLabelsPanelContents.appendChild(makeCheckbox('showOnlyPickedTileDebugLabel', 'Show Picked Only'));
        tileDebugLabelsPanelContents.appendChild(makeCheckbox('showGeometricError', 'Geometric Error'));
        tileDebugLabelsPanelContents.appendChild(makeCheckbox('showRenderingStatistics', 'Rendering Statistics'));
        tileDebugLabelsPanelContents.appendChild(makeCheckbox('showMemoryUsage', 'Memory Usage (MB)'));
        tileDebugLabelsPanelContents.appendChild(makeCheckbox('showUrl', 'Url'));

        optimizationPanelContents.appendChild(makeCheckbox('skipLevelOfDetail', 'Skip Tile LODs'));
        var skipScreenSpaceErrorFactorContainer = document.createElement('div');
        skipScreenSpaceErrorFactorContainer.appendChild(makeRangeInput('skipScreenSpaceErrorFactor', 1, 50, 1, 'Skip SSE Factor'));
        optimizationPanelContents.appendChild(skipScreenSpaceErrorFactorContainer);
        var baseScreenSpaceError = document.createElement('div');
        baseScreenSpaceError.appendChild(makeRangeInput('baseScreenSpaceError', 0, 4096, 1, 'SSE before skipping LOD'));
        optimizationPanelContents.appendChild(baseScreenSpaceError);
        var skipLevelsContainer = document.createElement('div');
        skipLevelsContainer.appendChild(makeRangeInput('skipLevels', 0, 10, 1, 'Min. levels to skip'));
        optimizationPanelContents.appendChild(skipLevelsContainer);
        optimizationPanelContents.appendChild(makeCheckbox('immediatelyLoadDesiredLevelOfDetail', 'Load only tiles that meet the max. SSE.'));
        optimizationPanelContents.appendChild(makeCheckbox('loadSiblings', 'Load siblings of visible tiles.'));

        var tilesetPanel = makeSection('Tileset', 'tilesetVisible', 'toggleTileset', tilesetPanelContents);
        var displayPanel = makeSection('Display', 'displayVisible', 'toggleDisplay', displayPanelContents);
        var updatePanel = makeSection('Update', 'updateVisible', 'toggleUpdate', updatePanelContents);
        var loggingPanel = makeSection('Logging', 'loggingVisible', 'toggleLogging', loggingPanelContents);
        var tileDebugLabelsPanel = makeSection('Tile Debug Labels', 'tileDebugLabelsVisible', 'toggleTileDebugLabels', tileDebugLabelsPanelContents);
        var stylePanel = makeSection('Style', 'styleVisible', 'toggleStyle', stylePanelContents);
        var optimizationPanel = makeSection('Optimization', 'optimizationVisible', 'toggleOptimization', optimizationPanelContents);

        // first add and bind all the toggleable panels
        element.appendChild(tilesetPanel);
        element.appendChild(displayPanel);
        element.appendChild(updatePanel);
        element.appendChild(loggingPanel);
        element.appendChild(tileDebugLabelsPanel);
        element.appendChild(stylePanel);
        element.appendChild(optimizationPanel);

        knockout.applyBindings(viewModel, element);
    }

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

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Cesium3DTilesInspector.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    Cesium3DTilesInspector.prototype.destroy = function() {
        knockout.cleanNode(this._element);
        this._container.removeChild(this._element);
        this.viewModel.destroy();

        return destroyObject(this);
    };

    function makeSection(name, visibleProp, toggleProp, contents) {
        var toggle = document.createElement('span');
        toggle.className = 'cesium-cesiumInspector-toggleSwitch';
        toggle.setAttribute('data-bind', 'text: ' + visibleProp + ' ? "-" : "+", click: ' + toggleProp);

        var header = document.createElement('div');
        header.className = 'cesium-cesiumInspector-sectionHeader';
        header.appendChild(toggle);
        header.appendChild(document.createTextNode(name));

        var section = document.createElement('div');
        section.className = 'cesium-cesiumInspector-section';
        section.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : ' + visibleProp + ', "cesium-cesiumInspector-hide" : !' + visibleProp + '}');
        section.appendChild(contents);

        var panel = document.createElement('div');
        panel.className = 'cesium-cesiumInspector-dropDown';
        panel.appendChild(header);
        panel.appendChild(section);

        return panel;
    }

    function makeCheckbox(property, text) {
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('data-bind', 'checked: ' + property);

        var container = document.createElement('div');
        container.appendChild(checkbox);
        container.appendChild(document.createTextNode(text));

        return container;
    }

    function makeRangeInput(property, min, max, step, text, displayProperty) {
        displayProperty = defaultValue(displayProperty, property);
        var input = document.createElement('input');
        input.setAttribute('data-bind', 'value: ' + displayProperty);
        input.type = 'number';

        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.setAttribute('data-bind', 'valueUpdate: "input", value: ' + property);

        var wrapper = document.createElement('div');
        wrapper.appendChild(slider);

        var container = document.createElement('div');
        container.className = 'cesium-cesiumInspector-slider';
        container.appendChild(document.createTextNode(text));
        container.appendChild(input);
        container.appendChild(wrapper);

        return container;
    }

    function makeButton(action, text, active) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.className = 'cesium-cesiumInspector-pickButton';
        var binding = 'click: ' + action;
        if (defined(active)) {
            binding += ', css: {"cesium-cesiumInspector-pickButtonHighlight" : ' + active + '}';
        }
        button.setAttribute('data-bind', binding);

        return button;
    }

    return Cesium3DTilesInspector;
});
