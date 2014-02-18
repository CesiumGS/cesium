/*global define,console*/
define([
        '../../Core/createGuid',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/loadText',
        '../../DynamicScene/CzmlDataSource',
        '../../DynamicScene/GeoJsonDataSource',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when',
        './ListDataSourceItemViewModel'
    ], function(
        createGuid,
        defined,
        defineProperties,
        loadText,
        CzmlDataSource,
        GeoJsonDataSource,
        knockout,
        when,
        ListDataSourceItemViewModel) {
    "use strict";

    var ListDataSourcePanelViewModel = function(description, url) {
        this._description = description;
        this._url = '';
        this.children = [];
        this.selectedItem = undefined;
        this._isLoading = true;

        knockout.track(this, ['_description', '_url', 'selectedItem', 'children', '_isLoading']);

        this.url = url;
        this.reload();
    };

    ListDataSourcePanelViewModel.prototype.reset = function() {
        this.url = '';
    };

    ListDataSourcePanelViewModel.prototype.reload = function() {
        var that = this;
        var url = this.url;

        return when(loadText(url + 'gallery-index.js'), function(gallery) {
            var pos1 = gallery.indexOf(' = [');
            var pos2 = gallery.lastIndexOf(';');
            if (pos1 > 0 && pos2 > pos1) {
                gallery = gallery.substring(pos1 + 3, pos2);
            }
            var galleryList = JSON.parse(gallery);

            var length = galleryList.length;
            for (var i = 0; i < length; ++i) {
                var entry = galleryList[i];
                var item = new ListDataSourceItemViewModel(entry.name, that, 'desc', url + entry.name + '.' + entry.format, entry.format);
                that.children.push(item);
            }
            that._isLoading = false;
        }, function(error) {
            console.error('Error loading gallery ' + url);
            return when.reject(error);
        });
    };

    defineProperties(ListDataSourcePanelViewModel.prototype, {
        /**
         * Gets or sets the URL of the list.
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            },
            set : function(value) {
                this._url = value;
            }
        },

        /**
         * Gets the description for this panel.
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {String}
         */
        description : {
            get : function() {
                return this._description;
            }
        },

        /**
         * True if the list is still loading.
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        }
    });

    var ListDataSourcePanel = function(description, url) {
        this._viewModel = new ListDataSourcePanelViewModel(description, url);
        this._templateID = undefined;
    };

    ListDataSourcePanel.prototype._createTemplate = function() {
        this._templateID = 'cesium-dataSourceBrowser-listDataSourcePanel-template-' + createGuid();
        var templateElement = document.createElement('script');
        templateElement.type = 'text/html';
        templateElement.id = this._templateID;
        templateElement.textContent = '<div>\
<div data-bind="css: { \'cesium-dataSourceBrowser-list-loading\' : isLoading }"></div>\
<ul data-bind="foreach: children"><li>\
<span class="cesium-dataSourceBrowser-item" \
    data-bind="text: name, click: select, css: { \
    \'cesium-dataSourceBrowser-item-selected\': isSelected }"></span>\
</li></ul>\
</div>';
        document.body.appendChild(templateElement);
    };

    defineProperties(ListDataSourcePanel.prototype, {
        /**
         * Gets or sets the URL of the list.
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {String}
         */
        url : {
            get : function() {
                return this._viewModel.url;
            }
        },

        /**
         * Gets the description for this panel.
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {String}
         */
        description : {
            get : function() {
                return this._viewModel.description;
            }
        },

        /**
         * Gets the ID of this panel's template.
         * @memberof ListDataSourcePanel.prototype
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
         * @memberof ListDataSourcePanel.prototype
         *
         * @type {Object}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    ListDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var selectedItem = this.viewModel.selectedItem;

        if (!defined(selectedItem)) {
            return false;
        }

        var url = selectedItem.url;
        if (url === '') {
            return false;
        }

        var dataSource;
        switch (selectedItem.format) {
        case 'czml':
            dataSource = new CzmlDataSource(selectedItem.name);
            break;
        case 'json':
            dataSource = new GeoJsonDataSource(selectedItem.name);
            break;
        default:
            return false;
        }

        dataSource.loadUrl(url);
        dataSourceCollection.add(dataSource);
        return true;
    };

    return ListDataSourcePanel;
});