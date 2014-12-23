/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './BaseLayerPickerViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        BaseLayerPickerViewModel) {
    "use strict";

    /**
     * <span style="display: block; text-align: center;">
     * <img src="images/BaseLayerPicker.png" style="border: none; border-radius: 5px;" />
     * <br />BaseLayerPicker with its drop-panel open.
     * </span>
     * <br /><br />
     * The BaseLayerPicker is a single button widget that displays a panel of available imagery and
     * terrain providers.  When imagery is selected, the corresponding imagery layer is created and inserted
     * as the base layer of the imagery collection; removing the existing base.  When terrain is selected,
     * it replaces the current terrain provider.  Each item in the available providers list contains a name,
     * a representative icon, and a tooltip to display more information when hovered. The list is initially
     * empty, and must be configured before use, as illustrated in the below example.
     *
     * @alias BaseLayerPicker
     * @constructor
     *
     * @param {Element} container The parent HTML container node for this widget.
     * @param {Object} options Object with the following properties:
     * @param {Globe} options.globe The Globe to use.
     * @param {ProviderViewModel[]} [options.imageryProviderViewModels=[]] The array of ProviderViewModel instances to use for imagery.
     * @param {ProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available imagery layer is used.
     * @param {ProviderViewModel[]} [options.terrainProviderViewModels=[]] The array of ProviderViewModel instances to use for terrain.
     * @param {ProviderViewModel} [options.selectedTerrainProviderViewModel] The view model for the current base terrain layer, if not supplied the first available terrain layer is used.
     *
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @see TerrainProvider
     * @see ImageryProvider
     * @see ImageryLayerCollection
     *
     * @example
     * // In HTML head, include a link to the BaseLayerPicker.css stylesheet,
     * // and in the body, include: <div id="baseLayerPickerContainer"
     * //   style="position:absolute;top:24px;right:24px;width:38px;height:38px;"></div>
     *
     * //Create the list of available providers we would like the user to select from.
     * //This example uses 3, OpenStreetMap, The Black Marble, and a single, non-streaming world image.
     * var imageryViewModels = [];
     * imageryViewModels.push(new Cesium.ProviderViewModel({
     *      name : 'Open\u00adStreet\u00adMap',
     *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
     *      tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable \
     *map of the world.\nhttp://www.openstreetmap.org',
     *      creationFunction : function() {
     *          return new Cesium.OpenStreetMapImageryProvider({
     *              url : '//a.tile.openstreetmap.org/'
     *          });
     *      }
     *  }));
     *
     *  imageryViewModels.push(new Cesium.ProviderViewModel({
     *      name : 'Black Marble',
     *      iconUrl : Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/blackMarble.png'),
     *      tooltip : 'The lights of cities and villages trace the outlines of civilization \
     *in this global view of the Earth at night as seen by NASA/NOAA\'s Suomi NPP satellite.',
     *      creationFunction : function() {
     *          return new Cesium.TileMapServiceImageryProvider({
     *              url : '//cesiumjs.org/blackmarble',
     *              maximumLevel : 8,
     *              credit : 'Black Marble imagery courtesy NASA Earth Observatory'
     *          });
     *      }
     *  }));
     *
     *  imageryViewModels.push(new Cesium.ProviderViewModel({
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
     * var layers = cesiumWidget.imageryLayers;
     * var baseLayerPicker = new Cesium.BaseLayerPicker('baseLayerPickerContainer', layers, imageryViewModels);
     *
     * //Use the first item in the list as the current selection.
     * baseLayerPicker.viewModel.selectedItem = imageryViewModels[0];
     */
    var BaseLayerPicker = function(container, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }
        //>>includeEnd('debug');

        container = getElement(container);

        var viewModel = new BaseLayerPickerViewModel(options);

        var element = document.createElement('button');
        element.type = 'button';
        element.className = 'cesium-button cesium-toolbar-button';
        element.setAttribute('data-bind', '\
attr: { title: buttonTooltip },\
click: toggleDropDown');
        container.appendChild(element);

        var imgElement = document.createElement('img');
        imgElement.setAttribute('draggable', 'false');
        imgElement.className = 'cesium-baseLayerPicker-selected';
        imgElement.setAttribute('data-bind', '\
attr: { src: buttonImageUrl }');
        element.appendChild(imgElement);

        var dropPanel = document.createElement('div');
        dropPanel.className = 'cesium-baseLayerPicker-dropDown';
        dropPanel.setAttribute('data-bind', '\
css: { "cesium-baseLayerPicker-dropDown-visible" : dropDownVisible }');
        container.appendChild(dropPanel);

        var imageryTitle = document.createElement('div');
        imageryTitle.className = 'cesium-baseLayerPicker-sectionTitle';
        imageryTitle.setAttribute('data-bind', 'visible: imageryProviderViewModels.length > 0');
        imageryTitle.innerHTML = 'Imagery';
        dropPanel.appendChild(imageryTitle);

        var imageryChoices = document.createElement('div');
        imageryChoices.className = 'cesium-baseLayerPicker-choices';
        imageryChoices.setAttribute('data-bind', 'foreach: imageryProviderViewModels');
        dropPanel.appendChild(imageryChoices);

        var imageryProvider = document.createElement('div');
        imageryProvider.className = 'cesium-baseLayerPicker-item';
        imageryProvider.setAttribute('data-bind', '\
css: { "cesium-baseLayerPicker-selectedItem" : $data === $parent.selectedImagery },\
attr: { title: tooltip },\
visible: creationCommand.canExecute,\
click: function($data) { $parent.selectedImagery = $data; }');
        imageryChoices.appendChild(imageryProvider);

        var providerIcon = document.createElement('img');
        providerIcon.className = 'cesium-baseLayerPicker-itemIcon';
        providerIcon.setAttribute('data-bind', 'attr: { src: iconUrl }');
        providerIcon.setAttribute('draggable', 'false');
        imageryProvider.appendChild(providerIcon);

        var providerLabel = document.createElement('div');
        providerLabel.className = 'cesium-baseLayerPicker-itemLabel';
        providerLabel.setAttribute('data-bind', 'text: name');
        imageryProvider.appendChild(providerLabel);

        var terrainTitle = document.createElement('div');
        terrainTitle.className = 'cesium-baseLayerPicker-sectionTitle';
        terrainTitle.setAttribute('data-bind', 'visible: terrainProviderViewModels.length > 0');
        terrainTitle.innerHTML = 'Terrain';
        dropPanel.appendChild(terrainTitle);

        var terrainChoices = document.createElement('div');
        terrainChoices.className = 'cesium-baseLayerPicker-choices';
        terrainChoices.setAttribute('data-bind', 'foreach: terrainProviderViewModels');
        dropPanel.appendChild(terrainChoices);

        var terrainProvider = document.createElement('div');
        terrainProvider.className = 'cesium-baseLayerPicker-item';
        terrainProvider.setAttribute('data-bind', '\
css: { "cesium-baseLayerPicker-selectedItem" : $data === $parent.selectedTerrain },\
attr: { title: tooltip },\
visible: creationCommand.canExecute,\
click: function($data) { $parent.selectedTerrain = $data; }');
        terrainChoices.appendChild(terrainProvider);

        var terrainProviderIcon = document.createElement('img');
        terrainProviderIcon.className = 'cesium-baseLayerPicker-itemIcon';
        terrainProviderIcon.setAttribute('data-bind', 'attr: { src: iconUrl }');
        terrainProviderIcon.setAttribute('draggable', 'false');
        terrainProvider.appendChild(terrainProviderIcon);

        var terrainProviderLabel = document.createElement('div');
        terrainProviderLabel.className = 'cesium-baseLayerPicker-itemLabel';
        terrainProviderLabel.setAttribute('data-bind', 'text: name');
        terrainProvider.appendChild(terrainProviderLabel);

        knockout.applyBindings(viewModel, element);
        knockout.applyBindings(viewModel, dropPanel);

        this._viewModel = viewModel;
        this._container = container;
        this._element = element;
        this._dropPanel = dropPanel;

        this._closeDropDown = function(e) {
            if (!(element.contains(e.target) || dropPanel.contains(e.target))) {
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
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    BaseLayerPicker.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    BaseLayerPicker.prototype.destroy = function() {
        document.removeEventListener('mousedown', this._closeDropDown, true);
        document.removeEventListener('touchstart', this._closeDropDown, true);
        knockout.cleanNode(this._element);
        knockout.cleanNode(this._dropPanel);
        this._container.removeChild(this._element);
        this._container.removeChild(this._dropPanel);
        return destroyObject(this);
    };

    return BaseLayerPicker;
});