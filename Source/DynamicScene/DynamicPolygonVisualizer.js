/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Scene/Polygon',
        '../Scene/Material',
        './MaterialProperty'
       ], function(
         Cartesian3,
         defined,
         DeveloperError,
         destroyObject,
         Polygon,
         Material,
         MaterialProperty) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPolygon instance
     * in DynamicObject.polygon to a Polygon primitive.
     * @alias DynamicPolygonVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicPolygon
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolylineVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicPolygonVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._polygonCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPolygonVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPolygonVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPolygonVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPolygonVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPolygonVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicPolygonVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicPolygonVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._polygonCollection.length; i < len; i++) {
            this._primitives.remove(this._polygonCollection[i]);
        }

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._polygonVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._polygonCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPolygonVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPolygonVisualizer#destroy
     */
    DynamicPolygonVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPolygonVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolygonVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolygonVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    function updateObject(dynamicPolygonVisualizer, time, dynamicObject) {
        var dynamicPolygon = dynamicObject._polygon;
        if (!defined(dynamicPolygon)) {
            return;
        }

        var polygon;
        var showProperty = dynamicPolygon._show;
        var ellipseProperty = dynamicObject._ellipse;
        var positionProperty = dynamicObject._position;
        var vertexPositionsProperty = dynamicObject._vertexPositions;
        var polygonVisualizerIndex = dynamicObject._polygonVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));
        var hasVertexPostions = defined(vertexPositionsProperty);
        if (!show || //
           (!hasVertexPostions && //
           (!defined(ellipseProperty) || !defined(positionProperty)))) {
            //Remove the existing primitive if we have one
            if (defined(polygonVisualizerIndex)) {
                polygon = dynamicPolygonVisualizer._polygonCollection[polygonVisualizerIndex];
                polygon.show = false;
                dynamicObject._polygonVisualizerIndex = undefined;
                dynamicPolygonVisualizer._unusedIndexes.push(polygonVisualizerIndex);
            }
            return;
        }

        if (!defined(polygonVisualizerIndex)) {
            var unusedIndexes = dynamicPolygonVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                polygonVisualizerIndex = unusedIndexes.pop();
                polygon = dynamicPolygonVisualizer._polygonCollection[polygonVisualizerIndex];
            } else {
                polygonVisualizerIndex = dynamicPolygonVisualizer._polygonCollection.length;
                polygon = new Polygon();
                polygon.asynchronous = false;
                dynamicPolygonVisualizer._polygonCollection.push(polygon);
                dynamicPolygonVisualizer._primitives.add(polygon);
            }
            dynamicObject._polygonVisualizerIndex = polygonVisualizerIndex;
            polygon.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polygon.material = Material.fromType(Material.ColorType);
        } else {
            polygon = dynamicPolygonVisualizer._polygonCollection[polygonVisualizerIndex];
        }

        polygon.show = true;

        var vertexPositions;
        if (hasVertexPostions) {
            vertexPositions = vertexPositionsProperty.getValue(time);
        } else {
            vertexPositions = ellipseProperty.getValue(time, positionProperty.getValue(time, cachedPosition));
        }

        if (polygon._visualizerPositions !== vertexPositions && //
            defined(vertexPositions) && //
            vertexPositions.length > 3) {
            polygon.setPositions(vertexPositions);
            polygon._visualizerPositions = vertexPositions;
        }

        polygon.material = MaterialProperty.getValue(time, dynamicPolygon._material, polygon.material);
    }

    DynamicPolygonVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPolygonCollection = this._polygonCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polygonVisualizerIndex = dynamicObject._polygonVisualizerIndex;
            if (defined(polygonVisualizerIndex)) {
                var polygon = thisPolygonCollection[polygonVisualizerIndex];
                polygon.show = false;
                thisUnusedIndexes.push(polygonVisualizerIndex);
                dynamicObject._polygonVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPolygonVisualizer;
});