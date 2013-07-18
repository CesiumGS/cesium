/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../createCommand',
        './CzmlDataSourcePanel',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        createCommand,
        CzmlDataSourcePanel,
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

        knockout.track(this, ['visible', 'dataSourcePanels', 'activeDataSourcePanel']);

        this._finishCommand = createCommand(function() {
            finishing(true);
            when(that.activeDataSourcePanel.finish(that._dataSourceBrowserViewModel.dataSources), function(result) {
                finishing(false);
                if (result) {
                    that.activeDataSourcePanel.activeDataSourcePanel = undefined;
                    that.visible = false;
                }
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
    DataSourcePanelViewModel.defaultDataSourcePanels = [new CzmlDataSourcePanel()];

    return DataSourcePanelViewModel;
});