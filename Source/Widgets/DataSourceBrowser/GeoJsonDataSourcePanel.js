/*global define*/
define([
        '../../Core/defineProperties',
        '../../DynamicScene/GeoJsonDataSource',
        '../../ThirdParty/when'
    ], function(
        defineProperties,
        GeoJsonDataSource,
        when) {
    "use strict";

    var GeoJsonDataSourcePanel = function() {
        this.description = 'GeoJSON file';

        var element = document.createElement('div');
        this._element = element;

        var span = document.createElement('span');
        span.textContent = 'URL:';
        element.appendChild(span);

        var input = document.createElement('input');
        input.type = 'text';
        element.appendChild(input);

        this._input = input;
    };

    defineProperties(GeoJsonDataSourcePanel.prototype, {
        /**
         * Gets the element that contains this panel.
         * @memberof GeoJsonDataSourcePanel.prototype
         *
         * @type {Element}
         */
        element : {
            get : function() {
                return this._element;
            }
        }
    });

    GeoJsonDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var url = this._input.value;
        if (this._input.value === '') {
            return false;
        }

        var dataSource = new GeoJsonDataSource();
        return when(dataSource.loadUrl(url), function() {
            dataSourceCollection.add(dataSource);
            return true;
        }, function(error) {
            return when.reject(error);
        });
    };

    return GeoJsonDataSourcePanel;
});