/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EventHelper',
        './DynamicBillboardVisualizer',
        './DynamicConeVisualizerUsingCustomSensor',
        './DynamicLabelVisualizer',
        './DynamicModelVisualizer',
        './DynamicPathVisualizer',
        './DynamicPointVisualizer',
        './DynamicPyramidVisualizer',
        './DynamicVectorVisualizer',
        './EllipseGeometryUpdater',
        './EllipsoidGeometryUpdater',
        './GeometryVisualizer',
        './PolygonGeometryUpdater',
        './PolylineGeometryUpdater',
        './RectangleGeometryUpdater',
        './WallGeometryUpdater'
    ], function(
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        EventHelper,
        DynamicBillboardVisualizer,
        DynamicConeVisualizerUsingCustomSensor,
        DynamicLabelVisualizer,
        DynamicModelVisualizer,
        DynamicPathVisualizer,
        DynamicPointVisualizer,
        DynamicPyramidVisualizer,
        DynamicVectorVisualizer,
        EllipseGeometryUpdater,
        EllipsoidGeometryUpdater,
        GeometryVisualizer,
        PolygonGeometryUpdater,
        PolylineGeometryUpdater,
        RectangleGeometryUpdater,
        WallGeometryUpdater) {
    "use strict";

    /**
     * Visualizes a collection of {@link DataSource} instances.
     * @alias DataSourceDisplay
     * @constructor
     *
     * @param {Scene} scene The scene in which to display the data.
     * @param {DataSourceCollection} dataSourceCollection The data sources to display.
     * @param {Function} [visualizersCallback=DataSourceDisplay.defaultVisualizersCallback] A function
     *        which takes a scene and dataSource and returns the array of visualizers used for visualization.
     *        If undefined, all standard visualizers are used.
     */
    var DataSourceDisplay = function(scene, dataSourceCollection, visualizersCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(dataSourceCollection)) {
            throw new DeveloperError('dataSourceCollection is required.');
        }
        //>>includeEnd('debug');

        this._eventHelper = new EventHelper();
        this._eventHelper.add(dataSourceCollection.dataSourceAdded, this._onDataSourceAdded, this);
        this._eventHelper.add(dataSourceCollection.dataSourceRemoved, this._onDataSourceRemoved, this);

        this._dataSourceCollection = dataSourceCollection;
        this._scene = scene;
        this._visualizersCallback = defaultValue(visualizersCallback, DataSourceDisplay.defaultVisualizersCallback);

        for (var i = 0, len = dataSourceCollection.length; i < len; i++) {
            this._onDataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
        }
    };

    /**
     * Gets or sets the default function which takes a scene and dataSource and returns the
     * array of visualizers used for visualization.  By default, this function uses all standard visualizers.
     *
     * @type {Function}
     */
    DataSourceDisplay.defaultVisualizersCallback = function(scene, dataSource) {
        var dynamicObjects = dataSource.dynamicObjects;
        return [new DynamicBillboardVisualizer(scene, dynamicObjects),
                new GeometryVisualizer(EllipseGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(EllipsoidGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(PolygonGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(RectangleGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(WallGeometryUpdater, scene, dynamicObjects),
                new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjects),
                new DynamicLabelVisualizer(scene, dynamicObjects),
                new DynamicModelVisualizer(scene, dynamicObjects),
                new DynamicPointVisualizer(scene, dynamicObjects),
                new DynamicVectorVisualizer(scene, dynamicObjects),
                new DynamicPyramidVisualizer(scene, dynamicObjects),
                new DynamicPathVisualizer(scene, dynamicObjects)];
    };

    /**
     * Gets the scene being used for display.
     *
     * @returns {Scene} The scene.
     */
    DataSourceDisplay.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the collection of data sources to be displayed.
     *
     * @returns {DataSourceCollection} The collection of data sources.
     */
    DataSourceDisplay.prototype.getDataSources = function() {
        return this._dataSourceCollection;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DataSourceDisplay#destroy
     */
    DataSourceDisplay.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DataSourceDisplay#isDestroyed
     *
     * @example
     * dataSourceDisplay = dataSourceDisplay.destroy();
     */
    DataSourceDisplay.prototype.destroy = function() {
        this._eventHelper.removeAll();

        var dataSourceCollection = this._dataSourceCollection;
        for (var i = 0, length = dataSourceCollection.length; i < length; ++i) {
            this._onDataSourceRemoved(this._dataSourceCollection, dataSourceCollection.get(i));
        }

        return destroyObject(this);
    };

    /**
     * Updates the display to the provided time.
     *
     * @param {JulianDate} time The simulation time.
     * @returns {Boolean} True if all data sources are ready to be displayed, false otherwise.
     */
    DataSourceDisplay.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var result = true;

        var i;
        var x;
        var visualizers;
        var vLength;
        var dataSources = this._dataSourceCollection;
        var length = dataSources.length;
        for (i = 0; i < length; i++) {
            var dataSource = dataSources.get(i);
            if (defined(dataSource.update)) {
                result = dataSource.update(time) && result;
            }

            visualizers = dataSource._visualizers;
            vLength = visualizers.length;
            for (x = 0; x < vLength; x++) {
                result = visualizers[x].update(time) && result;
            }
        }
        return result;
    };

    DataSourceDisplay.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var visualizers = this._visualizersCallback(this._scene, dataSource);
        dataSource._visualizers = visualizers;
    };

    DataSourceDisplay.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        var visualizers = dataSource._visualizers;
        var length = visualizers.length;
        for (var i = 0; i < length; i++) {
            visualizers[i].destroy();
            dataSource._visualizers = undefined;
        }
    };

    return DataSourceDisplay;
});
