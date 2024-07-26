import AssociativeArray from "../Core/AssociativeArray.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import JulianDate from "../Core/JulianDate.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import TimeInterval from "../Core/TimeInterval.js";
import Transforms from "../Core/Transforms.js";
import PolylineCollection from "../Scene/PolylineCollection.js";
import SceneMode from "../Scene/SceneMode.js";
import CompositePositionProperty from "./CompositePositionProperty.js";
import ConstantPositionProperty from "./ConstantPositionProperty.js";
import MaterialProperty from "./MaterialProperty.js";
import Property from "./Property.js";
import ReferenceProperty from "./ReferenceProperty.js";
import SampledPositionProperty from "./SampledPositionProperty.js";
import ScaledPositionProperty from "./ScaledPositionProperty.js";
import TimeIntervalCollectionPositionProperty from "./TimeIntervalCollectionPositionProperty.js";

const defaultResolution = 60.0;
const defaultWidth = 1.0;

const scratchTimeInterval = new TimeInterval();
const subSampleCompositePropertyScratch = new TimeInterval();
const subSampleIntervalPropertyScratch = new TimeInterval();

function EntityData(entity) {
  this.entity = entity;
  this.polyline = undefined;
  this.index = undefined;
  this.updater = undefined;
}

function subSampleSampledProperty(
  property,
  start,
  stop,
  times,
  updateTime,
  referenceFrame,
  maximumStep,
  startingIndex,
  result
) {
  let r = startingIndex;
  //Always step exactly on start (but only use it if it exists.)
  let tmp;
  tmp = property.getValueInReferenceFrame(start, referenceFrame, result[r]);
  if (defined(tmp)) {
    result[r++] = tmp;
  }

  let steppedOnNow =
    !defined(updateTime) ||
    JulianDate.lessThanOrEquals(updateTime, start) ||
    JulianDate.greaterThanOrEquals(updateTime, stop);

  //Iterate over all interval times and add the ones that fall in our
  //time range.  Note that times can contain data outside of
  //the intervals range.  This is by design for use with interpolation.
  let t = 0;
  const len = times.length;
  let current = times[t];
  const loopStop = stop;
  let sampling = false;
  let sampleStepsToTake;
  let sampleStepsTaken;
  let sampleStepSize;

  while (t < len) {
    if (!steppedOnNow && JulianDate.greaterThanOrEquals(current, updateTime)) {
      tmp = property.getValueInReferenceFrame(
        updateTime,
        referenceFrame,
        result[r]
      );
      if (defined(tmp)) {
        result[r++] = tmp;
      }
      steppedOnNow = true;
    }
    if (
      JulianDate.greaterThan(current, start) &&
      JulianDate.lessThan(current, loopStop) &&
      !current.equals(updateTime)
    ) {
      tmp = property.getValueInReferenceFrame(
        current,
        referenceFrame,
        result[r]
      );
      if (defined(tmp)) {
        result[r++] = tmp;
      }
    }

    if (t < len - 1) {
      if (maximumStep > 0 && !sampling) {
        const next = times[t + 1];
        const secondsUntilNext = JulianDate.secondsDifference(next, current);
        sampling = secondsUntilNext > maximumStep;

        if (sampling) {
          sampleStepsToTake = Math.ceil(secondsUntilNext / maximumStep);
          sampleStepsTaken = 0;
          sampleStepSize = secondsUntilNext / Math.max(sampleStepsToTake, 2);
          sampleStepsToTake = Math.max(sampleStepsToTake - 1, 1);
        }
      }

      if (sampling && sampleStepsTaken < sampleStepsToTake) {
        current = JulianDate.addSeconds(
          current,
          sampleStepSize,
          new JulianDate()
        );
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

function subSampleGenericProperty(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  startingIndex,
  result
) {
  let tmp;
  let i = 0;
  let index = startingIndex;
  let time = start;
  const stepSize = Math.max(maximumStep, 60);
  let steppedOnNow =
    !defined(updateTime) ||
    JulianDate.lessThanOrEquals(updateTime, start) ||
    JulianDate.greaterThanOrEquals(updateTime, stop);
  while (JulianDate.lessThan(time, stop)) {
    if (!steppedOnNow && JulianDate.greaterThanOrEquals(time, updateTime)) {
      steppedOnNow = true;
      tmp = property.getValueInReferenceFrame(
        updateTime,
        referenceFrame,
        result[index]
      );
      if (defined(tmp)) {
        result[index] = tmp;
        index++;
      }
    }
    tmp = property.getValueInReferenceFrame(
      time,
      referenceFrame,
      result[index]
    );
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

function subSampleIntervalProperty(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  startingIndex,
  result
) {
  subSampleIntervalPropertyScratch.start = start;
  subSampleIntervalPropertyScratch.stop = stop;

  let index = startingIndex;
  const intervals = property.intervals;
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals.get(i);
    if (
      !TimeInterval.intersect(
        interval,
        subSampleIntervalPropertyScratch,
        scratchTimeInterval
      ).isEmpty
    ) {
      let time = interval.start;
      if (!interval.isStartIncluded) {
        if (interval.isStopIncluded) {
          time = interval.stop;
        } else {
          time = JulianDate.addSeconds(
            interval.start,
            JulianDate.secondsDifference(interval.stop, interval.start) / 2,
            new JulianDate()
          );
        }
      }
      const tmp = property.getValueInReferenceFrame(
        time,
        referenceFrame,
        result[index]
      );
      if (defined(tmp)) {
        result[index] = tmp;
        index++;
      }
    }
  }
  return index;
}

function subSampleConstantProperty(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  startingIndex,
  result
) {
  const tmp = property.getValueInReferenceFrame(
    start,
    referenceFrame,
    result[startingIndex]
  );
  if (defined(tmp)) {
    result[startingIndex++] = tmp;
  }
  return startingIndex;
}

function subSampleCompositeProperty(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  startingIndex,
  result
) {
  subSampleCompositePropertyScratch.start = start;
  subSampleCompositePropertyScratch.stop = stop;

  let index = startingIndex;
  const intervals = property.intervals;
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals.get(i);
    if (
      !TimeInterval.intersect(
        interval,
        subSampleCompositePropertyScratch,
        scratchTimeInterval
      ).isEmpty
    ) {
      const intervalStart = interval.start;
      const intervalStop = interval.stop;

      let sampleStart = start;
      if (JulianDate.greaterThan(intervalStart, sampleStart)) {
        sampleStart = intervalStart;
      }

      let sampleStop = stop;
      if (JulianDate.lessThan(intervalStop, sampleStop)) {
        sampleStop = intervalStop;
      }

      index = reallySubSample(
        interval.data,
        sampleStart,
        sampleStop,
        updateTime,
        referenceFrame,
        maximumStep,
        index,
        result
      );
    }
  }
  return index;
}

function reallySubSample(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  index,
  result
) {
  //Unwrap any references until we have the actual property.
  while (property instanceof ReferenceProperty) {
    property = property.resolvedProperty;
  }

  if (property instanceof SampledPositionProperty) {
    const times = property._property._times;
    index = subSampleSampledProperty(
      property,
      start,
      stop,
      times,
      updateTime,
      referenceFrame,
      maximumStep,
      index,
      result
    );
  } else if (property instanceof CompositePositionProperty) {
    index = subSampleCompositeProperty(
      property,
      start,
      stop,
      updateTime,
      referenceFrame,
      maximumStep,
      index,
      result
    );
  } else if (property instanceof TimeIntervalCollectionPositionProperty) {
    index = subSampleIntervalProperty(
      property,
      start,
      stop,
      updateTime,
      referenceFrame,
      maximumStep,
      index,
      result
    );
  } else if (
    property instanceof ConstantPositionProperty ||
    (property instanceof ScaledPositionProperty &&
      Property.isConstant(property))
  ) {
    index = subSampleConstantProperty(
      property,
      start,
      stop,
      updateTime,
      referenceFrame,
      maximumStep,
      index,
      result
    );
  } else {
    //Fallback to generic sampling.
    index = subSampleGenericProperty(
      property,
      start,
      stop,
      updateTime,
      referenceFrame,
      maximumStep,
      index,
      result
    );
  }
  return index;
}

function subSample(
  property,
  start,
  stop,
  updateTime,
  referenceFrame,
  maximumStep,
  result
) {
  if (!defined(result)) {
    result = [];
  }

  const length = reallySubSample(
    property,
    start,
    stop,
    updateTime,
    referenceFrame,
    maximumStep,
    0,
    result
  );
  result.length = length;
  return result;
}

const toFixedScratch = new Matrix3();
function PolylineUpdater(scene, referenceFrame) {
  this._unusedIndexes = [];
  this._polylineCollection = new PolylineCollection();
  this._scene = scene;
  this._referenceFrame = referenceFrame;
  scene.primitives.add(this._polylineCollection);
}

PolylineUpdater.prototype.update = function (time) {
  if (this._referenceFrame === ReferenceFrame.INERTIAL) {
    const toFixed = Transforms.computeIcrfToCentralBodyFixedMatrix(
      time,
      toFixedScratch
    );
    Matrix4.fromRotationTranslation(
      toFixed,
      Cartesian3.ZERO,
      this._polylineCollection.modelMatrix
    );
  }
};

PolylineUpdater.prototype.updateObject = function (time, item) {
  const entity = item.entity;
  const pathGraphics = entity._path;
  const positionProperty = entity._position;

  let sampleStart;
  let sampleStop;
  const showProperty = pathGraphics._show;
  let polyline = item.polyline;
  let show =
    entity.isShowing &&
    entity.isAvailable(time) &&
    (!defined(showProperty) || showProperty.getValue(time));

  //While we want to show the path, there may not actually be anything to show
  //depending on lead/trail settings.  Compute the interval of the path to
  //show and check against actual availability.
  if (show) {
    const leadTime = Property.getValueOrUndefined(pathGraphics._leadTime, time);
    const trailTime = Property.getValueOrUndefined(
      pathGraphics._trailTime,
      time
    );
    const availability = entity._availability;
    const hasAvailability = defined(availability);
    const hasLeadTime = defined(leadTime);
    const hasTrailTime = defined(trailTime);

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
        const start = availability.start;
        const stop = availability.stop;

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
    const unusedIndexes = this._unusedIndexes;
    const length = unusedIndexes.length;
    if (length > 0) {
      const index = unusedIndexes.pop();
      polyline = this._polylineCollection.get(index);
      item.index = index;
    } else {
      item.index = this._polylineCollection.length;
      polyline = this._polylineCollection.add();
    }
    polyline.id = entity;
    item.polyline = polyline;
  }

  const resolution = Property.getValueOrDefault(
    pathGraphics._resolution,
    time,
    defaultResolution
  );

  polyline.show = true;
  polyline.positions = subSample(
    positionProperty,
    sampleStart,
    sampleStop,
    time,
    this._referenceFrame,
    resolution,
    polyline.positions.slice()
  );
  polyline.material = MaterialProperty.getValue(
    time,
    pathGraphics._material,
    polyline.material
  );
  polyline.width = Property.getValueOrDefault(
    pathGraphics._width,
    time,
    defaultWidth
  );
  polyline.distanceDisplayCondition = Property.getValueOrUndefined(
    pathGraphics._distanceDisplayCondition,
    time,
    polyline.distanceDisplayCondition
  );
};

PolylineUpdater.prototype.removeObject = function (item) {
  const polyline = item.polyline;
  if (defined(polyline)) {
    this._unusedIndexes.push(item.index);
    item.polyline = undefined;
    polyline.show = false;
    polyline.id = undefined;
    item.index = undefined;
  }
};

PolylineUpdater.prototype.destroy = function () {
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
function PathVisualizer(scene, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  if (!defined(entityCollection)) {
    throw new DeveloperError("entityCollection is required.");
  }
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    PathVisualizer.prototype._onCollectionChanged,
    this
  );

  this._scene = scene;
  this._updaters = {};
  this._entityCollection = entityCollection;
  this._items = new AssociativeArray();

  this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
}

/**
 * Updates all of the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {boolean} This function always returns true.
 */
PathVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  const updaters = this._updaters;
  for (const key in updaters) {
    if (updaters.hasOwnProperty(key)) {
      updaters[key].update(time);
    }
  }

  const items = this._items.values;
  if (
    items.length === 0 &&
    defined(this._updaters) &&
    Object.keys(this._updaters).length > 0
  ) {
    for (const u in updaters) {
      if (updaters.hasOwnProperty(u)) {
        updaters[u].destroy();
      }
    }
    this._updaters = {};
  }

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];
    const entity = item.entity;
    const positionProperty = entity._position;

    const lastUpdater = item.updater;

    let frameToVisualize = ReferenceFrame.FIXED;
    if (this._scene.mode === SceneMode.SCENE3D) {
      frameToVisualize = positionProperty.referenceFrame;
    }

    let currentUpdater = this._updaters[frameToVisualize];

    if (lastUpdater === currentUpdater && defined(currentUpdater)) {
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
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 */
PathVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
PathVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    PathVisualizer.prototype._onCollectionChanged,
    this
  );

  const updaters = this._updaters;
  for (const key in updaters) {
    if (updaters.hasOwnProperty(key)) {
      updaters[key].destroy();
    }
  }

  return destroyObject(this);
};

PathVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed
) {
  let i;
  let entity;
  let item;
  const items = this._items;

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
        if (defined(item.updater)) {
          item.updater.removeObject(item);
        }
        items.remove(entity.id);
      }
    }
  }

  for (i = removed.length - 1; i > -1; i--) {
    entity = removed[i];
    item = items.get(entity.id);
    if (defined(item)) {
      if (defined(item.updater)) {
        item.updater.removeObject(item);
      }
      items.remove(entity.id);
    }
  }
};

//for testing
PathVisualizer._subSample = subSample;
export default PathVisualizer;
