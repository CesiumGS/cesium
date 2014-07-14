/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './NavigationHelpButtonViewModel'
    ], function(
        buildModuleUrl,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        NavigationHelpButtonViewModel) {
    "use strict";

    /**
     * <p>The NavigationHelpButton is a single button widget for displaying instructions for
     * navigating the globe with the mouse.</p><p style="clear: both;"></p><br/>
     *
     * @alias NavigationHelpButton
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Element|String} options.container The DOM element or ID that will contain the widget.
     * @param {Boolean} [options.instructionsInitiallyVisible=false] True if the navigation instructions should initially be visible; otherwise, false.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @example
     * // In HTML head, include a link to the NavigationHelpButton.css stylesheet,
     * // and in the body, include: <div id="navigationHelpButtonContainer"></div>
     *
     * var navigationHelpButton = new Cesium.NavigationHelpButton({
     *     container : 'navigationHelpButtonContainer'
     * });
     */
    var NavigationHelpButton = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.container)) {
            throw new DeveloperError('options.container is required.');
        }
        //>>includeEnd('debug');

        var container = getElement(options.container);

        var viewModel = new NavigationHelpButtonViewModel();

        var showInsructionsDefault = defaultValue(options.instructionsInitiallyVisible, false);
        viewModel.showInstructions = showInsructionsDefault;

        viewModel._svgPath = 'M16,1.466C7.973,1.466,1.466,7.973,1.466,16c0,8.027,6.507,14.534,14.534,14.534c8.027,0,14.534-6.507,14.534-14.534C30.534,7.973,24.027,1.466,16,1.466z M17.328,24.371h-2.707v-2.596h2.707V24.371zM17.328,19.003v0.858h-2.707v-1.057c0-3.19,3.63-3.696,3.63-5.963c0-1.034-0.924-1.826-2.134-1.826c-1.254,0-2.354,0.924-2.354,0.924l-1.541-1.915c0,0,1.519-1.584,4.137-1.584c2.487,0,4.796,1.54,4.796,4.136C21.156,16.208,17.328,16.627,17.328,19.003z';

        var wrapper = document.createElement('span');
        wrapper.className = 'cesium-navigationHelpButton-wrapper';
        container.appendChild(wrapper);

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'cesium-button cesium-toolbar-button cesium-navigation-help-button';
        button.setAttribute('data-bind', '\
attr: { title: tooltip },\
click: command,\
cesiumSvgPath: { path: _svgPath, width: 32, height: 32 }');
        wrapper.appendChild(button);

        var instructionContainer = document.createElement('div');
        instructionContainer.className = 'cesium-navigation-help';
        instructionContainer.setAttribute('data-bind', 'css: { "cesium-navigation-help-visible" : showInstructions}');
        wrapper.appendChild(instructionContainer);

        var mouseButton = document.createElement('button');
        mouseButton.className = 'cesium-navigation-button cesium-navigation-button-left';
        mouseButton.setAttribute('data-bind', 'click: showClick, css: {"cesium-navigation-button-selected": !_touch, "cesium-navigation-button-unselected": _touch}');
        var mouseIcon = document.createElement('img');
        mouseIcon.src = buildModuleUrl('Widgets/Images/NavigationHelp/Mouse.svg');
        mouseIcon.className = 'cesium-navigation-button-icon';
        mouseIcon.style.width = '25px';
        mouseIcon.style.height = '25px';
        mouseButton.appendChild(mouseIcon);
        mouseButton.appendChild(document.createTextNode('Mouse'));

        var touchButton = document.createElement('button');
        touchButton.className = 'cesium-navigation-button cesium-navigation-button-right';
        touchButton.setAttribute('data-bind', 'click: showTouch, css: {"cesium-navigation-button-selected": _touch, "cesium-navigation-button-unselected": !_touch}');
        var touchIcon = document.createElement('img');
        touchIcon.src = buildModuleUrl('Widgets/Images/NavigationHelp/Touch.svg');
        touchIcon.className = 'cesium-navigation-button-icon';
        touchIcon.style.width = '25px';
        touchIcon.style.height = '25px';
        touchButton.appendChild(touchIcon);
        touchButton.appendChild(document.createTextNode('Touch'));

        instructionContainer.appendChild(mouseButton);
        instructionContainer.appendChild(touchButton);


        var clickInstructions = document.createElement('div');
        clickInstructions.className = 'cesium-click-navigation-help cesium-navigation-help-instructions';
        clickInstructions.setAttribute('data-bind', 'css: { "cesium-click-navigation-help-visible" : !_touch}');
        clickInstructions.innerHTML = '\
            <table>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/MouseLeft.svg') + '" width="48" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-pan">Pan view</div>\
                        <div class="cesium-navigation-help-details">Left click + drag</div>\
                    </td>\
                </tr>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/MouseRight.svg') + '" width="48" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-zoom">Zoom view</div>\
                        <div class="cesium-navigation-help-details">Right click + drag, or</div>\
                        <div class="cesium-navigation-help-details">Mouse wheel scroll</div>\
                    </td>\
                </tr>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/MouseMiddle.svg') + '" width="48" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-rotate">Rotate view</div>\
                        <div class="cesium-navigation-help-details">Middle click + drag, or</div>\
                        <div class="cesium-navigation-help-details">CTRL + Left click + drag</div>\
                    </td>\
                </tr>\
            </table>';

        instructionContainer.appendChild(clickInstructions);

        var touchInstructions = document.createElement('div');
        touchInstructions.className = 'cesium-touch-navigation-help cesium-navigation-help-instructions';
        touchInstructions.setAttribute('data-bind', 'css: { "cesium-touch-navigation-help-visible" : _touch}');
        touchInstructions.innerHTML = '\
            <table>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/TouchDrag.svg') + '" width="70" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-pan">Pan view</div>\
                        <div class="cesium-navigation-help-details">One finger drag</div>\
                    </td>\
                </tr>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/TouchZoom.svg') + '" width="70" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-zoom">Zoom view</div>\
                        <div class="cesium-navigation-help-details">Two finger pinch</div>\
                    </td>\
                </tr>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/TouchTilt.svg') + '" width="70" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-rotate">Tilt view</div>\
                        <div class="cesium-navigation-help-details">Two finger drag, same direction</div>\
                    </td>\
                </tr>\
                <tr>\
                    <td><img src="' + buildModuleUrl('Widgets/Images/NavigationHelp/TouchRotate.svg') + '" width="70" height="48" /></td>\
                    <td>\
                        <div class="cesium-navigation-help-tilt">Rotate view</div>\
                        <div class="cesium-navigation-help-details">Two finger drag, opposite direction</div>\
                    </td>\
                </tr>\
            </table>';

        instructionContainer.appendChild(touchInstructions);

        knockout.applyBindings(viewModel, wrapper);

        this._container = container;
        this._viewModel = viewModel;
        this._wrapper = wrapper;

        this._closeInstructions = function(e) {
            if (!wrapper.contains(e.target)) {
                viewModel.showInstructions = false;
            }
        };

        document.addEventListener('mousedown', this._closeInstructions, true);
        document.addEventListener('touchstart', this._closeInstructions, true);
    };

    defineProperties(NavigationHelpButton.prototype, {
        /**
         * Gets the parent container.
         * @memberof NavigationHelpButton.prototype
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
         * @memberof NavigationHelpButton.prototype
         *
         * @type {NavigationHelpButtonViewModel}
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
    NavigationHelpButton.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    NavigationHelpButton.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeInstructions, true);
        document.removeEventListener('touchstart', this._closeInstructions, true);

        knockout.cleanNode(this._wrapper);
        this._container.removeChild(this._wrapper);

        return destroyObject(this);
    };

    return NavigationHelpButton;
});