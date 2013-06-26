/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        './DataSourceBrowserViewModel',
        '../getElement',
        '../../ThirdParty/knockout'
    ], function(
        createGuid,
        defineProperties,
        destroyObject,
        DeveloperError,
        DataSourceBrowserViewModel,
        getElement,
        knockout) {
    "use strict";

    var DataSourceBrowser = function(container, dataSourceCollection) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof dataSourceCollection === 'undefined') {
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

        container.appendChild(templateElement);
        this._templateElement = templateElement;

        var rootDataSourcesElement = document.createElement('ul');
        rootDataSourcesElement.setAttribute('data-bind', 'template: { name: "' + templateID + '", foreach: dataSources }');
        element.appendChild(rootDataSourcesElement);
        this._rootDataSourcesElement = rootDataSourcesElement;

        knockout.applyBindings(viewModel, container);
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
        container.removeChild(this._templateElement);
        return destroyObject(this);
    };

    return DataSourceBrowser;
});