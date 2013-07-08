/*global define*/
define([], function() {
    "use strict";

    var AddCzmlDataSourcePanel = function(container) {
        this._container = container;

        var element = document.createElement('div');
        container.appendChild(element);
        this._element = element;

        var input = document.createElement('input');
        element.appendChild(input);
    };

    AddCzmlDataSourcePanel.prototype.destroy = function() {
        this._container.removeChild(this._element);
    };

    AddCzmlDataSourcePanel.description = 'CZML file';

    return AddCzmlDataSourcePanel;
});