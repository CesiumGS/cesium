/*global define*/
define(['./ImageryViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            ImageryViewModel,
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";
    /*jshint multistr:true */

    /**
     * A single button widget for switching scene modes.
     *
     * @alias ImageryWidget
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
    var ImageryWidget = function(container, imageLayers) {
        if (container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        var viewModel = new ImageryViewModel(imageLayers);

        /**
         * Gets the viewModel being used by the widget.
         * @memberof ImageryWidget
         * @type {SeneModeViewModel}
         */
        this.viewModel = viewModel;

        /**
         * Gets the container element for the widget.
         * @memberof ImageryWidget
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the actual button created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.button = document.createElement('img');

        var widgetNode = this.button;
        widgetNode.className = 'cesium-imagery-selected';
        widgetNode.setAttribute('data-bind', '\
                attr: {title: selected() ? selected().name : "", src: selected() ? selected().image : ""},\
                click: toggleDropdown');
        container.appendChild(widgetNode);

        this.choices = document.createElement('div');
        var choices = this.choices;
        choices.className = 'cesium-imagery-dropDown';
        choices.setAttribute('data-bind', '\
                style: {opacity: dropDownVisible() ? 1 : 0},\
                foreach: imageryProviderViewModels');
        container.appendChild(choices);

        var provider = document.createElement('div');
        provider.className = 'cesium-imagery-item';

        var providerIcon = document.createElement('img');
        providerIcon.className = 'cesium-imagery-itemIcon';
        providerIcon.setAttribute('data-bind', 'attr: { src: image }');
        provider.appendChild(providerIcon);

        var providerLabel = document.createElement('div');
        providerLabel.className = 'cesium-imagery-itemLabel';
        providerLabel.setAttribute('data-bind', 'text: name');
        provider.appendChild(providerLabel);

        provider.setAttribute('data-bind', '\
                               visible: $parent.dropDownVisible() && name() !== $parent.selected().name(),\
                               click: $parent.changeProvider');
        choices.appendChild(provider);

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
     * @memberof ImageryWidget
     */
    ImageryWidget.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropdown);
        document.removeEventListener('touchstart', this._closeDropdown);
        var container = this.container;
        knockout.cleanNode(container);
        container.removeChild(this.button);
        container.removeChild(this._nodes);
        return destroyObject(this);
    };

    return ImageryWidget;
});