/*global define*/
define(['../Core/defaultValue',
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
        './PolylineGeometryUpdater'
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
        PolylineGeometryUpdater) {
    "use strict";

    var createDefaultVisualizers = function(scene, dataSource) {
        var dynamicObjects = dataSource.getDynamicObjectCollection();
        return [new DynamicBillboardVisualizer(scene, dynamicObjects),
                new GeometryVisualizer(EllipseGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(EllipsoidGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(PolygonGeometryUpdater, scene, dynamicObjects),
                new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjects),
                new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjects),
                new DynamicLabelVisualizer(scene, dynamicObjects),
                new DynamicModelVisualizer(scene, dynamicObjects),
                new DynamicPointVisualizer(scene, dynamicObjects),
                new DynamicVectorVisualizer(scene, dynamicObjects),
                new DynamicPyramidVisualizer(scene, dynamicObjects),
                new DynamicPathVisualizer(scene, dynamicObjects)];
    };

    /**
     * Visualizes a collection of {@link DataSource} instances.
     * @alias DataSourceDisplay
     * @constructor
     *
     * @param {Scene} scene The scene in which to display the data.
     * @param {DataSourceCollection} dataSourceCollection The data sources to display.
     * @param {Visualizer[]} [visualizersCallback] A function which takes a scene and dataSource and returns the array of visualizers used for visualization.  If left undefined, all standard visualizers are used.
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
        this._timeVaryingSources = [];
        this._staticSourcesToUpdate = [];
        this._visualizersCallback = defaultValue(visualizersCallback, createDefaultVisualizers);

        for (var i = 0, len = dataSourceCollection.length; i < len; i++) {
            this._onDataSourceAdded(dataSourceCollection, dataSourceCollection.get(i));
        }
    };

    /**
     * Gets the scene being used for display.
     * @returns {Scene} The scene.
     */
    DataSourceDisplay.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the collection of data sources to be displayed.
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
     * Updates time-varying data sources to the provided time and also
     * updates static data sources that have changed since the last
     * call to update.
     *
     * @param {JulianDate} time The simulation time.
     */
    DataSourceDisplay.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var i;
        var x;
        var visualizers;
        var vLength;

        var timeVaryingSources = this._timeVaryingSources;
        var length = timeVaryingSources.length;
        for (i = 0; i < length; i++) {
            visualizers = timeVaryingSources[i]._visualizers;
            vLength = visualizers.length;
            for (x = 0; x < vLength; x++) {
                visualizers[x].update(time);
            }
        }

        var staticSourcesToUpdate = this._staticSourcesToUpdate;
        length = staticSourcesToUpdate.length;
        for (i = 0; i < length; i++) {
            visualizers = staticSourcesToUpdate[i]._visualizers;
            vLength = visualizers.length;
            for (x = 0; x < vLength; x++) {
                visualizers[x].update(time);
            }
        }
        staticSourcesToUpdate.length = 0;
    };

    DataSourceDisplay.prototype._onDataSourceAdded = function(dataSourceCollection, dataSource) {
        var visualizers = this._visualizersCallback(this._scene, dataSource);
        dataSource._visualizers = visualizers;
        dataSource.getChangedEvent().addEventListener(this._onDataSourceChanged, this);
        this._onDataSourceChanged(dataSource);
    };

    DataSourceDisplay.prototype._onDataSourceRemoved = function(dataSourceCollection, dataSource) {
        dataSource.getChangedEvent().removeEventListener(this._onDataSourceChanged, this);

        var timeVaryingIndex = this._timeVaryingSources.indexOf(dataSource);
        if (timeVaryingIndex !== -1) {
            this._timeVaryingSources.splice(timeVaryingIndex, 1);
        }

        var staticIndex = this._staticSourcesToUpdate.indexOf(dataSource);
        if (staticIndex !== -1) {
            this._staticSourcesToUpdate.splice(staticIndex, 1);
        }

        var visualizers = dataSource._visualizers;
        var length = visualizers.length;
        for (var i = 0; i < length; i++) {
            visualizers[i].destroy();
            dataSource._visualizers = undefined;
        }
    };

    DataSourceDisplay.prototype._onDataSourceChanged = function(dataSource) {
        var timeVaryingIndex = this._timeVaryingSources.indexOf(dataSource);
        var staticIndex = this._staticSourcesToUpdate.indexOf(dataSource);
        if (dataSource.getIsTimeVarying()) {
            if (timeVaryingIndex === -1) {
                this._timeVaryingSources.push(dataSource);
            }
            if (staticIndex !== -1) {
                this._staticSourcesToUpdate.splice(staticIndex, 1);
            }
        } else {
            if (staticIndex === -1) {
                this._staticSourcesToUpdate.push(dataSource);
            }
            if (timeVaryingIndex !== -1) {
                this._timeVaryingSources.splice(staticIndex, 1);
            }
        }
    };

    return DataSourceDisplay;
});
