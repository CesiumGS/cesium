/*global define*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/getFilenameFromUri',
        '../../DynamicScene/CzmlDataSource',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        createGuid,
        defined,
        defineProperties,
        getFilenameFromUri,
        CzmlDataSource,
        knockout,
        when) {
    "use strict";

    var CzmlDataSourcePanelViewModel = function() {
        this.url = '';

        knockout.track(this, ['url']);
    };

    CzmlDataSourcePanelViewModel.prototype.reset = function() {
        this.url = '';
    };

    var CzmlDataSourcePanel = function() {
        this._viewModel = new CzmlDataSourcePanelViewModel();
        this._templateID = undefined;
    };

    CzmlDataSourcePanel.prototype._createTemplate = function() {
        this._templateID = 'cesium-dataSourceBrowser-czmlDataSourcePanel-template-' + createGuid();
        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';
        templateElement.id = this._templateID;
        templateElement.textContent = '<div>\
<span>CZML URL:</span>\
<input type="text" data-bind="value: url" size="50">\
</div>';
        document.body.appendChild(templateElement);
    };

    defineProperties(CzmlDataSourcePanel.prototype, {
        /**
         * Gets the description for this panel.
         * @memberof CzmlDataSourcePanel.prototype
         *
         * @type {String}
         */
        description : {
            value : 'CZML File',
            writable : false
        },

        /**
         * Gets the ID of this panel's template.
         * @memberof CzmlDataSourcePanel.prototype
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
         * @memberof CzmlDataSourcePanel.prototype
         *
         * @type {Object}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    CzmlDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var url = this._viewModel.url;
        if (url === '') {
            return false;
        }

        var dataSource = new CzmlDataSource(getFilenameFromUri(url));
        dataSource.loadUrl(url);
        dataSourceCollection.add(dataSource);

        return true;
    };

    return CzmlDataSourcePanel;
});