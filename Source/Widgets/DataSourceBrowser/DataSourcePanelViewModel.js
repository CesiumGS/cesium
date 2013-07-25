/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../createCommand',
        './CzmlDataSourcePanel',
        './GeoJsonDataSourcePanel',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        createCommand,
        CzmlDataSourcePanel,
        GeoJsonDataSourcePanel,
        knockout,
        when) {
    "use strict";

    var DataSourcePanelViewModel = function(dataSourceBrowserViewModel, dataSourcePanels) {
        var that = this;

        this._dataSourceBrowserViewModel = dataSourceBrowserViewModel;

        var finishing = knockout.observable(false);

        /**
         *
         */
        this.dataSourcePanels = defaultValue(dataSourcePanels, DataSourcePanelViewModel.defaultDataSourcePanels).slice(0);

        /**
         *
         */
        this.activeDataSourcePanel = undefined;

        /**
         * Gets or sets whether this panel is visible.  This property is observable.
         *
         * @type Boolean
         */
        this.visible = false;

        /**
         *
         */
        this.error = '';

        knockout.track(this, ['dataSourcePanels', 'activeDataSourcePanel', 'visible', 'error']);

        this._finishCommand = createCommand(function() {
            that.error = '';
            finishing(true);
            when(that.activeDataSourcePanel.finish(that._dataSourceBrowserViewModel.dataSources), function(result) {
                finishing(false);
                if (result) {
                    that.activeDataSourcePanel.activeDataSourcePanel = undefined;
                    that.visible = false;
                }
            }, function (err) {
                that.error = err;
                finishing(false);
            });
        }, knockout.computed(function() {
            return !finishing() && defined(that.activeDataSourcePanel);
        }));
    };

    defineProperties(DataSourcePanelViewModel.prototype, {
        /**
         * Gets the Command that is executed when the finish button is clicked.
         * @memberof DataSourcePanelViewModel.prototype
         *
         * @type {Command}
         */
        finishCommand : {
            get : function() {
                return this._finishCommand;
            }
        }
    });

    /**
     *
     */
    DataSourcePanelViewModel.defaultDataSourcePanels = [new CzmlDataSourcePanel(), new GeoJsonDataSourcePanel()];

    return DataSourcePanelViewModel;
});