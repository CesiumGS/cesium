/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        createCommand,
        knockout) {
    "use strict";

    var DataSourceConfigurationPanelViewModel = function(dataSourceBrowserViewModel) {
        var that = this;

        this._dataSourceBrowserViewModel = dataSourceBrowserViewModel;

        /**
         * Gets or sets the active data source configuration panel that is currently shown.  This property is observable.
         */
        this.activeDataSourceConfigurationPanel = undefined;

        /**
         * Gets or sets whether this panel is visible.  This property is observable.
         *
         * @type Boolean
         */
        this.visible = false;

        knockout.track(this, ['activeDataSourceConfigurationPanel', 'visible']);

        this._doneCommand = createCommand(function() {
            that.visible = false;
        });
    };

    defineProperties(DataSourceConfigurationPanelViewModel.prototype, {
        /**
         * Gets the Command that is executed when the done button is clicked.
         * @memberof DataSourceConfigurationPanelViewModel.prototype
         *
         * @type {Command}
         */
        doneCommand : {
            get : function() {
                return this._doneCommand;
            }
        },

        /**
         * Gets the DataSourceBrowserViewModel.
         * @memberof DataSourceConfigurationPanelViewModel.prototype
         *
         * @type {DataSourceBrowserViewModel}
         */
        dataSourceBrowserViewModel : {
            get : function() {
                return this._dataSourceBrowserViewModel;
            }
        }
    });

    /**
     * @memberof DataSourceConfigurationPanelViewModel
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    DataSourceConfigurationPanelViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     * @memberof DataSourceConfigurationPanelViewModel
     */
    DataSourceConfigurationPanelViewModel.prototype.destroy = function() {
        destroyObject(this);
    };

    return DataSourceConfigurationPanelViewModel;
});