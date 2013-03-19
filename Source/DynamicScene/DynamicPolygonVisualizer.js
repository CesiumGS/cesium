/*global define*/
define(['../Core/Cartesian3',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Scene/Polygon',
        '../Scene/Material'
       ], function(
         Cartesian3,
         DeveloperError,
         destroyObject,
         Polygon,
         Material) {
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
     * @exception {DeveloperError} scene is required.
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
     *
     */
    var DynamicPolygonVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
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
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPolygonVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPolygonVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicPolygonVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }
        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                this._updateObject(time, dynamicObjects[i]);
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

        if (typeof this._dynamicObjectCollection !== 'undefined') {
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
     * @return {Boolean} True if this object was destroyed; otherwise, false.
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
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolygonVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolygonVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    DynamicPolygonVisualizer.prototype._updateObject = function(time, dynamicObject) {
        var dynamicPolygon = dynamicObject.polygon;
        if (typeof dynamicPolygon === 'undefined') {
            return;
        }

        var polygon;
        var showProperty = dynamicPolygon.show;
        var ellipseProperty = dynamicObject.ellipse;
        var positionProperty = dynamicObject.position;
        var vertexPositionsProperty = dynamicObject.vertexPositions;
        var polygonVisualizerIndex = dynamicObject._polygonVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (typeof showProperty === 'undefined' || showProperty.getValue(time));
        var hasVertexPostions = typeof vertexPositionsProperty !== 'undefined';
        if (!show || //
           (!hasVertexPostions && //
           (typeof ellipseProperty === 'undefined' || typeof positionProperty === 'undefined'))) {
            //Remove the existing primitive if we have one
            if (typeof polygonVisualizerIndex !== 'undefined') {
                polygon = this._polygonCollection[polygonVisualizerIndex];
                polygon.show = false;
                dynamicObject._polygonVisualizerIndex = undefined;
                this._unusedIndexes.push(polygonVisualizerIndex);
            }
            return;
        }

        var context = this._scene.getContext();
        if (typeof polygonVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                polygonVisualizerIndex = unusedIndexes.pop();
                polygon = this._polygonCollection[polygonVisualizerIndex];
            } else {
                polygonVisualizerIndex = this._polygonCollection.length;
                polygon = new Polygon();
                this._polygonCollection.push(polygon);
                this._primitives.add(polygon);
            }
            dynamicObject._polygonVisualizerIndex = polygonVisualizerIndex;
            polygon.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polygon.material = Material.fromType(context, Material.ColorType);
        } else {
            polygon = this._polygonCollection[polygonVisualizerIndex];
        }

        polygon.show = true;

        var vertexPositions;
        if (hasVertexPostions) {
            vertexPositions = vertexPositionsProperty.getValueCartesian(time);
        } else {
            vertexPositions = ellipseProperty.getValue(time, positionProperty.getValueCartesian(time, cachedPosition));
        }

        if (polygon._visualizerPositions !== vertexPositions && //
            typeof vertexPositions !== 'undefined' && //
            vertexPositions.length > 3) {
            polygon.setPositions(vertexPositions);
            polygon._visualizerPositions = vertexPositions;
        }

        var material = dynamicPolygon.material;
        if (typeof material !== 'undefined') {
            polygon.material = material.getValue(time, context, polygon.material);
        }
    };

    DynamicPolygonVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        var thisPolygonCollection = this._polygonCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polygonVisualizerIndex = dynamicObject._polygonVisualizerIndex;
            if (typeof polygonVisualizerIndex !== 'undefined') {
                var polygon = thisPolygonCollection[polygonVisualizerIndex];
                polygon.show = false;
                thisUnusedIndexes.push(polygonVisualizerIndex);
                dynamicObject._polygonVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPolygonVisualizer;
});