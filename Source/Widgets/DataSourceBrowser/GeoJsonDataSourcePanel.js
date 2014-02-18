/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/getFilenameFromUri',
        '../../DynamicScene/GeoJsonDataSource',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        createGuid,
        defined,
        defineProperties,
        getFilenameFromUri,
        GeoJsonDataSource,
        knockout,
        when) {
    "use strict";

    var GeoJsonDataSourcePanelViewModel = function() {
        this.url = '';

        knockout.track(this, ['url']);
    };

    GeoJsonDataSourcePanelViewModel.prototype.reset = function() {
        this.url = '';
    };

    var GeoJsonDataSourcePanel = function() {
        this._viewModel = new GeoJsonDataSourcePanelViewModel();
        this._templateID = undefined;
    };

    GeoJsonDataSourcePanel.prototype._createTemplate = function() {
        this._templateID = 'cesium-dataSourceBrowser-geoJsonDataSourcePanel-template-' + createGuid();
        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';
        templateElement.id = this._templateID;
        templateElement.textContent = '<div>\
<span>GeoJSON URL:</span>\
<input type="text" data-bind="value: url" size="50">\
</div>';
        document.body.appendChild(templateElement);
    };

    defineProperties(GeoJsonDataSourcePanel.prototype, {
        /**
         * Gets the description for this panel.
         * @memberof GeoJsonDataSourcePanel.prototype
         *
         * @type {String}
         */
        description : {
            value : 'GeoJSON File',
            writable : false
        },

        /**
         * Gets the ID of this panel's template.
         * @memberof GeoJsonDataSourcePanel.prototype
         *
         * @type {String}
         */
        templateID : {
            get : function() {
                if (!defined(this._templateID)) {
                    this._createTemplate();
                }
                return this._templateID;
            }
        },

        /**
         * Gets the view model for this panel.
         * @memberof GeoJsonDataSourcePanel.prototype
         *
         * @type {Object}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    GeoJsonDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var url = this._viewModel.url;
        if (url === '') {
            return false;
        }

        var dataSource = new GeoJsonDataSource(getFilenameFromUri(url));
        dataSource.loadUrl(url);
        dataSourceCollection.add(dataSource);

        return true;
    };

    return GeoJsonDataSourcePanel;
});