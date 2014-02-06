/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        './MaterialProperty',
        '../Scene/Material',
        '../Scene/PolylineCollection'
       ], function(
         DeveloperError,
         defined,
         destroyObject,
         Cartesian3,
         MaterialProperty,
         Material,
         PolylineCollection) {
    "use strict";

    /**
     * A DynamicObject visualizer which maps the DynamicPolyline instance
     * in DynamicObject.polyline to a Polyline primitive.
     * @alias DynamicPolylineVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPolyline
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
     * @see DynamicPolygonVisualizer
     * @see DynamicPyramidVisualizer
     *
     */
    var DynamicPolylineVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        var polylineCollection = this._polylineCollection = new PolylineCollection();
        scene.getPrimitives().add(polylineCollection);
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPolylineVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPolylineVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPolylineVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPolylineVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicPolylineVisualizer.prototype.update = function(time) {
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
    DynamicPolylineVisualizer.prototype.removeAllPrimitives = function() {
        var i;
        this._polylineCollection.removeAll();

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._polylineVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPolylineVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPolylineVisualizer#destroy
     */
    DynamicPolylineVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPolylineVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolylineVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolylineVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        this._scene.getPrimitives().remove(this._polylineCollection);
        return destroyObject(this);
    };

    var cachedPosition = new Cartesian3();
    function updateObject(dynamicPolylineVisualizer, time, dynamicObject) {
        var dynamicPolyline = dynamicObject._polyline;
        if (!defined(dynamicPolyline)) {
            return;
        }

        var polyline;
        var showProperty = dynamicPolyline._show;
        var ellipseProperty = dynamicObject._ellipse;
        var positionProperty = dynamicObject._position;
        var vertexPositionsProperty = dynamicObject._vertexPositions;
        var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));
        var context = dynamicPolylineVisualizer._scene.getContext();

        if (!show || //
           (!defined(vertexPositionsProperty) && //
           (!defined(ellipseProperty) || !defined(positionProperty)))) {
            //Remove the existing primitive if we have one
            if (defined(polylineVisualizerIndex)) {
                polyline = dynamicPolylineVisualizer._polylineCollection.get(polylineVisualizerIndex);
                polyline.setShow(false);
                dynamicObject._polylineVisualizerIndex = undefined;
                dynamicPolylineVisualizer._unusedIndexes.push(polylineVisualizerIndex);
            }
            return;
        }

        if (!defined(polylineVisualizerIndex)) {
            var unusedIndexes = dynamicPolylineVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                polylineVisualizerIndex = unusedIndexes.pop();
                polyline = dynamicPolylineVisualizer._polylineCollection.get(polylineVisualizerIndex);
            } else {
                polylineVisualizerIndex = dynamicPolylineVisualizer._polylineCollection.getLength();
                polyline = dynamicPolylineVisualizer._polylineCollection.add();
            }
            dynamicObject._polylineVisualizerIndex = polylineVisualizerIndex;
            polyline.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polyline.setWidth(1);
            var material = polyline.getMaterial();
            if (!defined(material) || (material.type !== Material.PolylineOutlineType)) {
                material = Material.fromType(Material.PolylineOutlineType);
                polyline.setMaterial(material);
            }
        } else {
            polyline = dynamicPolylineVisualizer._polylineCollection.get(polylineVisualizerIndex);
        }

        polyline.setShow(true);

        var vertexPositions;
        if (defined(ellipseProperty)) {
            vertexPositions = ellipseProperty.getValue(time, positionProperty.getValue(time, cachedPosition));
        } else {
            vertexPositions = vertexPositionsProperty.getValue(time);
        }

        if (defined(vertexPositions) && polyline._visualizerPositions !== vertexPositions) {
            polyline.setPositions(vertexPositions);
            polyline._visualizerPositions = vertexPositions;
        }

        var property = dynamicPolyline._material;
        if (defined(property)) {
            polyline.setMaterial(MaterialProperty.getValue(time, property, polyline.getMaterial()));
        }

        property = dynamicPolyline._width;
        if (defined(property)) {
            var width = property.getValue(time);
            if (defined(width)) {
                polyline.setWidth(width);
            }
        }
    }

    DynamicPolylineVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisPolylineCollection = this._polylineCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var polylineVisualizerIndex = dynamicObject._polylineVisualizerIndex;
            if (defined(polylineVisualizerIndex)) {
                var polyline = thisPolylineCollection.get(polylineVisualizerIndex);
                polyline.setShow(false);
                thisUnusedIndexes.push(polylineVisualizerIndex);
                dynamicObject._polylineVisualizerIndex = undefined;
            }
        }
    };

    return DynamicPolylineVisualizer;
});
