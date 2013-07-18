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

        var element = document.createElement('div');
        element.className = 'cesium-dataSourceBrowser';
        container.appendChild(element);
        this._element = element;

        var addDataSourceButton = document.createElement('span');
        addDataSourceButton.textContent = 'Add';
        addDataSourceButton.className = 'cesium-dataSourceBrowser-addDataSource';
        addDataSourceButton.setAttribute('data-bind', '\
attr: { title: addDataSourceTooltip },\
click: addDataSourceCommand');
        element.appendChild(addDataSourceButton);

        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';

        var templateID = 'cesium-dataSourceBrowser-template-' + createGuid();
        this._templateID = templateID;
        templateElement.id = this._templateID;
        templateElement.textContent = '<li>\
<!-- ko if: hasChildren -->\
<input type="checkbox" data-bind="attr: { id: id }, checked: expanded">\
<label data-bind="attr: { for: id }, text: name"></label>\
<ul data-bind="template: { name: \'' + this._templateID + '\', foreach: children }"></ul>\
<!-- /ko -->\
<!-- ko ifnot: hasChildren -->\
<span data-bind="text: name, click: select"></span>\
<!-- /ko -->';

        element.appendChild(templateElement);

        var dataSourcesElement = document.createElement('ul');
        dataSourcesElement.className = 'cesium-dataSourceBrowser-dataSources';
        dataSourcesElement.setAttribute('data-bind', 'template: { name: "' + templateID + '", foreach: dataSources }');
        element.appendChild(dataSourcesElement);

        var dataSourceContainer = document.createElement('div');
        dataSourceContainer.className = 'cesium-dataSourceBrowser-dataSourceContainer';
        dataSourceContainer.setAttribute('data-bind', '\
with: dataSourcePanelViewModel,\
css: { "cesium-dataSourceBrowser-visible" : dataSourcePanelViewModel.visible,\
       "cesium-dataSourceBrowser-hidden" : !dataSourcePanelViewModel.visible }');
        element.appendChild(dataSourceContainer);

        var addDataSourceLabel = document.createElement('span');
        addDataSourceLabel.textContent = 'Add Data Source';
        dataSourceContainer.appendChild(addDataSourceLabel);

        var dataSourceOptions = document.createElement('div');
        dataSourceOptions.className = 'cesium-dataSourceBrowser-dataSourceOptions';
        dataSourceOptions.setAttribute('data-bind', 'foreach: dataSourcePanels');
        dataSourceContainer.appendChild(dataSourceOptions);

        var dataSourceOption = document.createElement('div');
        dataSourceOption.setAttribute('data-bind', '\
text : description,\
css: {"cesium-dataSourceBrowser-dataSourceSelected" : $data === $parent.activeDataSourcePanel},\
click: function($data) { $parent.activeDataSourcePanel = $data }');
        dataSourceOptions.appendChild(dataSourceOption);

        var activeDataSourcePanelContainer = document.createElement('div');
        activeDataSourcePanelContainer.setAttribute('data-bind', '\
dataSourceBrowserActivePanel : activeDataSourcePanel');
        dataSourceContainer.appendChild(activeDataSourcePanelContainer);

        var finishAddDataSourceButton = document.createElement('button');
        finishAddDataSourceButton.textContent = 'Finish';
        finishAddDataSourceButton.setAttribute('data-bind', '\
click: finishCommand,\
enable: finishCommand.canExecute');
        dataSourceContainer.appendChild(finishAddDataSourceButton);

        knockout.bindingHandlers.dataSourceBrowserActivePanel = {
            update : function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                while (element.hasChildNodes()) {
                    element.removeChild(element.lastChild);
                }

                var newActivePanel = valueAccessor();
                if (defined(newActivePanel)) {
                    element.appendChild(newActivePanel.element);
                }
            }
        };

        knockout.applyBindings(viewModel, element);
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
        return destroyObject(this);
    };

    return DataSourceBrowser;
});