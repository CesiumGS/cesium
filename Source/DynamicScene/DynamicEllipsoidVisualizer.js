/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Scene/EllipsoidPrimitive',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        destroyObject,
        Cartesian3,
        Matrix3,
        Matrix4,
        Quaternion,
        EllipsoidPrimitive,
        Material,
        MaterialProperty) {
    "use strict";

    var matrix3Scratch = new Matrix3();

    /**
     * A DynamicObject visualizer which maps the DynamicEllipsoid instance
     * in DynamicObject.ellipsoid to a Ellipsoid primitive.
     * @alias DynamicEllipsoidVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicEllipsoid
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
     * @see DynamicPolylineVisualizer
     */
    var DynamicEllipsoidVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._unusedIndexes = [];
        this._primitives = scene.getPrimitives();
        this._ellipsoidCollection = [];
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicEllipsoidVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicEllipsoidVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicEllipsoidVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicEllipsoidVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicEllipsoidVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicEllipsoidVisualizer.prototype.update = function(time) {
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
    DynamicEllipsoidVisualizer.prototype.removeAllPrimitives = function() {
        var i, len;
        for (i = 0, len = this._ellipsoidCollection.length; i < len; i++) {
            this._primitives.remove(this._ellipsoidCollection[i]);
        }

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._ellipsoidVisualizerIndex = undefined;
            }
        }

        this._unusedIndexes = [];
        this._ellipsoidCollection = [];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicEllipsoidVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicEllipsoidVisualizer#destroy
     */
    DynamicEllipsoidVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicEllipsoidVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicEllipsoidVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicEllipsoidVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        return destroyObject(this);
    };

    var position;
    var orientation;
    function updateObject(dynamicEllipsoidVisualizer, time, dynamicObject) {
        var dynamicEllipsoid = dynamicObject._ellipsoid;
        if (!defined(dynamicEllipsoid)) {
            return;
        }

        var radiiProperty = dynamicEllipsoid._radii;
        if (!defined(radiiProperty)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var orientationProperty = dynamicObject._orientation;
        if (!defined(orientationProperty)) {
            return;
        }

        var ellipsoid;
        var showProperty = dynamicEllipsoid._show;
        var ellipsoidVisualizerIndex = dynamicObject._ellipsoidVisualizerIndex;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(ellipsoidVisualizerIndex)) {
                ellipsoid = dynamicEllipsoidVisualizer._ellipsoidCollection[ellipsoidVisualizerIndex];
                ellipsoid.show = false;
                dynamicObject._ellipsoidVisualizerIndex = undefined;
                dynamicEllipsoidVisualizer._unusedIndexes.push(ellipsoidVisualizerIndex);
            }
            return;
        }

        if (!defined(ellipsoidVisualizerIndex)) {
            var unusedIndexes = dynamicEllipsoidVisualizer._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                ellipsoidVisualizerIndex = unusedIndexes.pop();
                ellipsoid = dynamicEllipsoidVisualizer._ellipsoidCollection[ellipsoidVisualizerIndex];
            } else {
                ellipsoidVisualizerIndex = dynamicEllipsoidVisualizer._ellipsoidCollection.length;
                ellipsoid = new EllipsoidPrimitive();

                dynamicEllipsoidVisualizer._ellipsoidCollection.push(ellipsoid);
                dynamicEllipsoidVisualizer._primitives.add(ellipsoid);
            }
            dynamicObject._ellipsoidVisualizerIndex = ellipsoidVisualizerIndex;
            ellipsoid.dynamicObject = dynamicObject;

            ellipsoid.material = Material.fromType(Material.ColorType);
        } else {
            ellipsoid = dynamicEllipsoidVisualizer._ellipsoidCollection[ellipsoidVisualizerIndex];
        }

        ellipsoid.show = true;

        ellipsoid.radii = radiiProperty.getValue(time, ellipsoid.radii);

        position = defaultValue(positionProperty.getValue(time, position), ellipsoid._visualizerPosition);
        orientation = defaultValue(orientationProperty.getValue(time, orientation), ellipsoid._visualizerOrientation);

        if (defined(position) &&
            defined(orientation) &&
            (!Cartesian3.equals(position, ellipsoid._visualizerPosition) ||
             !Quaternion.equals(orientation, ellipsoid._visualizerOrientation))) {
            Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation, matrix3Scratch), position, ellipsoid.modelMatrix);
            ellipsoid._visualizerPosition = Cartesian3.clone(position, ellipsoid._visualizerPosition);
            ellipsoid._visualizerOrientation = Quaternion.clone(orientation, ellipsoid._visualizerOrientation);
        }

        ellipsoid.material = MaterialProperty.getValue(time, dynamicEllipsoid._material, ellipsoid.material);
    }

    DynamicEllipsoidVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        var thisEllipsoidCollection = this._ellipsoidCollection;
        var thisUnusedIndexes = this._unusedIndexes;
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var ellipsoidVisualizerIndex = dynamicObject._ellipsoidVisualizerIndex;
            if (defined(ellipsoidVisualizerIndex)) {
                var ellipsoid = thisEllipsoidCollection[ellipsoidVisualizerIndex];
                ellipsoid.show = false;
                thisUnusedIndexes.push(ellipsoidVisualizerIndex);
                dynamicObject._ellipsoidVisualizerIndex = undefined;
            }
        }
    };

    return DynamicEllipsoidVisualizer;
});
