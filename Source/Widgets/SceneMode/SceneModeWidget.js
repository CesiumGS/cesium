/*global define*/
define(['./SceneModeViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            SceneModeViewModel,
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";
    /*jshint multistr:true */

    /**
     * A single button widget for switching scene modes.
     *
     * @alias SceneModeWidget
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
    var SceneModeWidget = function(container, transitioner) {
        if (container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (transitioner === 'undefined') {
            throw new DeveloperError('transitioner is required.');
        }

        var viewModel = new SceneModeViewModel(transitioner);

        /**
         * Gets the viewModel being used by the widget.
         * @memberof SceneModeWidget
         * @type {SeneModeViewModel}
         */
        this.viewModel = viewModel;

        /**
         * Gets the container element for the widget.
         * @memberof SceneModeWidget
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
        widgetNode.className = 'cesium-sceneMode-button';
        widgetNode.setAttribute('data-bind', '\
                                 css: { "cesium-sceneMode-button2D": sceneMode() === _sceneMode.SCENE2D,\
                                        "cesium-sceneMode-button3D": sceneMode() === _sceneMode.SCENE3D,\
                                        "cesium-sceneMode-buttonColumbusView": sceneMode() === _sceneMode.COLUMBUS_VIEW},\
                                 attr: { title: selectedTooltip }, click: toggleDropdown');
        container.appendChild(widgetNode);

        var node3D = document.createElement('span');
        node3D.className = 'cesium-sceneMode-button cesium-sceneMode-button3D';
        node3D.setAttribute('data-bind', '\
                             css: { "cesium-sceneMode-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.SCENE3D)) || (!dropDownVisible() && (sceneMode() === _sceneMode.SCENE3D)),\
                                    "cesium-sceneMode-none" : sceneMode() === _sceneMode.SCENE3D,\
                                    "cesium-sceneMode-hidden" : !dropDownVisible()},\
                             attr: { title: tooltip3D },\
                             click: morphTo3D');
        container.appendChild(node3D);
        this._node3D = node3D;

        var node2D = document.createElement('span');
        node2D.className = 'cesium-sceneMode-button cesium-sceneMode-button2D';
        node2D.setAttribute('data-bind', '\
                             css: { "cesium-sceneMode-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.SCENE2D)),\
                                    "cesium-sceneMode-none" : sceneMode() === _sceneMode.SCENE2D,\
                                    "cesium-sceneMode-hidden" : !dropDownVisible()},\
                             attr: { title: tooltip2D },\
                             click: morphTo2D');
        container.appendChild(node2D);
        this._node2D = node2D;

        var nodeColumbus = document.createElement('span');
        nodeColumbus.className = 'cesium-sceneMode-button cesium-sceneMode-buttonColumbusView';
        nodeColumbus.setAttribute('data-bind', '\
                                   css: { "cesium-sceneMode-visible" : (dropDownVisible() && (sceneMode() !== _sceneMode.COLUMBUS_VIEW)) || (!dropDownVisible() && (sceneMode() === _sceneMode.COLUMBUS_VIEW)),\
                                          "cesium-sceneMode-none" : sceneMode() === _sceneMode.COLUMBUS_VIEW,\
                                          "cesium-sceneMode-hidden" : !dropDownVisible()},\
                                   attr: { title: tooltipColumbusView },\
                                   click: morphToColumbusView');

        container.appendChild(nodeColumbus);
        this._nodeColumbus = nodeColumbus;

        knockout.applyBindings(viewModel, container);

        this._closeDropdown = function(e) {
            if (!container.contains(e.target)) {
                viewModel.dropDownVisible(false);
            }
        };

        document.addEventListener('mousedown', this._closeDropdown);
        document.addEventListener('touchstart', this._closeDropdown);
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof SceneModeWidget
     */
    SceneModeWidget.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropdown);
        document.removeEventListener('touchstart', this._closeDropdown);
        var container = this.container;
        knockout.cleanNode(container);
        container.removeChild(this.button);
        container.removeChild(this._node3D);
        container.removeChild(this._node2D);
        container.removeChild(this._nodeColumbus);
        return destroyObject(this);
    };

    return SceneModeWidget;
});