/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../createCommand',
        './CzmlDataSourcePanel',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        createCommand,
        CzmlDataSourcePanel,
        knockout) {
    "use strict";

    var DataSourcePanelViewModel = function(dataSourceBrowserViewModel, dataSourcePanels) {
        var that = this;

        this._dataSourceBrowserViewModel = dataSourceBrowserViewModel;

        var finishing = knockout.observable();

        this._finishCommand = createCommand(function() {
            that.activeDataSourcePanel.finish();
        }, knockout.computed(function() {
            return !finishing() && defined(that.activeDataSourcePanel);
        }));

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