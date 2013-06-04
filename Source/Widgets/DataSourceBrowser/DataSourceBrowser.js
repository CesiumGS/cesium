/*global define*/
define([
        '../../Core/DeveloperError',
        './DataSourceBrowserViewModel'
    ], function(
        DeveloperError,
        DataSourceBrowserViewModel) {
    "use strict";

    function Node(name) {

    }

    var DataSourceBrowser = function(container, dataSourceCollection) {
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

        if (typeof dataSourceCollection === 'undefined') {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        this._viewModel = new DataSourceBrowserViewModel(dataSourceCollection);

        this._container = container;

        var element = document.createElement('div');
        element.className = 'cesium-dataSourceBrowser';
        container.appendChild(element);

        this._element = element;
    };

    return DataSourceBrowser;
});