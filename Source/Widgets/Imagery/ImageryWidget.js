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
        this.button = document.createElement('button');

        var widgetNode = this.button;
        widgetNode.className = 'imageryCommon';
        widgetNode.setAttribute('data-bind', '\
                style: {"background-image": selected() ? selected().image : "Unknown Imagery"},\
                text: selected() ? selected().name : "Unknown Imagery",\
                click: toggleDropdown');
        container.appendChild(widgetNode);

        this.choices = document.createElement('div');
        var choices = this.choices;
        choices.className = 'imageryDiv';
        choices.setAttribute('data-bind', 'foreach: imageryProviderViewModels');
        container.appendChild(choices);

        var provider = document.createElement('button');
        provider.className = 'imageryChoice';
        provider.setAttribute('data-bind', '\
                               text: name,\
                               style: {"background-image": image},\
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