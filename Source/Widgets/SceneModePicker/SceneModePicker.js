/*global define*/
define(['./SceneModePickerViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            SceneModePickerViewModel,
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";

    /**
     * <img src="images/SceneModePicker.png" style="float: left; margin: 3px; border: none; border-radius: 5px;" />
     * <p>The SceneModePicker is a single button widget for switching between scene modes;
     * shown to the left in its expanded state. Programatic switching of scene modes will
     * be automatically reflected in the widget as long as the specified SceneTransitioner
     * is used to perform the change.</p><p style="clear: both;"></p><br/>
     *
     * @alias SceneModePicker
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     * @exception {DeveloperError} transitioner is required.
     *
     * @see SceneTransitioner
     *
     * @example
     * // In HTML head, include a link to the SceneModePicker.css stylesheet,
     * // and in the body, include: &lt;div id="sceneModePickerContainer"&gt;&lt;/div&gt;
     * // Note: This code assumed you already have a Scene instance.
     *
     * var transitioner = new SceneTransitioner(scene);
     * var sceneModePicker = new SceneModePicker('sceneModePickerContainer', transitioner);
     */
    var SceneModePicker = function(container, transitioner) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

        if (typeof transitioner === 'undefined') {
            throw new DeveloperError('transitioner is required.');
        }

        var viewModel = new SceneModePickerViewModel(transitioner);

        /**
         * Gets the viewModel being used by the widget.
         * @memberof SceneModePicker
         * @type {SeneModePickerViewModel}
         */
        this.viewModel = viewModel;

        /**
         * Gets the container element for the widget.
         * @memberof SceneModePicker
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the element created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.element = document.createElement('span');

        var widgetNode = this.element;
        widgetNode.className = 'cesium-sceneModePicker-button';
        widgetNode.setAttribute('data-bind', '\
                                 css: { "cesium-sceneModePicker-button2D": sceneMode() === _sceneMode.SCENE2D,\
                                        "cesium-sceneModePicker-button3D": sceneMode() === _sceneMode.SCENE3D,\
                                        "cesium-sceneModePicker-buttonColumbusView": sceneMode() === _sceneMode.COLUMBUS_VIEW,\
                                        "cesium-sceneModePicker-selected": dropDownVisible},\
                                 attr: { title: selectedTooltip }, click: toggleDropDown');
        container.appendChild(widgetNode);

        var node3D = document.createElement('span');
        node3D.className = 'cesium-sceneModePicker-button cesium-sceneModePicker-button3D';
        node3D.setAttribute('data-bind', '\
                             css: { "cesium-sceneModePicker-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.SCENE3D)) || (!dropDownVisible() && (sceneMode() === _sceneMode.SCENE3D)),\
                                    "cesium-sceneModePicker-none" : sceneMode() === _sceneMode.SCENE3D,\
                                    "cesium-sceneModePicker-hidden" : !dropDownVisible()},\
                             attr: { title: tooltip3D },\
                             click: morphTo3D');
        container.appendChild(node3D);
        this._node3D = node3D;

        var node2D = document.createElement('span');
        node2D.className = 'cesium-sceneModePicker-button cesium-sceneModePicker-button2D';
        node2D.setAttribute('data-bind', '\
                             css: { "cesium-sceneModePicker-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.SCENE2D)),\
                                    "cesium-sceneModePicker-none" : sceneMode() === _sceneMode.SCENE2D,\
                                    "cesium-sceneModePicker-hidden" : !dropDownVisible()},\
                             attr: { title: tooltip2D },\
                             click: morphTo2D');
        container.appendChild(node2D);
        this._node2D = node2D;

        var nodeColumbus = document.createElement('span');
        nodeColumbus.className = 'cesium-sceneModePicker-button cesium-sceneModePicker-buttonColumbusView';
        nodeColumbus.setAttribute('data-bind', '\
                                   css: { "cesium-sceneModePicker-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.COLUMBUS_VIEW)) || (!dropDownVisible() && (sceneMode() === _sceneMode.COLUMBUS_VIEW)),\
                                          "cesium-sceneModePicker-none" : sceneMode() === _sceneMode.COLUMBUS_VIEW,\
                                          "cesium-sceneModePicker-hidden" : !dropDownVisible()},\
                                   attr: { title: tooltipColumbusView },\
                                   click: morphToColumbusView');

        container.appendChild(nodeColumbus);
        this._nodeColumbus = nodeColumbus;

        knockout.applyBindings(viewModel, container);

        this._closeDropDown = function(e) {
            if (!container.contains(e.target)) {
                viewModel.dropDownVisible(false);
            }
        };

        document.addEventListener('mousedown', this._closeDropDown);
        document.addEventListener('touchstart', this._closeDropDown);
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof SceneModePicker
     */
    SceneModePicker.prototype.destroy = function() {
        this.viewModel.destroy();
        document.removeEventListener('mousedown', this._closeDropDown);
        document.removeEventListener('touchstart', this._closeDropDown);
        var container = this.container;
        knockout.cleanNode(container);
        container.removeChild(this.element);
        container.removeChild(this._node3D);
        container.removeChild(this._node2D);
        container.removeChild(this._nodeColumbus);
        return destroyObject(this);
    };

    return SceneModePicker;
});