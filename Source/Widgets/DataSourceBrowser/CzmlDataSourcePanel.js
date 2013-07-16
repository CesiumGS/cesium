/*global define*/
define([
        '../../Core/defineProperties',
        '../../DynamicScene/CzmlDataSource',
        '../../ThirdParty/when'
    ], function(
        defineProperties,
        CzmlDataSource,
        when) {
    "use strict";

    var CzmlDataSourcePanel = function() {
        this.description = 'CZML file';

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

    defineProperties(CzmlDataSourcePanel.prototype, {
        /**
         * Gets the element that contains this panel.
         * @memberof CzmlDataSourcePanel.prototype
         *
         * @type {Element}
         */
        element : {
            get : function() {
                return this._element;
            }
        }
    });

    CzmlDataSourcePanel.prototype.finish = function(dataSourceCollection) {
        var url = this._input.value;
        if (this._input.value === '') {
            return false;
        }

        var dataSource = new CzmlDataSource();
        return when(dataSource.loadUrl(url), function() {
            dataSourceCollection.add(dataSource);
            return true;
        }, function(error) {
            return when.reject(error);
        });
    };

    return CzmlDataSourcePanel;
});