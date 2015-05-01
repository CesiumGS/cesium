/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EventHelper',
        './BillboardVisualizer',
        './BoundingSphereState',
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
        BoundingSphere,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EventHelper,
        BillboardVisualizer,
        BoundingSphereState,
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

        var scene = options.scene;
        var dataSourceCollection = options.dataSourceCollection;

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

    var getBoundingSphereArrayScratch = [];
    var getBoundingSphereBoundingSphereScratch = new BoundingSphere();

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     *
     * @param {Entity} entity The entity whose bounding sphere to compute.
     * @param {Boolean} allowPartial If true, pending bounding spheres are ignored and an answer will be returned from the currently available data.
     *                               If false, the the function will halt and return pending if any of the bounding spheres are pending.
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */
    DataSourceDisplay.prototype.getBoundingSphere = function(entity, allowPartial, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(allowPartial)) {
            throw new DeveloperError('allowPartial is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var i;
        var length;
        var dataSource = this._defaultDataSource;
        if (!dataSource.entities.contains(entity)) {
            dataSource = undefined;

            var dataSources = this._dataSourceCollection;
            length = dataSources.length;
            for (i = 0; i < length; i++) {
                var d = dataSources.get(i);
                if (d.entities.contains(entity)) {
                    dataSource = d;
                    break;
                }
            }
        }

        if (!defined(dataSource)) {
            return BoundingSphereState.FAILED;
        }

        var boundingSpheres = getBoundingSphereArrayScratch;
        var tmp = getBoundingSphereBoundingSphereScratch;

        var count = 0;
        var resultState;
        var state = BoundingSphereState.DONE;
        var visualizers = dataSource._visualizers;
        var visualizersLength = visualizers.length;

        for (i = 0; i < visualizersLength; i++) {
            var visualizer = visualizers[i];
            if (defined(visualizer.getBoundingSphere)) {
                state = visualizers[i].getBoundingSphere(entity, tmp);
                if (!allowPartial && state === BoundingSphereState.PENDING) {
                    return BoundingSphereState.PENDING;
                } else if (state === BoundingSphereState.DONE) {
                    boundingSpheres[count] = BoundingSphere.clone(tmp, boundingSpheres[count]);
                    count++;
                }
            }
        }

        if (count === 0) {
            return BoundingSphereState.FAILED;
        }

        boundingSpheres.length = count;
        BoundingSphere.fromBoundingSpheres(boundingSpheres, result);
        return BoundingSphereState.DONE;
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
