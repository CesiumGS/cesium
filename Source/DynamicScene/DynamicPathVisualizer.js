/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/Transforms',
        '../Core/ReferenceFrame',
        '../Scene/Material',
        '../Scene/SceneMode',
        '../Scene/PolylineCollection'
       ], function(
         DeveloperError,
         destroyObject,
         Cartesian3,
         Matrix4,
         Color,
         Transforms,
         ReferenceFrame,
         Material,
         SceneMode,
         PolylineCollection) {
    "use strict";

    var PolylineUpdater = function(scene, referenceFrame) {
        this._unusedIndexes = [];
        this._polylineCollection = new PolylineCollection();
        this._scene = scene;
        this._referenceFrame = referenceFrame;

        var transform;
        if (referenceFrame === ReferenceFrame.INERTIAL) {
            transform = Transforms.computeIcrfToFixedMatrix;
        }
        scene.getPrimitives().add(this._polylineCollection);
        this._transformFunction = transform;
    };

    PolylineUpdater.prototype.update = function(time) {
        var transform = this._transformFunction;
        if (typeof transform !== 'undefined') {
            var toFixed = transform(time);
            if (typeof toFixed !== 'undefined') {
                Matrix4.fromRotationTranslation(toFixed, Cartesian3.ZERO, this._polylineCollection.modelMatrix);
            }
        }
    };

    PolylineUpdater.prototype.updateObject = function(time, dynamicObject) {
        var dynamicPath = dynamicObject.path;
        if (typeof dynamicPath === 'undefined') {
            return;
        }

        var positionProperty = dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            return;
        }

        var polyline;
        var property;
        var sampleStart;
        var sampleStop;
        var showProperty = dynamicPath.show;
        var pathVisualizerIndex = dynamicObject._pathVisualizerIndex;
        var show = (typeof showProperty === 'undefined' || showProperty.getValue(time));

        //While we want to show the path, there may not actually be anything to show
        //depending on lead/trail settings.  Compute the interval of the path to
        //show and check against actual availability.
        if (show) {
            property = dynamicPath.leadTime;
            var leadTime;
            if (typeof property !== 'undefined') {
                leadTime = property.getValue(time);
            }

            property = dynamicPath.trailTime;
            var trailTime;
            if (typeof property !== 'undefined') {
                trailTime = property.getValue(time);
            }

            var availability = dynamicObject.availability;
            var hasAvailability = typeof availability !== 'undefined';
            var hasLeadTime = typeof leadTime !== 'undefined';
            var hasTrailTime = typeof trailTime !== 'undefined';

            //Objects need to have either defined availability or both a lead and trail time in order to
            //draw a path (since we can't draw "infinite" paths.
            show = hasAvailability || (hasLeadTime && hasTrailTime);

            //The final step is to compute the actual start/stop times of the path to show.
            //If current time is outside of the availability interval, there's a chance that
            //we won't have to draw anything anyway.
            if (show) {
                if (hasTrailTime) {
                    sampleStart = time.addSeconds(-trailTime);
                }
                if (hasAvailability && (!hasTrailTime || availability.start.greaterThan(sampleStart))) {
                    sampleStart = availability.start;
                }

                if (hasLeadTime) {
                    sampleStop = time.addSeconds(leadTime);
                }
                if (hasAvailability && (!hasLeadTime || availability.stop.lessThan(sampleStop))) {
                    sampleStop = availability.stop;
                }
                show = sampleStart.lessThan(sampleStop);
            }
        }

        if (!show) {
            //don't bother creating or updating anything else
            if (typeof pathVisualizerIndex !== 'undefined') {
                polyline = this._polylineCollection.get(pathVisualizerIndex);
                polyline.setShow(false);
                dynamicObject._pathVisualizerIndex = undefined;
                this._unusedIndexes.push(pathVisualizerIndex);
            }
            return;
        }

        var uniforms;
        if (typeof pathVisualizerIndex === 'undefined') {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pathVisualizerIndex = unusedIndexes.pop();
                polyline = this._polylineCollection.get(pathVisualizerIndex);
            } else {
                pathVisualizerIndex = this._polylineCollection.getLength();
                polyline = this._polylineCollection.add();
            }
            dynamicObject._pathVisualizerIndex = pathVisualizerIndex;
            polyline.dynamicObject = dynamicObject;

            // CZML_TODO Determine official defaults
            polyline.setWidth(1);
            var material = polyline.getMaterial();
            if (typeof material === 'undefined' || (material.type !== Material.PolylineOutlineType)) {
                material = Material.fromType(this._scene.getContext(), Material.PolylineOutlineType);
                polyline.setMaterial(material);
            }
            uniforms = material.uniforms;
            Color.clone(Color.WHITE, uniforms.color);
            Color.clone(Color.BLACK, uniforms.outlineColor);
            uniforms.outlineWidth = 0;
        } else {
            polyline = this._polylineCollection.get(pathVisualizerIndex);
            uniforms = polyline.getMaterial().uniforms;
        }

        polyline.setShow(true);

        var resolution = 60.0;
        property = dynamicPath.resolution;
        if (typeof property !== 'undefined') {
            resolution = property.getValue(time);
        }

        polyline.setPositions(positionProperty._getValueRangeInReferenceFrame(sampleStart, sampleStop, time, this._referenceFrame, resolution, polyline.getPositions()));

        property = dynamicPath.color;
        if (typeof property !== 'undefined') {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = dynamicPath.outlineColor;
        if (typeof property !== 'undefined') {
            uniforms.outlineColor = property.getValue(time, uniforms.outlineColor);
        }

        property = dynamicPath.outlineWidth;
        if (typeof property !== 'undefined') {
            uniforms.outlineWidth = property.getValue(time, uniforms.outlineWidth);
        }

        property = dynamicPath.width;
        if (typeof property !== 'undefined') {
            var width = property.getValue(time);
            if (typeof width !== 'undefined') {
                polyline.setWidth(width);
            }
        }
    };

    PolylineUpdater.prototype.removeObject = function(dynamicObject) {
        var pathVisualizerIndex = dynamicObject._pathVisualizerIndex;
        if (typeof pathVisualizerIndex !== 'undefined') {
            var polyline = this._polylineCollection.get(pathVisualizerIndex);
            polyline.setShow(false);
            this._unusedIndexes.push(pathVisualizerIndex);
            dynamicObject._pathVisualizerIndex = undefined;
        }
    };

    PolylineUpdater.prototype.destroy = function() {
        this._scene.getPrimitives().remove(this._polylineCollection);
        return destroyObject(this);
    };

    /**
     * A DynamicObject visualizer which maps the DynamicPath instance
     * in DynamicObject.path to a Polyline primitive.
     * @alias DynamicPathVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPath
     * @see Polyline
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
    var DynamicPathVisualizer = function(scene, dynamicObjectCollection) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._updaters = {
            FIXED : new PolylineUpdater(scene, ReferenceFrame.FIXED),
            INERTIAL : new PolylineUpdater(scene, ReferenceFrame.INERTIAL)
        };
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPathVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPathVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPathVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (typeof oldCollection !== 'undefined') {
                oldCollection.objectsRemoved.removeEventListener(DynamicPathVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (typeof dynamicObjectCollection !== 'undefined') {
                dynamicObjectCollection.objectsRemoved.addEventListener(DynamicPathVisualizer.prototype._onObjectsRemoved, this);
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
    DynamicPathVisualizer.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is requied.');
        }

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var updaters = this._updaters;
            for ( var key in updaters) {
                if (updaters.hasOwnProperty(key)) {
                    updaters[key].update(time);
                }
            }

            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                var dynamicObject = dynamicObjects[i];

                if (typeof dynamicObject.path === 'undefined') {
                    continue;
                }

                var positionProperty = dynamicObject.position;
                if (typeof positionProperty === 'undefined') {
                    continue;
                }

                var lastUpdater = dynamicObject._pathUpdater;

                var frameToVisualize = ReferenceFrame.FIXED;
                if (this._scene.mode === SceneMode.SCENE3D) {
                    frameToVisualize = positionProperty._getReferenceFrame();
                }

                var currentUpdater = this._updaters[frameToVisualize];

                if ((lastUpdater === currentUpdater) && (typeof currentUpdater !== 'undefined')) {
                    currentUpdater.updateObject(time, dynamicObject);
                    continue;
                }

                if (typeof lastUpdater !== 'undefined') {
                    lastUpdater.removeObject(dynamicObject);
                }

                if (typeof currentUpdater === 'undefined') {
                    currentUpdater = new PolylineUpdater(this._scene, frameToVisualize);
                    currentUpdater.update(time);
                    this._updaters[frameToVisualize] = currentUpdater;
                }

                dynamicObject._pathUpdater = currentUpdater;
                if (typeof currentUpdater !== 'undefined') {
                    currentUpdater.updateObject(time, dynamicObject);
                }
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicPathVisualizer.prototype.removeAllPrimitives = function() {
        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].destroy();
            }
        }
        this._updaters = {};

        if (typeof this._dynamicObjectCollection !== 'undefined') {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = dynamicObjects.length - 1; i > -1; i--) {
                dynamicObjects[i]._pathUpdater = undefined;
                dynamicObjects[i]._pathVisualizerIndex = undefined;
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPathVisualizer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPathVisualizer#destroy
     */
    DynamicPathVisualizer.prototype.isDestroyed = function() {
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
     * @memberof DynamicPathVisualizer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPathVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPathVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    DynamicPathVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, dynamicObjects) {
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var _pathUpdater = dynamicObject._pathUpdater;
            if (typeof _pathUpdater !== 'undefined') {
                _pathUpdater.removeObject(dynamicObject);
            }
        }
    };

    return DynamicPathVisualizer;
});
