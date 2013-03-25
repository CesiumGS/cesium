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
    /*jshint multistr:true */

    /**
     * A single button widget for switching scene modes.
     *
     * @alias SceneModePicker
     * @constructor
     *
     * @param {Element} container The parent HTML container node for this widget.
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} transitioner is required.
     *
     * @see SceneTransitioner
     */
    var SceneModePicker = function(container, transitioner) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
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
         * Gets the actual button created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.button = document.createElement('span');

        var widgetNode = this.button;
        widgetNode.className = 'cesium-sceneModePicker-button';
        widgetNode.setAttribute('data-bind', '\
                                 css: { "cesium-sceneModePicker-button2D": sceneMode() === _sceneMode.SCENE2D,\
                                        "cesium-sceneModePicker-button3D": sceneMode() === _sceneMode.SCENE3D,\
                                        "cesium-sceneModePicker-buttonColumbusView": sceneMode() === _sceneMode.COLUMBUS_VIEW},\
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
        container.removeChild(this.button);
        container.removeChild(this._node3D);
        container.removeChild(this._node2D);
        container.removeChild(this._nodeColumbus);
        return destroyObject(this);
    };

    return SceneModePicker;
});