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
        this.button = document.createElement('button');

        var widgetNode = this.button;
        widgetNode.className = 'sceneModeCommon';
        widgetNode.setAttribute('data-bind', 'text: selectedTooltip, css: { sceneMode2D: sceneMode() === _sceneMode.SCENE2D, sceneMode3D: sceneMode() === _sceneMode.SCENE3D, sceneModeColumbusView: sceneMode() === _sceneMode.COLUMBUS_VIEW, sceneModeMorphing: sceneMode() === _sceneMode.MORPHING}, attr: { title: selectedTooltip }, click: toggleDropdown');
        container.appendChild(widgetNode);

        var node3D = document.createElement('button');
        node3D.className = 'sceneModeCommon sceneMode3D';
        node3D.setAttribute('data-bind', 'text: tooltip3D, attr: { title: tooltip3D }, visible: dropDownVisible() && (sceneMode() !== _sceneMode.SCENE3D), click: morphTo3D');
        container.appendChild(node3D);
        this._node3D = node3D;

        var node2D = document.createElement('button');
        node2D.className = 'sceneModeCommon sceneMode2D';
        node2D.setAttribute('data-bind', 'text: tooltip2D, attr: { title: tooltip2D }, visible: dropDownVisible() && (sceneMode() !== _sceneMode.SCENE2D), click: morphTo2D');
        container.appendChild(node2D);
        this._node2D = node2D;

        var nodeColumbus = document.createElement('button');
        nodeColumbus.className = 'sceneModeCommon sceneModeColumbusView';
        nodeColumbus.setAttribute('data-bind', 'text: tooltipColumbusView, attr: { title: tooltipColumbusView }, visible: dropDownVisible() && (sceneMode() !== _sceneMode.COLUMBUS_VIEW), click: morphToColumbusView');
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