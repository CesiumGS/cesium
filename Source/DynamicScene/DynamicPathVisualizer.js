/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/Transforms',
        '../Core/ReferenceFrame',
        './SampledPositionProperty',
        './CompositePositionProperty',
        './TimeIntervalCollectionPositionProperty',
        '../Scene/Material',
        '../Scene/SceneMode',
        '../Scene/PolylineCollection'
       ], function(
         defined,
         DeveloperError,
         destroyObject,
         Cartesian3,
         Matrix3,
         Matrix4,
         Color,
         Transforms,
         ReferenceFrame,
         SampledPositionProperty,
         CompositePositionProperty,
         TimeIntervalCollectionPositionProperty,
         Material,
         SceneMode,
         PolylineCollection) {
    "use strict";

    function subSampleSampledProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var times = property._property._times;

        var r = startingIndex;
        //Always step exactly on start (but only use it if it exists.)
        var tmp;
        tmp = property.getValueInReferenceFrame(start, referenceFrame, result[r]);
        if (defined(tmp)) {
            result[r++] = tmp;
        }

        var steppedOnNow = !defined(updateTime) || updateTime.lessThanOrEquals(start) || updateTime.greaterThanOrEquals(stop);

        //Iterate over all interval times and add the ones that fall in our
        //time range.  Note that times can contain data outside of
        //the intervals range.  This is by design for use with interpolation.
        var t = 0;
        var len = times.length;
        var current = times[t];
        var loopStop = stop;
        var sampling = false;
        var sampleStepsToTake;
        var sampleStepsTaken;
        var sampleStepSize;

        while (t < len) {
            if (!steppedOnNow && current.greaterThanOrEquals(updateTime)) {
                tmp = property.getValueInReferenceFrame(updateTime, referenceFrame, result[r]);
                if (defined(tmp)) {
                    result[r++] = tmp;
                }
                steppedOnNow = true;
            }
            if (current.greaterThan(start) && current.lessThan(loopStop) && !current.equals(updateTime)) {
                tmp = property.getValueInReferenceFrame(current, referenceFrame, result[r]);
                if (defined(tmp)) {
                    result[r++] = tmp;
                }
            }

            if (t < (len - 1)) {
                if (!sampling) {
                    var next = times[t + 1];
                    var secondsUntilNext = current.getSecondsDifference(next);
                    sampling = secondsUntilNext > maximumStep;

                    if (sampling) {
                        sampleStepsToTake = Math.floor(secondsUntilNext / maximumStep);
                        sampleStepsTaken = 0;
                        sampleStepSize = secondsUntilNext / Math.max(sampleStepsToTake, 2);
                        sampleStepsToTake = Math.max(sampleStepsToTake - 2, 1);
                    }
                }

                if (sampling && sampleStepsTaken < sampleStepsToTake) {
                    current = current.addSeconds(sampleStepSize);
                    sampleStepsTaken++;
                    continue;
                }
            }
            sampling = false;
            t++;
            current = times[t];
        }

        //Always step exactly on stop (but only use it if it exists.)
        tmp = property.getValueInReferenceFrame(stop, referenceFrame, result[r]);
        if (defined(tmp)) {
            result[r++] = tmp;
        }

        return r;
    }

    function subSampleGenericProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var tmp;
        var i = 0;
        var index = startingIndex;
        var time = start;
        var steppedOnNow = !defined(updateTime) || updateTime.lessThanOrEquals(start) || updateTime.greaterThanOrEquals(stop);
        while (time.lessThan(stop)) {
            if (!steppedOnNow && time.greaterThanOrEquals(updateTime)) {
                steppedOnNow = true;
                tmp = property.getValueInReferenceFrame(updateTime, referenceFrame, result[index]);
                if (defined(tmp)) {
                    result[index] = tmp;
                    index++;
                }
            }
            tmp = property.getValueInReferenceFrame(time, referenceFrame, result[index]);
            if (defined(tmp)) {
                result[index] = tmp;
                index++;
            }
            i++;
            time = start.addSeconds(maximumStep * i);
        }
        //Always sample stop.
        tmp = property.getValueInReferenceFrame(stop, referenceFrame, result[index]);
        if (defined(tmp)) {
            result[index] = tmp;
            index++;
        }
        return index;
    }

    function subSampleIntervalProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var index = startingIndex;
        var intervals = property.getIntervals();
        for ( var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(0);
            if (interval.start.lessThanOrEquals(stop)) {
                var tmp = property.getValueInReferenceFrame(stop, referenceFrame, result[index]);
                if (defined(tmp)) {
                    result[index] = tmp;
                    index++;
                }
            }
        }
        return index;
    }

    function subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var index = startingIndex;
        var intervals = property.getIntervals();
        for ( var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(0);
            if (interval.start.lessThanOrEquals(stop)) {
                var intervalProperty = interval.data;
                if (intervalProperty instanceof SampledPositionProperty) {
                    index = subSampleSampledProperty(intervalProperty, interval.start, interval.stop, updateTime, referenceFrame, maximumStep, index, result);
                } else if (intervalProperty instanceof CompositePositionProperty) {
                    index = subSampleCompositeProperty(intervalProperty, interval.start, interval.stop, updateTime, referenceFrame, maximumStep, index, result);
                } else if (intervalProperty instanceof TimeIntervalCollectionPositionProperty) {
                    index = subSampleIntervalProperty(intervalProperty, interval.start, interval.stop, updateTime, referenceFrame, maximumStep, index, result);
                } else {
                    //Fallback to generic sampling.
                    index = subSampleGenericProperty(intervalProperty, interval.start, interval.stop, updateTime, referenceFrame, maximumStep, index, result);
                }
            }
        }
        return index;
    }

    function subSample(property, start, stop, updateTime, referenceFrame, maximumStep, result) {
        if (!defined(result)) {
            result = [];
        }

        var length = 0;
        if (property instanceof SampledPositionProperty) {
            length = subSampleSampledProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else if (property instanceof CompositePositionProperty) {
            length = subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else if (property instanceof TimeIntervalCollectionPositionProperty) {
            length = subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else {
            //Fallback to generic sampling.
            length = subSampleGenericProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        }
        result.length = length;
        return result;
    }

    var toFixedScratch = new Matrix3();
    var PolylineUpdater = function(scene, referenceFrame) {
        this._unusedIndexes = [];
        this._polylineCollection = new PolylineCollection();
        this._scene = scene;
        this._referenceFrame = referenceFrame;
        scene.primitives.add(this._polylineCollection);
    };

    PolylineUpdater.prototype.update = function(time) {
        if (this._referenceFrame === ReferenceFrame.INERTIAL) {
            var toFixed = Transforms.computeIcrfToFixedMatrix(time, toFixedScratch);
            if (!defined(toFixed)) {
                toFixed = Transforms.computeTemeToPseudoFixedMatrix(time, toFixedScratch);
            }
            Matrix4.fromRotationTranslation(toFixed, Cartesian3.ZERO, this._polylineCollection.modelMatrix);
        }
    };

    PolylineUpdater.prototype.updateObject = function(time, dynamicObject) {
        var dynamicPath = dynamicObject._path;
        if (!defined(dynamicPath)) {
            return;
        }

        var positionProperty = dynamicObject._position;
        if (!defined(positionProperty)) {
            return;
        }

        var polyline;
        var property;
        var sampleStart;
        var sampleStop;
        var showProperty = dynamicPath._show;
        var pathVisualizerIndex = dynamicObject._pathVisualizerIndex;
        var show = !defined(showProperty) || showProperty.getValue(time);

        //While we want to show the path, there may not actually be anything to show
        //depending on lead/trail settings.  Compute the interval of the path to
        //show and check against actual availability.
        if (show) {
            property = dynamicPath._leadTime;
            var leadTime;
            if (defined(property)) {
                leadTime = property.getValue(time);
            }

            property = dynamicPath._trailTime;
            var trailTime;
            if (defined(property)) {
                trailTime = property.getValue(time);
            }

            var availability = dynamicObject._availability;
            var hasAvailability = defined(availability);
            var hasLeadTime = defined(leadTime);
            var hasTrailTime = defined(trailTime);

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
                if (hasLeadTime) {
                    sampleStop = time.addSeconds(leadTime);
                }

                if (hasAvailability) {
                    var start = availability.start;
                    var stop = availability.stop;

                    if (!hasTrailTime || start.greaterThan(sampleStart)) {
                        sampleStart = start;
                    }

                    if (!hasLeadTime || stop.lessThan(sampleStop)) {
                        sampleStop = stop;
                    }
                }
                show = sampleStart.lessThan(sampleStop);
            }
        }

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pathVisualizerIndex)) {
                polyline = this._polylineCollection.get(pathVisualizerIndex);
                polyline.setShow(false);
                dynamicObject._pathVisualizerIndex = undefined;
                this._unusedIndexes.push(pathVisualizerIndex);
            }
            return;
        }

        var uniforms;
        if (!defined(pathVisualizerIndex)) {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                pathVisualizerIndex = unusedIndexes.pop();
                polyline = this._polylineCollection.get(pathVisualizerIndex);
            } else {
                pathVisualizerIndex = this._polylineCollection.length;
                polyline = this._polylineCollection.add();
            }
            dynamicObject._pathVisualizerIndex = pathVisualizerIndex;
            polyline.id = dynamicObject;

            // CZML_TODO Determine official defaults
            polyline.setWidth(1);
            var material = polyline.getMaterial();
            if (!defined(material) || (material.type !== Material.PolylineOutlineType)) {
                material = Material.fromType(Material.PolylineOutlineType);
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
        property = dynamicPath._resolution;
        if (defined(property)) {
            resolution = property.getValue(time);
        }

        polyline.setPositions(subSample(positionProperty, sampleStart, sampleStop, time, this._referenceFrame, resolution, polyline.getPositions()));

        property = dynamicPath._color;
        if (defined(property)) {
            uniforms.color = property.getValue(time, uniforms.color);
        }

        property = dynamicPath._outlineColor;
        if (defined(property)) {
            uniforms.outlineColor = property.getValue(time, uniforms.outlineColor);
        }

        property = dynamicPath._outlineWidth;
        if (defined(property)) {
            uniforms.outlineWidth = property.getValue(time);
        }

        property = dynamicPath._width;
        if (defined(property)) {
            var width = property.getValue(time);
            if (defined(width)) {
                polyline.setWidth(width);
            }
        }
    };

    PolylineUpdater.prototype.removeObject = function(dynamicObject) {
        var pathVisualizerIndex = dynamicObject._pathVisualizerIndex;
        if (defined(pathVisualizerIndex)) {
            var polyline = this._polylineCollection.get(pathVisualizerIndex);
            polyline.setShow(false);
            this._unusedIndexes.push(pathVisualizerIndex);
            dynamicObject._pathVisualizerIndex = undefined;
        }
    };

    PolylineUpdater.prototype.destroy = function() {
        this._scene.primitives.remove(this._polylineCollection);
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
     * @see DynamicPath
     * @see Polyline
     * @see DynamicObject
     * @see CompositeDynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensor
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicPathVisualizer = function(scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._updaters = {};
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
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPathVisualizer.prototype._onObjectsRemoved, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPathVisualizer.prototype._onObjectsRemoved, this);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    DynamicPathVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        if (defined(this._dynamicObjectCollection)) {
            var updaters = this._updaters;
            for ( var key in updaters) {
                if (updaters.hasOwnProperty(key)) {
                    updaters[key].update(time);
                }
            }

            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
                var dynamicObject = dynamicObjects[i];

                if (!defined(dynamicObject._path)) {
                    continue;
                }

                var positionProperty = dynamicObject._position;
                if (!defined(positionProperty)) {
                    continue;
                }

                var lastUpdater = dynamicObject._pathUpdater;

                var frameToVisualize = ReferenceFrame.FIXED;
                if (this._scene.mode === SceneMode.SCENE3D) {
                    frameToVisualize = positionProperty._referenceFrame;
                }

                var currentUpdater = this._updaters[frameToVisualize];

                if ((lastUpdater === currentUpdater) && (defined(currentUpdater))) {
                    currentUpdater.updateObject(time, dynamicObject);
                    continue;
                }

                if (defined(lastUpdater)) {
                    lastUpdater.removeObject(dynamicObject);
                }

                if (!defined(currentUpdater)) {
                    currentUpdater = new PolylineUpdater(this._scene, frameToVisualize);
                    currentUpdater.update(time);
                    this._updaters[frameToVisualize] = currentUpdater;
                }

                dynamicObject._pathUpdater = currentUpdater;
                if (defined(currentUpdater)) {
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

        if (defined(this._dynamicObjectCollection)) {
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
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPathVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPathVisualizer.prototype.destroy = function() {
        this.setDynamicObjectCollection(undefined);
        return destroyObject(this);
    };

    DynamicPathVisualizer.prototype._onObjectsRemoved = function(dynamicObjectCollection, added, dynamicObjects) {
        for ( var i = dynamicObjects.length - 1; i > -1; i--) {
            var dynamicObject = dynamicObjects[i];
            var _pathUpdater = dynamicObject._pathUpdater;
            if (defined(_pathUpdater)) {
                _pathUpdater.removeObject(dynamicObject);
            }
        }
    };

    return DynamicPathVisualizer;
});
