/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        './DataSourceBrowserViewModel',
        '../getElement',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        DataSourceBrowserViewModel,
        getElement,
        knockout) {
    "use strict";

    var DataSourceBrowser = function(container, dataSourceCollection) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        if (!defined(dataSourceCollection)) {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        container = getElement(container);

        this._container = container;

        var viewModel = new DataSourceBrowserViewModel(dataSourceCollection);
        this._viewModel = viewModel;

        // This is the main element of the widget.
        var element = document.createElement('div');
        element.className = 'cesium-dataSourceBrowser';

        // The layer button reveals the dataSourceBrowser panel.
        var layerButton = document.createElement('div');
        layerButton.className = 'cesium-dataSourceBrowser-layerButton';
        layerButton.setAttribute('data-bind', 'click: toggleVisibility,\
css: { "cesium-dataSourceBrowser-layerButton-hidden" : visible }');
        element.appendChild(layerButton);

        // This is the template for the contents of a single data source.
        var templateID = 'cesium-dataSourceBrowser-template-' + createGuid();
        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';
        templateElement.id = templateID;
        templateElement.textContent = '<li \
data-bind="css : { \'cesium-dataSourceBrowser-item-excluded\' : isFilteredOut }">\
<!-- ko if: hasChildren -->\
<div data-bind="css : { \'cesium-dataSourceBrowser-item-collapsed\': !expanded }">\
<span class="cesium-dataSourceBrowser-item" \
    data-bind="click: toggleExpanded, css: { \
    \'cesium-dataSourceBrowser-item-selected\': isSelected }">\
    <span data-bind="html: expandIndicator"></span>\
    <span data-bind="text: name"></span></span>\
<ul data-bind="template: { if: expanded, name: \'' + templateID + '\', foreach: children }"></ul></div>\
<!-- /ko -->\
<!-- ko ifnot: hasChildren -->\
<span class="cesium-dataSourceBrowser-item" \
    data-bind="text: name, click: select, css: { \
    \'cesium-dataSourceBrowser-item-selected\': isSelected }"></span>\
<!-- /ko -->';
        element.appendChild(templateElement);

        // This is the container panel for the list of data sources.
        var dataSourcesContainer = document.createElement('div');
        dataSourcesContainer.className = 'cesium-dataSourceBrowser-dataSourcesContainer';
        dataSourcesContainer.setAttribute('data-bind', '\
css: { "cesium-dataSourceBrowser-dataSourcesContainer-visible" : visible,\
       "cesium-dataSourceBrowser-dataSourcesContainer-obscured" : dataSourcePanelViewModel.visible }');
        element.appendChild(dataSourcesContainer);

        // This is the header bar on the list of data sources.
        var dataSourcesContainerHeader = document.createElement('div');
        dataSourcesContainerHeader.className = 'cesium-dataSourceBrowser-dataSourcesContainerHeader';
        dataSourcesContainerHeader.textContent = 'Data sources';
        dataSourcesContainer.appendChild(dataSourcesContainerHeader);

        // Hide button for the list of data sources.
        var dataSourcesContainerHide = document.createElement('div');
        dataSourcesContainerHide.className = 'cesium-dataSourceBrowser-dataSourcesContainerHide cesium-dataSourceBrowser-button';
        dataSourcesContainerHide.innerHTML = '&laquo;';
        dataSourcesContainerHide.setAttribute('data-bind', 'click: toggleVisibility');
        dataSourcesContainer.appendChild(dataSourcesContainerHide);

        // Add button to reveal the add data source panel.
        var addDataSourceButton = document.createElement('span');
        addDataSourceButton.className = 'cesium-dataSourceBrowser-addDataSourceButton cesium-dataSourceBrowser-button';
        addDataSourceButton.textContent = '+ Add';
        addDataSourceButton.setAttribute('data-bind', '\
attr: { title: addDataSourceTooltip },\
click: addDataSourceCommand');
        dataSourcesContainerHeader.appendChild(addDataSourceButton);

        // This is the container for the complete list of data sources.
        var dataSourcesContainerBody = document.createElement('div');
        dataSourcesContainerBody.className = 'cesium-dataSourceBrowser-dataSourcesContainerBody';
        dataSourcesContainerBody.setAttribute('data-bind', 'style : { maxHeight : maxHeightOffset(45) }');
        dataSourcesContainer.appendChild(dataSourcesContainerBody);

        // Info message, if there are no data sources.
        var dataSourcesInfo = document.createElement('div');
        dataSourcesInfo.className = 'cesium-dataSourceBrowser-dataSourcesInfo';
        dataSourcesInfo.setAttribute('data-bind', 'text: infoText');
        dataSourcesContainerBody.appendChild(dataSourcesInfo);

        // Text filter box
        var dataSourcesFilterBox = document.createElement('div');
        dataSourcesFilterBox.className = 'cesium-dataSourceBrowser-dataSourcesFilterBox';
        dataSourcesFilterBox.textContent = "Search: ";
        dataSourcesFilterBox.setAttribute('data-bind', '\
css: { "cesium-dataSourceBrowser-dataSourcesFilterBox-visible" : dataSourcesLength > 0 }');
        dataSourcesContainerBody.appendChild(dataSourcesFilterBox);

        // Text filter input
        var dataSourcesFilterInput = document.createElement('input');
        dataSourcesFilterInput.className = 'cesium-dataSourceBrowser-dataSourcesFilterInput';
        dataSourcesFilterInput.setAttribute('type', 'text');
        dataSourcesFilterInput.setAttribute('data-bind', '\
value: searchText,\
valueUpdate: \'afterkeydown\'');
        dataSourcesFilterBox.appendChild(dataSourcesFilterInput);

        // The root UL of the actual list of data sources, that uses the template.
        var dataSourcesRootElement = document.createElement('ul');
        dataSourcesRootElement.className = 'cesium-dataSourceBrowser-dataSources';
        dataSourcesRootElement.setAttribute('data-bind', 'foreach: dataSourceViewModels');
        dataSourcesContainerBody.appendChild(dataSourcesRootElement);

        // The template LI of a prototype data source.
        var dataSourceListItem = document.createElement('li');
        dataSourceListItem.innerHTML = '\
<!-- ko if: hasChildren -->\
<div data-bind="css : { \'cesium-dataSourceBrowser-item-collapsed\': !expanded,\
                        \'cesium-dataSourceBrowser-item-excluded\' : isFilteredOut }">\
<span class="cesium-dataSourceBrowser-item cesium-dataSourceBrowser-dataSource" \
    data-bind="click: toggleExpanded, css: { \'cesium-dataSourceBrowser-item-selected\': isSelected }">\
    <span data-bind="html: expandIndicator"></span>\
    <span data-bind="text: name"></span>\
    <span class="cesium-dataSourceBrowser-item-buttons">\
        <span class="cesium-dataSourceBrowser-item-clock cesium-dataSourceBrowser-button" \
            data-bind="visible: !isSoleSource || !clockTracking, \
                       click: trackClock, \
                       clickBubble: false, \
                       css: { \'cesium-dataSourceBrowser-clock-selected\': clockTracking }">clock</span>\
        <span class="cesium-dataSourceBrowser-item-configure cesium-dataSourceBrowser-button" \
            data-bind="visible: configure.canExecute, \
                       click: configure, \
                       clickBubble: false, \
                       css: { \'cesium-dataSourceBrowser-configure-selected\': isConfiguring }">configure</span>\
    </span>\
    <span class="cesium-dataSourceBrowser-item-remove cesium-dataSourceBrowser-button" \
        data-bind="click: remove">&times;</span></span>\
<ul data-bind="template: { if: expanded, name: \'' + templateID + '\', foreach: children }"></ul></div>\
<!-- /ko -->\
<!-- ko ifnot: hasChildren -->\
<span class="cesium-dataSourceBrowser-item cesium-dataSourceBrowser-dataSource" \
    data-bind="css: { \'cesium-dataSourceBrowser-item-selected\': isSelected,\
                      \'cesium-dataSourceBrowser-item-excluded\' : isFilteredOut }">\
    <span data-bind="text: name"></span>\
    <span class="cesium-dataSourceBrowser-item-buttons">\
        <span class="cesium-dataSourceBrowser-item-clock cesium-dataSourceBrowser-button" \
            data-bind="visible: !isSoleSource || !clockTracking, \
                       click: trackClock, \
                       clickBubble: false, \
                       css: { \'cesium-dataSourceBrowser-clock-selected\': clockTracking }">clock</span>\
        <span class="cesium-dataSourceBrowser-item-configure cesium-dataSourceBrowser-button" \
            data-bind="visible: configure.canExecute, \
                       click: configure, \
                       clickBubble: false, \
                       css: { \'cesium-dataSourceBrowser-configure-selected\': isConfiguring }">configure</span>\
    </span>\
    <span class="cesium-dataSourceBrowser-item-remove cesium-dataSourceBrowser-button" \
        data-bind="click: remove">&times;</span></span>\
<!-- /ko -->';
        dataSourcesRootElement.appendChild(dataSourceListItem);

        container.appendChild(element);
        this._element = element;

        // === Add Data Source Panel ===

        // The root of the panel that adds new data sources.
        var dataSourcePanelContainer = document.createElement('div');
        dataSourcePanelContainer.className = 'cesium-dataSourceBrowser-dataSourcePanelContainer';
        dataSourcePanelContainer.setAttribute('data-bind', '\
with: dataSourcePanelViewModel,\
css: { "cesium-dataSourceBrowser-dataSourcePanelContainer-visible" : dataSourcePanelViewModel.visible }');
        container.appendChild(dataSourcePanelContainer);
        this._dataSourcePanelContainer = dataSourcePanelContainer;

        // The header of the add new data source panel.
        var dataSourcePanelHeader = document.createElement('div');
        dataSourcePanelHeader.className = 'cesium-dataSourceBrowser-dataSourcePanelContainer-header';
        dataSourcePanelHeader.textContent = 'Add data from: ';
        dataSourcePanelContainer.appendChild(dataSourcePanelHeader);

        // Selector button for the type of data source.
        var dataSourceTypeSelector = document.createElement('div');
        dataSourceTypeSelector.className = 'cesium-dataSourceBrowser-dataSourcePanelContainer-dataSourceTypeSelector cesium-dataSourceBrowser-button';
        dataSourceTypeSelector.innerHTML = ' &#9660;';
        dataSourceTypeSelector.setAttribute('data-bind', '\
click: toggleDataSourceTypeSelector');
        dataSourcePanelHeader.appendChild(dataSourceTypeSelector);

        // Label of selector button for the type of data source.
        var dataSourceTypeSelectorLabel = document.createElement('span');
        dataSourceTypeSelectorLabel.setAttribute('data-bind', '\
text: activeDataSourcePanel ? activeDataSourcePanel.description : \'Choose...\'');
        dataSourceTypeSelector.insertBefore(dataSourceTypeSelectorLabel, dataSourceTypeSelector.firstChild);

        // Container for the add buttons for each of the types of data sources.
        var dataSourceOptions = document.createElement('ul');
        dataSourceOptions.className = 'cesium-dataSourceBrowser-dataSourcePanelContainer-dataSourceOptions';
        dataSourceOptions.setAttribute('data-bind', '\
css: { \'cesium-dataSourceBrowser-dataSourcePanelContainer-dataSourceOptions-visible\' : typeSelectorVisible },\
foreach: dataSourcePanels');
        dataSourceTypeSelector.appendChild(dataSourceOptions);

        // Prototype button for adding a data source.
        var dataSourceOption = document.createElement('li');
        dataSourceOption.setAttribute('data-bind', '\
click: function($data) { $parent.activeDataSourcePanel = $data }');
        dataSourceOptions.appendChild(dataSourceOption);

        // Label on prototype button for adding a data source.
        var dataSourceOptionLabel = document.createElement('span');
        dataSourceOptionLabel.className = 'cesium-dataSourceBrowser-item';
        dataSourceOptionLabel.setAttribute('data-bind', '\
css: { "cesium-dataSourceBrowser-dataSourcePanelContainer-dataSourceSelected" : $data === $parent.activeDataSourcePanel },\
text : description');
        dataSourceOption.appendChild(dataSourceOptionLabel);

        // Panel for options of data source being added.
        var activeDataSourcePanelContainer = document.createElement('div');
        activeDataSourcePanelContainer.className = 'cesium-dataSourceBrowser-activeDataSourcePanelContainer';
        activeDataSourcePanelContainer.setAttribute('data-bind', '\
style : { maxHeight : dataSourceBrowserViewModel.maxHeightOffset(105) },\
template : { if: activeDataSourcePanel,\
             name: activeDataSourcePanel && activeDataSourcePanel.templateID,\
             data: activeDataSourcePanel && activeDataSourcePanel.viewModel }');
        dataSourcePanelContainer.appendChild(activeDataSourcePanelContainer);

        // Footer contains OK and Cancel buttons for adding a data source.
        var dataSourcePanelFooter = document.createElement('div');
        dataSourcePanelFooter.className = 'cesium-dataSourceBrowser-dataSourcePanelContainer-footer';
        dataSourcePanelContainer.appendChild(dataSourcePanelFooter);

        var finishAddDataSourceButton = document.createElement('span');
        finishAddDataSourceButton.className = 'cesium-dataSourceBrowser-button';
        finishAddDataSourceButton.textContent = 'Load';
        finishAddDataSourceButton.setAttribute('data-bind', '\
click: function () { finishCommand.canExecute && finishCommand(); },\
css: { \'cesium-dataSourceBrowser-button-disabled\': !finishCommand.canExecute }');
        dataSourcePanelFooter.appendChild(finishAddDataSourceButton);

        var cancelAddDataSourceButton = document.createElement('span');
        cancelAddDataSourceButton.className = 'cesium-dataSourceBrowser-button';
        cancelAddDataSourceButton.textContent = 'Cancel';
        cancelAddDataSourceButton.setAttribute('data-bind', '\
click: cancelCommand');
        dataSourcePanelFooter.appendChild(cancelAddDataSourceButton);

        var finishAddDataSourceError = document.createElement('span');
        finishAddDataSourceError.setAttribute('data-bind', '\
visible: error !== "",\
text: error');
        dataSourcePanelFooter.appendChild(finishAddDataSourceError);

        // The root of the panel that configures loaded data sources.
        var dataSourceConfigurationPanelContainer = document.createElement('div');
        dataSourceConfigurationPanelContainer.className = 'cesium-dataSourceBrowser-dataSourceConfigurationPanelContainer';
        dataSourceConfigurationPanelContainer.setAttribute('data-bind', '\
with: dataSourceConfigurationPanelViewModel,\
css: { "cesium-dataSourceBrowser-dataSourceConfigurationPanelContainer-visible" : dataSourceConfigurationPanelViewModel.visible }');
        element.appendChild(dataSourceConfigurationPanelContainer);

        // The header of the configure data source panel.
        var dataSourceConfigurationPanelHeader = document.createElement('div');
        dataSourceConfigurationPanelHeader.className = 'cesium-dataSourceBrowser-dataSourceConfigurationPanelContainer-header';
        dataSourceConfigurationPanelHeader.setAttribute('data-bind', '\
text: activeDataSourceConfigurationPanel && activeDataSourceConfigurationPanel.name');
        dataSourceConfigurationPanelContainer.appendChild(dataSourceConfigurationPanelHeader);

        var activeDataSourceConfigurationPanelContainer = document.createElement('div');
        activeDataSourceConfigurationPanelContainer.className = 'cesium-dataSourceBrowser-activeDataSourceConfigurationPanelContainer';
        activeDataSourceConfigurationPanelContainer.setAttribute('data-bind', '\
style : { maxHeight : dataSourceBrowserViewModel.maxHeightOffset(85) },\
template : { if: activeDataSourceConfigurationPanel,\
             name: activeDataSourceConfigurationPanel && activeDataSourceConfigurationPanel.templateID,\
             data: activeDataSourceConfigurationPanel && activeDataSourceConfigurationPanel.viewModel }');
        dataSourceConfigurationPanelContainer.appendChild(activeDataSourceConfigurationPanelContainer);

        // Footer contains Done button.
        var dataSourceConfigurationPanelFooter = document.createElement('div');
        dataSourceConfigurationPanelFooter.className = 'cesium-dataSourceBrowser-dataSourceConfigurationPanelContainer-footer';
        dataSourceConfigurationPanelContainer.appendChild(dataSourceConfigurationPanelFooter);

        var doneConfigurationPanelButton = document.createElement('span');
        doneConfigurationPanelButton.className = 'cesium-dataSourceBrowser-button';
        doneConfigurationPanelButton.textContent = 'Done';
        doneConfigurationPanelButton.setAttribute('data-bind', '\
click: doneCommand');
        dataSourceConfigurationPanelContainer.appendChild(doneConfigurationPanelButton);

        knockout.applyBindings(viewModel, element);
        knockout.applyBindings(viewModel, dataSourcePanelContainer);
    };

    defineProperties(DataSourceBrowser.prototype, {
        /**
         * Gets the parent container.
         * @memberof DataSourceBrowser.prototype
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
         * @memberof DataSourceBrowser.prototype
         *
         * @type {DataSourceBrowserViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof DataSourceBrowser
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    DataSourceBrowser.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof DataSourceBrowser
     */
    DataSourceBrowser.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        container.removeChild(this._element);
        container.removeChild(this._dataSourcePanelContainer);
        return destroyObject(this);
    };

    return DataSourceBrowser;
});