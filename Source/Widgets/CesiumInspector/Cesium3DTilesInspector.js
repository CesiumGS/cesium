/*global define*/
define([
        '../../Core/Check',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout',
        '../getElement',
        '../CesiumInspector/Cesium3DTilesInspectorViewModel'
    ], function(
        Check,
        defined,
        defineProperties,
        destroyObject,
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
     */
    function Cesium3DTilesInspector(container, scene) {
        //>includeStart('debug', pragmas.debug);
        Check.defined('container', container);
        Check.typeOf.object('scene', scene);
        //>>includeEnd('debug');

        container = getElement(container);
        var that = this;
        var viewModel = new Cesium3DTilesInspectorViewModel(scene);
        this._viewModel = viewModel;
        this._container = container;

        this._inspectorModel = {
            inspectorVisible: true,
            tilesetVisible: false,
            displayVisible: false,
            updateVisible: false,
            loggingVisible: false,
            styleVisible: false,
            toggleInspector: function() {
                that._inspectorModel.inspectorVisible = !that._inspectorModel.inspectorVisible;
            },
            toggleTileset: function() {
                that._inspectorModel.tilesetVisible = !that._inspectorModel.tilesetVisible;
            },
            toggleDisplay: function() {
                that._inspectorModel.displayVisible = !that._inspectorModel.displayVisible;
            },
            toggleUpdate: function() {
                that._inspectorModel.updateVisible = !that._inspectorModel.updateVisible;
            },
            toggleLogging: function() {
                that._inspectorModel.loggingVisible = !that._inspectorModel.loggingVisible;
            },
            toggleStyle: function() {
                that._inspectorModel.styleVisible = !that._inspectorModel.styleVisible;
            }
        };

        knockout.track(this._inspectorModel, ['inspectorVisible', 'tilesetVisible', 'displayVisible', 'updateVisible', 'loggingVisible', 'styleVisible']);

        var element = document.createElement('div');
        this._element = element;
        var text = document.createElement('div');
        text.textContent = '3D Tiles Inspector';
        text.className = 'cesium-cesiumInspector-button';
        text.setAttribute('data-bind', 'click: toggleInspector');
        element.appendChild(text);
        element.className = 'cesium-cesiumInspector cesium-3DTilesInspector';
        element.setAttribute('data-bind', 'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible }');
        container.appendChild(this._element);

        var tilesetPanel = makeSection('Tileset', 'tilesetVisible', 'toggleTileset');
        var displayPanel = makeSection('Display', 'displayVisible', 'toggleDisplay');
        var updatePanel = makeSection('Update', 'updateVisible', 'toggleUpdate');
        var loggingPanel = makeSection('Logging', 'loggingVisible', 'toggleLogging');
        var stylePanel = makeSection('Style', 'styleVisible', 'toggleStyle');

        // first add and bind all the toggleable panels
        element.appendChild(tilesetPanel);
        element.appendChild(displayPanel);
        element.appendChild(updatePanel);
        element.appendChild(loggingPanel);
        element.appendChild(stylePanel);
        knockout.applyBindings(this._inspectorModel, element);

        // build and bind each panel separately
        var properties = document.createElement('div');
        properties.className = 'field-group';
        var propertiesLabel = document.createElement('label');
        propertiesLabel.className = 'field-label';
        propertiesLabel.appendChild(document.createTextNode('Properties: '));
        var propertiesField = document.createElement('div');
        propertiesField.setAttribute('data-bind', 'text: propertiesText');
        properties.appendChild(propertiesLabel);
        properties.appendChild(propertiesField);
        tilesetPanel.contents.appendChild(properties);
        tilesetPanel.contents.appendChild(makeButton('_togglePickTileset', 'Pick Tileset', '_pickActive'));
        tilesetPanel.contents.appendChild(makeButton('trimTilesCache', 'Trim Tiles Cache'));
        tilesetPanel.contents.appendChild(makeCheckbox('picking', 'Enable Picking'));
        knockout.applyBindings(viewModel, tilesetPanel.contents);

        displayPanel.contents.appendChild(makeCheckbox('colorize', 'Colorize'));
        displayPanel.contents.appendChild(makeCheckbox('wireframe', 'Wireframe'));
        displayPanel.contents.appendChild(makeCheckbox('showBoundingVolumes', 'Bounding Volumes'));
        displayPanel.contents.appendChild(makeCheckbox('showContentBoundingVolumes', 'Content Volumes'));
        displayPanel.contents.appendChild(makeCheckbox('showRequestVolumes', 'Request Volumes'));
        displayPanel.contents.appendChild(makeCheckbox('showGeometricError', 'Geometric Error'));
        knockout.applyBindings(viewModel, displayPanel.contents);

        updatePanel.contents.appendChild(makeCheckbox('freezeFrame', 'Freeze Frame'));
        updatePanel.contents.appendChild(makeCheckbox('dynamicSSE', 'Dynamic SSE'));
        var sseContainer = document.createElement('div');
        sseContainer.appendChild(makeRangeInput('maximumSSE', 0, 128, 1, 'Maximum SSE'));
        updatePanel.contents.appendChild(sseContainer);

        var dynamicSSEContainer = document.createElement('div');
        dynamicSSEContainer.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : dynamicSSE, "cesium-cesiumInspector-hide" : !dynamicSSE}');
        dynamicSSEContainer.appendChild(makeExponentialRangeInput(viewModel, 'dynamicSSEDensity', 0, 1, 200, 6, 'SSE Density'));
        dynamicSSEContainer.appendChild(makeRangeInput('dynamicSSEFactor', 1, 10, 0.1, 'SSE Factor'));
        updatePanel.contents.appendChild(dynamicSSEContainer);
        knockout.applyBindings(viewModel, updatePanel.contents);

        loggingPanel.contents.appendChild(makeCheckbox('performance', 'Performance'));
        loggingPanel.contents.appendChild(this._viewModel._performanceDisplay._container);
        this._viewModel._performanceDisplay._container.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : performance, "cesium-cesiumInspector-hide" : !performance}');
        loggingPanel.contents.appendChild(makeCheckbox('showStats', 'Stats'));
        var stats = document.createElement('div');
        stats.setAttribute('data-bind', 'html: statsText, css: {"cesium-cesiumInspector-show" : showStats, "cesium-cesiumInspector-hide" : !showStats}');
        stats.setAttribute('style', 'font-size: 11px');
        loggingPanel.contents.appendChild(stats);
        loggingPanel.contents.appendChild(makeCheckbox('showPickStats', 'Pick Stats'));
        var pickStats = document.createElement('div');
        pickStats.setAttribute('data-bind', 'html: pickStatsText, css: {"cesium-cesiumInspector-show" : showPickStats, "cesium-cesiumInspector-hide" : !showPickStats}');
        pickStats.setAttribute('style', 'font-size: 11px');
        loggingPanel.contents.appendChild(pickStats);
        knockout.applyBindings(viewModel, loggingPanel.contents);

        stylePanel.contents.appendChild(document.createTextNode('Color Blend Mode: '));
        var blendDropdown = document.createElement('select');
        blendDropdown.setAttribute('data-bind', 'options: _colorBlendModes, ' +
                                           'optionsText: "text", ' +
                                           'optionsValue: "val", ' +
                                           'value: colorBlendMode');
        stylePanel.contents.appendChild(blendDropdown);

        var styleEditor = document.createElement('textarea');
        styleEditor.setAttribute('wrap', 'soft');
        styleEditor.setAttribute('data-bind', 'valueUpdate: "keyup", value: _styleString, event: { keypress: _checkCompile }');
        stylePanel.contents.className = 'cesium-cesiumInspector-styleEditor';
        stylePanel.contents.appendChild(styleEditor);
        var closeStylesBtn = makeButton('_compileStyle', 'Compile (Ctrl+Enter)');
        stylePanel.contents.appendChild(closeStylesBtn);
        var errorBox = document.createElement('div');
        errorBox.className = 'cesium-cesiumInspector-error';
        errorBox.setAttribute('data-bind', 'text: _editorError');
        stylePanel.contents.appendChild(errorBox);
        knockout.applyBindings(viewModel, stylePanel.contents);

        styleEditor.addEventListener('keydown', function(e) {
            if (e.keyCode === 9) {
                e.preventDefault();
                var start = this.selectionStart;
                var end = this.selectionEnd;
                var newEnd = end;
                var selected = this.value.slice(start, end);
                var lines = selected.split('\n');
                var length = lines.length;
                var i;
                if (!e.shiftKey) {
                    for(i = 0; i < length; ++i) {
                        lines[i] = '  ' + lines[i];
                        newEnd += 2;
                    }
                } else {
                    for(i = 0; i < length; ++i) {
                        if (lines[i][0] === ' ') {
                            if (lines[i][1] === ' ') {
                                lines[i] = lines[i].substr(2);
                                newEnd -= 2;
                            } else {
                                lines[i] = lines[i].substr(1);
                                newEnd -= 1;
                            }
                        }
                    }
                }
                var newText = lines.join('\n');
                this.value = this.value.slice(0, start) + newText + this.value.slice(end);
                this.selectionStart = start !== end ? start : newEnd;
                this.selectionEnd = newEnd;
            }
        });
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

    function makeSection(name, visibleProp, toggleProp) {
        var panel = document.createElement('div');
        panel.className = 'cesium-cesiumInspector-dropDown';

        var header = document.createElement('div');
        header.className = 'cesium-cesiumInspector-sectionHeader';
        var toggle = document.createElement('span');
        toggle.className = 'cesium-cesiumInspector-toggleSwitch';

        var bindings = [];
        if (defined(toggleProp)) {
            if (defined(visibleProp)) {
                bindings.push('text: ' + visibleProp + ' ? "-" : "+"');
            }
            bindings.push('click: ' + toggleProp);
        }

        toggle.setAttribute('data-bind', bindings.join(', '));
        header.appendChild(toggle);
        header.appendChild(document.createTextNode(name));

        var section = document.createElement('div');
        section.className = 'cesium-cesiumInspector-section';
        if (defined(visibleProp)) {
            section.setAttribute('data-bind', 'css: {"cesium-cesiumInspector-show" : ' + visibleProp + ', "cesium-cesiumInspector-hide" : !' + visibleProp + '}');
        }

        panel.appendChild(header);
        panel.appendChild(section);

        var contents = document.createElement('div');
        section.appendChild(contents);
        panel.contents = contents;
        return panel;
    }

    function makeCheckbox(property, text, enable) {
        var container = document.createElement('div');
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        var binding = 'checked: ' + property;
        if (defined(enable)) {
            binding += ', enable: ' + enable;
        }
        checkbox.setAttribute('data-bind', binding);
        container.appendChild(checkbox);
        container.appendChild(document.createTextNode(text));
        return container;
    }

    function makeRangeInput(property, min, max, step, text) {
        var container = document.createElement('div');
        container.className = 'cesium-cesiumInspector-slider';
        var input = document.createElement('input');
        input.setAttribute('data-bind', 'value: ' + property);
        input.type = 'number';

        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.setAttribute('data-bind', 'valueUpdate: "input", value: ' + property);

        container.appendChild(document.createTextNode(text));
        container.appendChild(input);
        var wrapper = document.createElement('div');

        wrapper.appendChild(slider);
        container.appendChild(wrapper);

        return container;
    }

    function makeExponentialRangeInput(viewModel, property, min, max, steps, exponent, text) {
        var container = document.createElement('div');
        container.className = 'cesium-cesiumInspector-slider';
        var input = document.createElement('input');
        input.setAttribute('data-bind', 'value: ' + property);
        input.type = 'number';

        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = (max - min) / steps;
        slider.setAttribute('data-bind', 'value: (Math.pow(' + property + ', 1 / ' + exponent + '))');

        slider.oninput = function() {
            viewModel[property] = Math.pow(this.value, exponent);
        };

        container.appendChild(document.createTextNode(text));
        container.appendChild(input);
        var wrapper = document.createElement('div');

        wrapper.appendChild(slider);
        container.appendChild(wrapper);

        return container;
    }

    function makeButton(action, text, active) {
        var button = document.createElement('input');
        button.type = 'button';
        button.value = text;
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
