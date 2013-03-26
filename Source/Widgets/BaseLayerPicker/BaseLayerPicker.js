/*global define*/
define(['./BaseLayerPickerViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
            BaseLayerPickerViewModel,
            DeveloperError,
            destroyObject,
            knockout) {
    "use strict";

    /**
     * A single button widget for switching amoung base imagery layers.
     *
     * @alias BaseLayerPicker
     * @constructor
     *
     * @param {Element} container The parent HTML container node for this widget.
     * @param {ImageryLayerCollection} imageryLayers The imagery layer collection to use.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     * @exception {DeveloperError} imageryLayers is required.
     *
     * @see ImageryProvider
     * @see ImageryProviderViewModel
     * @see ImageryLayerCollection
     */
    var BaseLayerPicker = function(container, imageryLayers, imageryProviderViewModels) {
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

        if (typeof imageryLayers === 'undefined') {
            throw new DeveloperError('imageryLayers is required.');
        }

        var viewModel = new BaseLayerPickerViewModel(imageryLayers, imageryProviderViewModels);

        /**
         * Gets the viewModel being used by the widget.
         * @memberof BaseLayerPicker
         * @type {SeneModeViewModel}
         */
        this.viewModel = viewModel;

        /**
         * Gets the container element for the widget.
         * @memberof BaseLayerPicker
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the actual button created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.button = document.createElement('img');

        var button = this.button;
        button.setAttribute('draggable', 'false');
        button.className = 'cesium-baseLayerPicker-selected';
        button.setAttribute('data-bind', '\
                attr: {title: selectedName, src: selectedIconUrl},\
                click: toggleDropDown');
        container.appendChild(button);

        var choices = document.createElement('div');
        choices.className = 'cesium-baseLayerPicker-dropDown';
        choices.setAttribute('data-bind', '\
                css: { "cesium-baseLayerPicker-visible" : dropDownVisible(),\
                       "cesium-baseLayerPicker-hidden" : !dropDownVisible() },\
                foreach: imageryProviderViewModels');
        container.appendChild(choices);

        var provider = document.createElement('div');
        provider.className = 'cesium-baseLayerPicker-item';
        provider.setAttribute('data-bind', '\
                css: {"cesium-baseLayerPicker-selectedItem" : $data === $parent.selectedItem()},\
                attr: {title: tooltip},\
                visible: creationCommand.canExecute(),\
                click: $parent.selectedItem');
        choices.appendChild(provider);

        var providerIcon = document.createElement('img');
        providerIcon.className = 'cesium-baseLayerPicker-itemIcon';
        providerIcon.setAttribute('data-bind', 'attr: { src: iconUrl }');
        providerIcon.setAttribute('draggable', 'false');
        provider.appendChild(providerIcon);

        var providerLabel = document.createElement('div');
        providerLabel.className = 'cesium-baseLayerPicker-itemLabel';
        providerLabel.setAttribute('data-bind', 'text: name');
        provider.appendChild(providerLabel);

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
     * @memberof BaseLayerPicker
     */
    BaseLayerPicker.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropDown);
        document.removeEventListener('touchstart', this._closeDropDown);
        var container = this.container;
        knockout.cleanNode(container);
        container.removeChild(this.button);
        return destroyObject(this);
    };

    return BaseLayerPicker;
});