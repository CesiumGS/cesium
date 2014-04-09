/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './BaseLayerPickerViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        BaseLayerPickerViewModel,
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
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @see ImageryProvider
     * @see ImageryProviderViewModel
     * @see ImageryLayerCollection
     *
     * @example
     * // In HTML head, include a link to the BaseLayerPicker.css stylesheet,
     * // and in the body, include: &lt;div id="baseLayerPickerContainer"
     * //   style="position:absolute;top:24px;right:24px;width:38px;height:38px;"&gt;&lt;/div&gt;
     *
     * //Create the list of available providers we would like the user to select from.
     * //This example uses 3, OpenStreetMap, The Black Marble, and a single, non-streaming world image.
     * var providerViewModels = [];
     * providerViewModels.push(new Cesium.ImageryProviderViewModel({
     *      name : 'Open\u00adStreet\u00adMap',
     *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
     *      tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable \
     *map of the world.\nhttp://www.openstreetmap.org',
     *      creationFunction : function() {
     *          return new Cesium.OpenStreetMapImageryProvider({
     *              url : 'http://tile.openstreetmap.org/'
     *          });
     *      }
     *  }));
     *
     *  providerViewModels.push(new Cesium.ImageryProviderViewModel({
     *      name : 'Black Marble',
     *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/blackMarble.png'),
     *      tooltip : 'The lights of cities and villages trace the outlines of civilization \
     *in this global view of the Earth at night as seen by NASA/NOAA\'s Suomi NPP satellite.',
     *      creationFunction : function() {
     *          return new Cesium.TileMapServiceImageryProvider({
     *              url : 'http://cesiumjs.org/blackmarble',
     *              maximumLevel : 8,
     *              credit : 'Black Marble imagery courtesy NASA Earth Observatory'
     *          });
     *      }
     *  }));
     *
     *  providerViewModels.push(new Cesium.ImageryProviderViewModel({
     *      name : 'Natural Earth\u00a0II',
     *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/naturalEarthII.png'),
     *      tooltip : 'Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/',
     *      creationFunction : function() {
     *          return new Cesium.TileMapServiceImageryProvider({
     *              url : Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
     *          });
     *      }
     *  }));
     *
     * //Create a CesiumWidget without imagery, if you haven't already done so.
     * var cesiumWidget = new Cesium.CesiumWidget('cesiumContainer', { imageryProvider: false });
     *
     * //Finally, create the baseLayerPicker widget using our view models.
     * var layers = cesiumWidget.centralBody.imageryLayers;
     * var baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', layers, providerViewModels);
     *
     * //Use the first item in the list as the current selection.
     * baseLayerPicker.viewModel.selectedItem = providerViewModels[0];
     */
    var BaseLayerPicker = function(container, imageryLayers, imageryProviderViewModels) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        if (!defined(imageryLayers)) {
            throw new DeveloperError('imageryLayers is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var viewModel = new BaseLayerPickerViewModel(imageryLayers, imageryProviderViewModels);

        var element = document.createElement('button');
        element.type = 'button';
        element.className = 'cesium-button cesium-toolbar-button';
        element.setAttribute('data-bind', '\
attr: { title: selectedName },\
click: toggleDropDown');
        container.appendChild(element);

        var imgElement = document.createElement('img');
        imgElement.setAttribute('draggable', 'false');
        imgElement.className = 'cesium-baseLayerPicker-selected';
        imgElement.setAttribute('data-bind', '\
attr: { src: selectedIconUrl }');
        element.appendChild(imgElement);

        var choices = document.createElement('div');
        choices.className = 'cesium-baseLayerPicker-dropDown';
        choices.setAttribute('data-bind', '\
css: { "cesium-baseLayerPicker-visible" : dropDownVisible,\
       "cesium-baseLayerPicker-hidden" : !dropDownVisible },\
foreach: imageryProviderViewModels');
        container.appendChild(choices);

        var provider = document.createElement('div');
        provider.className = 'cesium-baseLayerPicker-item';
        provider.setAttribute('data-bind', '\
css: { "cesium-baseLayerPicker-selectedItem" : $data === $parent.selectedItem },\
attr: { title: tooltip },\
visible: creationCommand.canExecute,\
click: function($data) { $parent.selectedItem = $data; }');
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

        knockout.applyBindings(viewModel, element);
        knockout.applyBindings(viewModel, choices);

        this._viewModel = viewModel;
        this._container = container;
        this._element = element;
        this._choices = choices;

        this._closeDropDown = function(e) {
            if (!(element.contains(e.target) || choices.contains(e.target))) {
                viewModel.dropDownVisible = false;
            }
        };

        document.addEventListener('mousedown', this._closeDropDown, true);
        document.addEventListener('touchstart', this._closeDropDown, true);
    };

    defineProperties(BaseLayerPicker.prototype, {
        /**
         * Gets the parent container.
         * @memberof BaseLayerPicker.prototype
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
         * @memberof BaseLayerPicker.prototype
         *
         * @type {BaseLayerPickerViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof BaseLayerPicker
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    BaseLayerPicker.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof BaseLayerPicker
     */
    BaseLayerPicker.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropDown, true);
        document.removeEventListener('touchstart', this._closeDropDown, true);
        knockout.cleanNode(this._element);
        knockout.cleanNode(this._choices);
        this._container.removeChild(this._element);
        this._container.removeChild(this._choices);
        return destroyObject(this);
    };

    return BaseLayerPicker;
});