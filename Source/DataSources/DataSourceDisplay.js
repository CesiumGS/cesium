/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EventHelper',
        './BillboardVisualizer',
        './BoxGeometryUpdater',
        './CorridorGeometryUpdater',
        './CustomDataSource',
        './CylinderGeometryUpdater',
        './EllipseGeometryUpdater',
        './EllipsoidGeometryUpdater',
        './GeometryVisualizer',
        './LabelVisualizer',
        './ModelVisualizer',
        './PathVisualizer',
        './PointVisualizer',
        './PolygonGeometryUpdater',
        './PolylineGeometryUpdater',
        './PolylineVolumeGeometryUpdater',
        './RectangleGeometryUpdater',
        './WallGeometryUpdater'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        destroyObject,
        DeveloperError,
        EventHelper,
        BillboardVisualizer,
        BoxGeometryUpdater,
        CorridorGeometryUpdater,
        CustomDataSource,
        CylinderGeometryUpdater,
        EllipseGeometryUpdater,
        EllipsoidGeometryUpdater,
        GeometryVisualizer,
        LabelVisualizer,
        ModelVisualizer,
        PathVisualizer,
        PointVisualizer,
        PolygonGeometryUpdater,
        PolylineGeometryUpdater,
        PolylineVolumeGeometryUpdater,
        RectangleGeometryUpdater,
        WallGeometryUpdater) {
    "use strict";

    /**
     * Visualizes a collection of {@link DataSource} instances.
     * @alias DataSourceDisplay
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Scene} options.scene The scene in which to display the data.
     * @param {DataSourceCollection} options.dataSourceCollection The data sources to display.
     * @param {DataSourceDisplay~VisualizersCallback} [options.visualizersCallback=DataSourceDisplay.defaultVisualizersCallback]
     *        A function which creates an array of visualizers used for visualization.
     *        If undefined, all standard visualizers are used.
     */
    var DataSourceDisplay = function(options) {
        var scene = options.scene;
        var dataSourceCollection = options.dataSourceCollection;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }
        if (!defined(options.scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(options.dataSourceCollection)) {
            throw new DeveloperError('dataSourceCollection is required.');
        }
        //>>includeEnd('debug');

        this._eventHelper = new EventHelper();
        this._eventHelper.add(dataSourceCollection.dataSourceAdded, this._onDataSourceAdded, this);
        this._eventHelper.add(dataSourceCollection.dataSourceRemoved, this._onDataSourceRemoved, this);

        this._dataSourceCollection = dataSourceCollection;
        this._scene = scene;
        this._visualizersCallback = defaultValue(options.visualizersCallback, DataSourceDisplay.defaultVisualizersCallback);

        for (var i = 0, len = dataSourceCollection.length; i < len; i++) {
            this._onDataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
        }

        var defaultDataSource = new CustomDataSource();
        var visualizers = this._visualizersCallback(this._scene, defaultDataSource);
        defaultDataSource._visualizers = visualizers;
        this._onDataSourceAdded(undefined, defaultDataSource);
        this._defaultDataSource = defaultDataSource;
    };

    /**
     * Gets or sets the default function which creates an array of visualizers used for visualization.
     * By default, this function uses all standard visualizers.
     *
     * @member
     * @type {DataSourceDisplay~VisualizersCallback}
     */
    DataSourceDisplay.defaultVisualizersCallback = function(scene, dataSource) {
        var entities = dataSource.entities;
        return [new BillboardVisualizer(scene, entities),
                new GeometryVisualizer(BoxGeometryUpdater, scene, entities),
                new GeometryVisualizer(CylinderGeometryUpdater, scene, entities),
                new GeometryVisualizer(CorridorGeometryUpdater, scene, entities),
                new GeometryVisualizer(EllipseGeometryUpdater, scene, entities),
                new GeometryVisualizer(EllipsoidGeometryUpdater, scene, entities),
                new GeometryVisualizer(PolygonGeometryUpdater, scene, entities),
                new GeometryVisualizer(PolylineGeometryUpdater, scene, entities),
                new GeometryVisualizer(PolylineVolumeGeometryUpdater, scene, entities),
                new GeometryVisualizer(RectangleGeometryUpdater, scene, entities),
                new GeometryVisualizer(WallGeometryUpdater, scene, entities),
                new LabelVisualizer(scene, entities),
                new ModelVisualizer(scene, entities),
                new PointVisualizer(scene, entities),
                new PathVisualizer(scene, entities)];
    };

    defineProperties(DataSourceDisplay.prototype, {
        /**
         * Gets the scene associated with this display.
         * @memberof DataSourceDisplay.prototype
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },
        /**
         * Gets the collection of data sources to display.
         * @memberof DataSourceDisplay.prototype
         * @type {DataSourceCollection}
         */
        dataSources : {
            get : function() {
                return this._dataSourceCollection;
            }
        },
        /**
         * Gets the default data source instance which can be used to
         * manually create and visualize entities not tied to
         * a specific data source. This instance is always available
         * and does not appear in the list dataSources collection.
         * @memberof DataSourceDisplay.prototype
         * @type {CustomDataSource}
         */
        defaultDataSource : {
            get : function() {
                return this._defaultDataSource;
            }
        }
    });

    /**
     * Gets the scene being used for display.
     * @deprecated
     * @returns {Scene} The scene.
     */
    DataSourceDisplay.prototype.getScene = function() {
        deprecationWarning('DataSourceDisplay.getScene', 'DataSourceDisplay.getScene was deprecated on Cesium 1.5 and will be removed in Cesium 1.7, used the DataSourceDisplay.scene property instead.');
        return this.scene;
    };

    /**
     * Gets the collection of data sources to be displayed.
     * @deprecated
     * @returns {DataSourceCollection} The collection of data sources.
     */
    DataSourceDisplay.prototype.getDataSources = function() {
        deprecationWarning('DataSourceDisplay.getDataSources', 'DataSourceDisplay.getDataSources was deprecated on Cesium 1.5 and will be removed in Cesium 1.7, used the DataSourceDisplay.dataSources property instead.');
        return this.dataSources;
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
        this._onDataSourceRemoved(undefined, this._defaultDataSource);

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

        visualizers = this._defaultDataSource._visualizers;
        vLength = visualizers.length;
        for (x = 0; x < vLength; x++) {
            result = visualizers[x].update(time) && result;
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

    /**
     * A function which creates an array of visualizers used for visualization.
     * @callback DataSourceDisplay~VisualizersCallback
     *
     * @param {Scene} scene The scene to create visualizers for.
     * @param {DataSource} dataSource The data source to create visualizers for.
     * @returns {Visualizer[]} An array of visualizers used for visualization.
     *
     * @example
     * function createVisualizers(scene, dataSource) {
     *     return [new BillboardVisualizer(scene, dataSource.entities)];
     * }
     */

    return DataSourceDisplay;
});
