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
     * <span style="display: block; text-align: center;">
     * <img src="images/BaseLayerPicker.png" style="border: none; border-radius: 5px;" />
     * <br />BaseLayerPicker with its drop-panel open.
     * </span>
     * <br /><br />
     * The BaseLayerPicker is a single button widget that displays a panel of available imagery
     * providers.  When an item is selected, the corresponding imagery layer is created and inserted
     * as the base layer of the imagery collection; removing the existing base.  Each item in the
     * available providers list contains a name, a representative icon, and a tooltip to display more
     * information when hovered. The list is initially empty, and must be configured before use, as
     * illustrated in the below example.
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
     *
     * @example
     * // In HTML head, include a link to the BaseLayerPicker.css stylesheet,
     * // and in the body, include: &lt;div id="baseLayerPickerContainer"&gt;&lt;/div&gt;
     *
     * //Create the list of available providers we would like the user to select from.
     * //This example uses 3, OpenStreetMap, The Black Marble, and a single, non-streaming world image.
     * var providerViewModels = [];
     * providerViewModels.push(ImageryProviderViewModel.fromConstants({
     *      name : 'Open\u00adStreet\u00adMap',
     *      iconUrl : require.toUrl('../Images/ImageryProviders/openStreetMap.png'),
     *      tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable \
     *map of the world.\nhttp://www.openstreetmap.org',
     *      creationFunction : function() {
     *          return new OpenStreetMapImageryProvider({
     *              url : 'http://tile.openstreetmap.org/',
     *          });
     *      }
     *  }));
     *
     *  providerViewModels.push(ImageryProviderViewModel.fromConstants({
     *      name : 'Black Marble',
     *      iconUrl : require.toUrl('../Images/ImageryProviders/blackMarble.png'),
     *      tooltip : 'The lights of cities and villages trace the outlines of civilization \
     *in this global view of the Earth at night as seen by NASA/NOAA\'s Suomi NPP satellite.',
     *      creationFunction : function() {
     *          return new TileMapServiceImageryProvider({
     *              url : 'http://cesium.agi.com/blackmarble',
     *              maximumLevel : 8,
     *              credit : 'Black Marble imagery courtesy NASA Earth Observatory',
     *          });
     *      }
     *  }));
     *
     *  providerViewModels.push(ImageryProviderViewModel.fromConstants({
     *      name : 'Disable Streaming Imagery',
     *      iconUrl : require.toUrl('../Images/ImageryProviders/singleTile.png'),
     *      tooltip : 'Uses a single image for the entire world.',
     *      creationFunction : function() {
     *          return new SingleTileImageryProvider({
     *              url : 'NE2_LR_LC_SR_W_DR_2048.jpg',
     *          });
     *      }
     *  }));
     *
     * //Finally, create the actual widget using our view models.
     * var layers = centralBody.getImageryLayers();
     * var baseLayerPicker = new BaseLayerPicker('baseLayerPickerContainer', layers, providerViewModels);
     *
     * //Use the first item in the list as the current selection.
     * baseLayerPicker.viewModel.selectedItem(providerViewModels[0]);
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
         * Gets the element created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.element = document.createElement('img');

        var element = this.element;
        element.setAttribute('draggable', 'false');
        element.className = 'cesium-baseLayerPicker-selected';
        element.setAttribute('data-bind', '\
                attr: {title: selectedName, src: selectedIconUrl},\
                click: toggleDropDown');
        container.appendChild(element);

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
        container.removeChild(this.element);
        return destroyObject(this);
    };

    return BaseLayerPicker;
});