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
        './ScaledPositionProperty',
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
        ScaledPositionProperty,
        TimeIntervalCollectionPositionProperty) {
    "use strict";

    var defaultResolution = 60.0;
    var defaultWidth = 1.0;

    var scratchTimeInterval = new TimeInterval();
    var subSampleCompositePropertyScratch = new TimeInterval();
    var subSampleIntervalPropertyScratch = new TimeInterval();

    var EntityData = function(entity) {
        this.entity = entity;
        this.polyline = undefined;
        this.index = undefined;
        this.updater = undefined;
    };

    function subSampleSampledProperty(property, start, stop, times, updateTime, referenceFrame, maximumStep, startingIndex, result) {
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

                index = reallySubSample(interval.data, sampleStart, sampleStop, updateTime, referenceFrame, maximumStep, index, result);
            }
        }
        return index;
    }

    function reallySubSample(property, start, stop, updateTime, referenceFrame, maximumStep, index, result) {
        var innerProperty = property;

        while (innerProperty instanceof ReferenceProperty || innerProperty instanceof ScaledPositionProperty) {
            if (innerProperty instanceof ReferenceProperty) {
                innerProperty = innerProperty.resolvedProperty;
            }
            if (innerProperty instanceof ScaledPositionProperty) {
                innerProperty = innerProperty._value;
            }
        }

        if (innerProperty instanceof SampledPositionProperty) {
            var times = innerProperty._property._times;
            index = subSampleSampledProperty(property, start, stop, times, updateTime, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof CompositePositionProperty) {
            index = subSampleCompositeProperty(property, start, stop, updateTime, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof TimeIntervalCollectionPositionProperty) {
            index = subSampleIntervalProperty(property, start, stop, updateTime, referenceFrame, maximumStep, index, result);
        } else if (innerProperty instanceof ConstantPositionProperty) {
            index = subSampleConstantProperty(property, start, stop, updateTime, referenceFrame, maximumStep, index, result);
        } else {
            //Fallback to generic sampling.
            index = subSampleGenericProperty(property, start, stop, updateTime, referenceFrame, maximumStep, index, result);
        }
        return index;
    }

    function subSample(property, start, stop, updateTime, referenceFrame, maximumStep, result) {
        if (!defined(result)) {
            result = [];
        }

        var length = reallySubSample(property, start, stop, updateTime, referenceFrame, maximumStep, 0, result);
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

    PolylineUpdater.prototype.updateObject = function(time, item) {
        var entity = item.entity;
        var pathGraphics = entity._path;
        var positionProperty = entity._position;

        var sampleStart;
        var sampleStop;
        var showProperty = pathGraphics._show;
        var polyline = item.polyline;
        var show = entity.isShowing && (!defined(showProperty) || showProperty.getValue(time));

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
            if (defined(polyline)) {
                this._unusedIndexes.push(item.index);
                item.polyline = undefined;
                polyline.show = false;
                item.index = undefined;
            }
            return;
        }

        if (!defined(polyline)) {
            var unusedIndexes = this._unusedIndexes;
            var length = unusedIndexes.length;
            if (length > 0) {
                var index = unusedIndexes.pop();
                polyline = this._polylineCollection.get(index);
                item.index = index;
            } else {
                item.index = this._polylineCollection.length;
                polyline = this._polylineCollection.add();
            }
            polyline.id = entity;
            item.polyline = polyline;
        }

        var resolution = Property.getValueOrDefault(pathGraphics._resolution, time, defaultResolution);

        polyline.show = true;
        polyline.positions = subSample(positionProperty, sampleStart, sampleStop, time, this._referenceFrame, resolution, polyline.positions);
        polyline.material = MaterialProperty.getValue(time, pathGraphics._material, polyline.material);
        polyline.width = Property.getValueOrDefault(pathGraphics._width, time, defaultWidth);
    };

    PolylineUpdater.prototype.removeObject = function(item) {
        var polyline = item.polyline;
        if (defined(polyline)) {
            this._unusedIndexes.push(item.index);
            item.polyline = undefined;
            polyline.show = false;
            item.index = undefined;
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
        this._items = new AssociativeArray();

        this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
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

        var items = this._items.values;
        for (var i = 0, len = items.length; i < len; i++) {
            var item = items[i];
            var entity = item.entity;
            var positionProperty = entity._position;

            var lastUpdater = item.updater;

            var frameToVisualize = ReferenceFrame.FIXED;
            if (this._scene.mode === SceneMode.SCENE3D) {
                frameToVisualize = positionProperty.referenceFrame;
            }

            var currentUpdater = this._updaters[frameToVisualize];

            if ((lastUpdater === currentUpdater) && (defined(currentUpdater))) {
                currentUpdater.updateObject(time, item);
                continue;
            }

            if (defined(lastUpdater)) {
                lastUpdater.removeObject(item);
            }

            if (!defined(currentUpdater)) {
                currentUpdater = new PolylineUpdater(this._scene, frameToVisualize);
                currentUpdater.update(time);
                this._updaters[frameToVisualize] = currentUpdater;
            }

            item.updater = currentUpdater;
            if (defined(currentUpdater)) {
                currentUpdater.updateObject(time, item);
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
        this._entityCollection.collectionChanged.removeEventListener(PathVisualizer.prototype._onCollectionChanged, this);

        var updaters = this._updaters;
        for ( var key in updaters) {
            if (updaters.hasOwnProperty(key)) {
                updaters[key].destroy();
            }
        }

        return destroyObject(this);
    };

    PathVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed, changed) {
        var i;
        var entity;
        var item;
        var items = this._items;

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            if (defined(entity._path) && defined(entity._position)) {
                items.set(entity.id, new EntityData(entity));
            }
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            if (defined(entity._path) && defined(entity._position)) {
                if (!items.contains(entity.id)) {
                    items.set(entity.id, new EntityData(entity));
                }
            } else {
                item = items.get(entity.id);
                if (defined(item)) {
                    item.updater.removeObject(item);
                    items.remove(entity.id);
                }
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            item = items.get(entity.id);
            if (defined(item)) {
                item.updater.removeObject(item);
                items.remove(entity.id);
            }
        }
    };

    //for testing
    PathVisualizer._subSample = subSample;

    return PathVisualizer;
});
