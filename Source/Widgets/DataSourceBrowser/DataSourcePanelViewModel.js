/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../createCommand',
        './CzmlDataSourcePanel',
        './GeoJsonDataSourcePanel',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
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
         * Gets or sets the set of data source panels that can be shown.  This property is observable.
         *
         * @type Array
         */
        this.dataSourcePanels = defaultValue(dataSourcePanels, DataSourcePanelViewModel.defaultDataSourcePanels).slice(0);

        /**
         * Gets or sets the active data source panel that is currently shown.  This property is observable.
         */
        this.activeDataSourcePanel = undefined;

        /**
         * Gets or sets whether this panel is visible.  This property is observable.
         *
         * @type Boolean
         */
        this.visible = false;

        /**
         * Gets or sets the error message that is currently shown.  This property is observable.
         *
         * @type String
         */
        this.error = '';

        knockout.track(this, ['dataSourcePanels', 'activeDataSourcePanel', 'visible', 'error']);

        this._finishCommand = createCommand(function() {
            that.error = '';
            finishing(true);
            when(that.activeDataSourcePanel.finish(that._dataSourceBrowserViewModel.dataSources), function(result) {
                finishing(false);
                if (result) {
                    that.activeDataSourcePanel = undefined;
                    that.visible = false;
                }
            }, function(err) {
                that.error = err;
                finishing(false);
            });
        }, knockout.computed(function() {
            return !finishing() && defined(that.activeDataSourcePanel);
        }));

        this._activeDataSourcePanelSubscription = knockout.getObservable(this, 'activeDataSourcePanel').subscribe(function(value) {
            if (defined(value)) {
                value.viewModel.reset();
            }
        });
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
     * @memberof DataSourcePanelViewModel
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    DataSourcePanelViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     * @memberof DataSourcePanelViewModel
     */
    DataSourcePanelViewModel.prototype.destroy = function() {
        this._activeDataSourcePanelSubscription.dispose();
        destroyObject(this);
    };

    /**
     * The default set of data source panels that can be shown.
     *
     * @type Array
     */
    DataSourcePanelViewModel.defaultDataSourcePanels = [new CzmlDataSourcePanel(), new GeoJsonDataSourcePanel()];

    return DataSourcePanelViewModel;
});