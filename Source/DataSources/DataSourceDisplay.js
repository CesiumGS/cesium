define([
        './DataSourceDisplayWithoutVisualizers',
        './createCesiumVisualizers'
    ], function(
        DataSourceDisplay,
        createCesiumVisualizers) {
    'use strict';
    DataSourceDisplay.defaultVisualizersCallback = createCesiumVisualizers;
    return DataSourceDisplay;
});
