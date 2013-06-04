/*global define*/
define([
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
    ], function(
        DeveloperError,
        knockout) {
    "use strict";

    var DataSourceBrowserViewModel = function(dataSourceCollection) {
        if (typeof dataSourceCollection === 'undefined') {
            throw new DeveloperError('dataSourceCollection is required.');
        }

        dataSourceCollection.dataSourceAdded.addEventListener(this._onDataSourceAdded, this);
        dataSourceCollection.dataSourceRemoved.addEventListener(this._onDataSourceRemoved, this);
        this._dataSourceCollection = dataSourceCollection;
    };

    return DataSourceBrowserViewModel;
});