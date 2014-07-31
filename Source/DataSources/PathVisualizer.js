/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/JulianDate',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/ReferenceFrame',
        '../Core/TimeInterval',
        '../Core/Transforms',
        '../Scene/PolylineCollection',
        '../Scene/SceneMode',
        './CompositePositionProperty',
        './ConstantPositionProperty',
        './MaterialProperty',
        './Property',
        './ReferenceProperty',
        './SampledPositionProperty',
        './TimeIntervalCollectionPositionProperty'
    ], function(
        AssociativeArray,
        Cartesian3,
        defined,
        destroyObject,
        DeveloperError,
        JulianDate,
        Matrix3,
        Matrix4,
        ReferenceFrame,
        TimeInterval,
        Transforms,
        PolylineCollection,
        SceneMode,
        CompositePositionProperty,
        ConstantPositionProperty,
        MaterialProperty,
        Property,
        ReferenceProperty,
        SampledPositionProperty,
        TimeIntervalCollectionPositionProperty) {
    "use strict";

    var defaultResolution = 60.0;
    var defaultWidth = 1.0;

    var scratchTimeInterval = new TimeInterval();
    var subSampleCompositePropertyScratch = new TimeInterval();
    var subSampleIntervalPropertyScratch = new TimeInterval();

    function subSampleSampledProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var times = property._property._times;

        var r = startingIndex;
        //Always step exactly on start (but only use it if it exists.)
        var tmp;
        tmp = property.getValueInReferenceFrame(start, referenceFrame, result[r]);
        if (defined(tmp)) {
            result[r++] = tmp;
        }

        var steppedOnNow = !defined(updateTime) || JulianDate.lessThanOrEquals(updateTime, start) || JulianDate.greaterThanOrEquals(updateTime, stop);

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
            if (!steppedOnNow && JulianDate.greaterThanOrEquals(current, updateTime)) {
                tmp = property.getValueInReferenceFrame(updateTime, referenceFrame, result[r]);
                if (defined(tmp)) {
                    result[r++] = tmp;
                }
                steppedOnNow = true;
            }
            if (JulianDate.greaterThan(current, start) && JulianDate.lessThan(current, loopStop) && !current.equals(updateTime)) {
                tmp = property.getValueInReferenceFrame(current, referenceFrame, result[r]);
                if (defined(tmp)) {
                    result[r++] = tmp;
                }
            }

            if (t < (len - 1)) {
                if (maximumStep > 0 && !sampling) {
                    var next = times[t + 1];
                    var secondsUntilNext = JulianDate.secondsDifference(next, current);
                    sampling = secondsUntilNext > maximumStep;

                    if (sampling) {
                        sampleStepsToTake = Math.ceil(secondsUntilNext / maximumStep);
                        sampleStepsTaken = 0;
                        sampleStepSize = secondsUntilNext / Math.max(sampleStepsToTake, 2);
                        sampleStepsToTake = Math.max(sampleStepsToTake - 1, 1);
                    }
                }

                if (sampling && sampleStepsTaken < sampleStepsToTake) {
                    current = JulianDate.addSeconds(current, sampleStepSize, new JulianDate());
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
        var stepSize = Math.max(maximumStep, 60);
        var steppedOnNow = !defined(updateTime) || JulianDate.lessThanOrEquals(updateTime, start) || JulianDate.greaterThanOrEquals(updateTime, stop);
        while (JulianDate.lessThan(time, stop)) {
            if (!steppedOnNow && JulianDate.greaterThanOrEquals(time, updateTime)) {
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
            time = JulianDate.addSeconds(start, stepSize * i, new JulianDate());
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
        subSampleIntervalPropertyScratch.start = start;
        subSampleIntervalPropertyScratch.stop = stop;

        var index = startingIndex;
        var intervals = property.intervals;
        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(i);
            if (!TimeInterval.intersect(interval, subSampleIntervalPropertyScratch, scratchTimeInterval).isEmpty) {
                var time = interval.start;
                if (!interval.isStartIncluded) {
                    if (interval.isStopIncluded) {
                        time = interval.stop;
                    } else {
                        time = JulianDate.addSeconds(interval.start, JulianDate.secondsDifference(interval.stop, interval.start) / 2, new JulianDate());
                    }
                }
                var tmp = property.getValueInReferenceFrame(time, referenceFrame, result[index]);
                if (defined(tmp)) {
                    result[index] = tmp;
                    index++;
                }
            }
        }
        return index;
    }

    function subSampleConstantProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        var tmp = property.getValueInReferenceFrame(start, referenceFrame, result[startingIndex]);
        if (defined(tmp)) {
            result[startingIndex++] = tmp;
        }
        return startingIndex;
    }

    function subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, startingIndex, result) {
        subSampleCompositePropertyScratch.start = start;
        subSampleCompositePropertyScratch.stop = stop;

        var index = startingIndex;
        var intervals = property.intervals;
        for (var i = 0; i < intervals.length; i++) {
            var interval = intervals.get(i);
            if (!TimeInterval.intersect(interval, subSampleCompositePropertyScratch, scratchTimeInterval).isEmpty) {
                var intervalStart = interval.start;
                var intervalStop = interval.stop;

                var sampleStart = start;
                if (JulianDate.greaterThan(intervalStart, sampleStart)) {
                    sampleStart = intervalStart;
                }

                var sampleStop = stop;
                if (JulianDate.lessThan(intervalStop, sampleStop)) {
                    sampleStop = intervalStop;
                }

                var intervalProperty = interval.data;
                if (intervalProperty instanceof ReferenceProperty) {
                    intervalProperty = intervalProperty.resolvedProperty;
                }

                if (intervalProperty instanceof SampledPositionProperty) {
                    index = subSampleSampledProperty(intervalProperty, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
                } else if (intervalProperty instanceof CompositePositionProperty) {
                    index = subSampleCompositeProperty(intervalProperty, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
                } else if (intervalProperty instanceof TimeIntervalCollectionPositionProperty) {
                    index = subSampleIntervalProperty(intervalProperty, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
                } else if (intervalProperty instanceof ConstantPositionProperty) {
                    index = subSampleConstantProperty(intervalProperty, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
                } else {
                    //Fallback to generic sampling.
                    index = subSampleGenericProperty(intervalProperty, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
                }
            }
        }
        return index;
    }

    function subSample(property, start, stop, updateTime, referenceFrame, maximumStep, result) {
        if (!defined(result)) {
            result = [];
        }

        if (property instanceof ReferenceProperty) {
            property = property.resolvedProperty;
        }

        var length = 0;
        if (property instanceof SampledPositionProperty) {
            length = subSampleSampledProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else if (property instanceof CompositePositionProperty) {
            length = subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else if (property instanceof TimeIntervalCollectionPositionProperty) {
            length = subSampleIntervalProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
        } else if (property instanceof ConstantPositionProperty) {
            length = subSampleConstantProperty(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
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

    PolylineUpdater.prototype.updateObject = function(time, entity) {
        var pathGraphics = entity._path;
        if (!defined(pathGraphics)) {
            return;
        }

        var positionProperty = entity._position;
        if (!defined(positionProperty)) {
            return;
        }

        var polyline;
        var sampleStart;
        var sampleStop;
        var showProperty = pathGraphics._show;
        var pathVisualizerIndex = entity._pathVisualizerIndex;
        var show = !defined(showProperty) || showProperty.getValue(time);

        //While we want to show the path, there may not actually be anything to show
        //depending on lead/trail settings.  Compute the interval of the path to
        //show and check against actual availability.
        if (show) {
            var leadTime = Property.getValueOrUndefined(pathGraphics._leadTime, time);
            var trailTime = Property.getValueOrUndefined(pathGraphics._trailTime, time);
            var availability = entity._availability;
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
                    sampleStart = JulianDate.addSeconds(time, -trailTime, new JulianDate());
                }
                if (hasLeadTime) {
                    sampleStop = JulianDate.addSeconds(time, leadTime, new JulianDate());
                }

                if (hasAvailability) {
                    var start = availability.start;
                    var stop = availability.stop;

                    if (!hasTrailTime || JulianDate.greaterThan(start, sampleStart)) {
                        sampleStart = start;
                    }

                    if (!hasLeadTime || JulianDate.lessThan(stop, sampleStop)) {
                        sampleStop = stop;
                    }
                }
                show = JulianDate.lessThan(sampleStart, sampleStop);
            }
        }

        if (!show) {
            //don't bother creating or updating anything else
            if (defined(pathVisualizerIndex)) {
                polyline = this._polylineCollection.get(pathVisualizerIndex);
                polyline.show = false;
                entity._pathVisualizerIndex = undefined;
                this._unusedIndexes.push(pathVisualizerIndex);
            }
            return;
        }

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
            entity._pathVisualizerIndex = pathVisualizerIndex;
            polyline.id = entity;
        } else {
            polyline = this._polylineCollection.get(pathVisualizerIndex);
        }

        var resolution = Property.getValueOrDefault(pathGraphics._resolution, time, defaultResolution);

        polyline.show = true;
        polyline.positions = subSample(positionProperty, sampleStart, sampleStop, time, this._referenceFrame, resolution, polyline.positions);
        polyline.material = MaterialProperty.getValue(time, pathGraphics._material, polyline.material);
        polyline.width = Property.getValueOrDefault(pathGraphics._width, time, defaultWidth);
    };

    PolylineUpdater.prototype.removeObject = function(entity) {
        var pathVisualizerIndex = entity._pathVisualizerIndex;
        if (defined(pathVisualizerIndex)) {
            var polyline = this._polylineCollection.get(pathVisualizerIndex);
            polyline.show = false;
            this._unusedIndexes.push(pathVisualizerIndex);
            entity._pathVisualizerIndex = undefined;
        }
    };

    PolylineUpdater.prototype.destroy = function() {
        this._scene.primitives.remove(this._polylineCollection);
        return destroyObject(this);
    };

    /**
     * A {@link Visualizer} which maps {@link Entity#path} to a {@link Polyline}.
     * @alias PathVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var PathVisualizer = function(scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        entityCollection.collectionChanged.addEventListener(PathVisualizer.prototype._onCollectionChanged, this);

        this._scene = scene;
        this._updaters = {};
        this._entityCollection = entityCollection;
        this._entitiesToVisualize = new AssociativeArray();

        this._onCollectionChanged(entityCollection, entityCollection.entities, [], []);
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    PathVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].update(time);
            }
        }

        var entities = this._entitiesToVisualize.values;
        for (var i = 0, len = entities.length; i < len; i++) {
            var entity = entities[i];
            var positionProperty = entity._position;

            var lastUpdater = entity._pathUpdater;

            var frameToVisualize = ReferenceFrame.FIXED;
            if (this._scene.mode === SceneMode.SCENE3D) {
                frameToVisualize = positionProperty.referenceFrame;
            }

            var currentUpdater = this._updaters[frameToVisualize];

            if ((lastUpdater === currentUpdater) && (defined(currentUpdater))) {
                currentUpdater.updateObject(time, entity);
                continue;
            }

            if (defined(lastUpdater)) {
                lastUpdater.removeObject(entity);
            }

            if (!defined(currentUpdater)) {
                currentUpdater = new PolylineUpdater(this._scene, frameToVisualize);
                currentUpdater.update(time);
                this._updaters[frameToVisualize] = currentUpdater;
            }

            entity._pathUpdater = currentUpdater;
            if (defined(currentUpdater)) {
                currentUpdater.updateObject(time, entity);
            }
        }
        return true;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    PathVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    PathVisualizer.prototype.destroy = function() {
        var entityCollection = this._entityCollection;
        entityCollection.collectionChanged.removeEventListener(PathVisualizer.prototype._onCollectionChanged, this);

        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].destroy();
            }
        }

        var entities = entityCollection.entities;
        var length = entities.length;
        for (var i = 0; i < length; i++) {
            entities[i]._pathUpdater = undefined;
            entities[i]._pathVisualizerIndex = undefined;
        }
        return destroyObject(this);
    };

    PathVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var _pathUpdater;
        var entities = this._entitiesToVisualize;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._path) && defined(entity._position)) {
                entities.set(entity.id, entity);
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._path) && defined(entity._position)) {
                entities.set(entity.id, entity);
            } else {
                _pathUpdater = entity._pathUpdater;
                if (defined(_pathUpdater)) {
                    _pathUpdater.removeObject(entity);
                }
                entities.remove(entity.id);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            _pathUpdater = entity._pathUpdater;
            if (defined(_pathUpdater)) {
                _pathUpdater.removeObject(entity);
            }
            entities.remove(entity.id);
        }
    };

    //for testing
    PathVisualizer._subSample = subSample;

    return PathVisualizer;
});
