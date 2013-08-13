/*global define*/
define([
        '../Core/defined',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        '../Core/JulianDate',
        './CompositeProperty',
        './ConstantProperty',
        './SampledProperty',
        './TimeIntervalCollectionProperty'
    ], function(
        defined,
        TimeInterval,
        Iso8601,
        JulianDate,
        CompositeProperty,
        ConstantProperty,
        SampledProperty,
        TimeIntervalCollectionProperty) {
    "use strict";

    function processProperty(type, object, propertyName, packetData, constrainedInterval, sourceUri) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (defined(packetInterval)) {
            combinedInterval = TimeInterval.fromIso8601(packetInterval);
            if (defined(constrainedInterval)) {
                combinedInterval = combinedInterval.intersect(constrainedInterval);
            }
        } else if (defined(constrainedInterval)) {
            combinedInterval = constrainedInterval;
        }

        var unwrappedInterval = type.unwrapInterval(packetData, sourceUri);

        var hasInterval = defined(combinedInterval) && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);
        var isSampled = type.isSampled(unwrappedInterval);
        if (!isSampled && !hasInterval) {
            object[propertyName] = new ConstantProperty(type.getValue(unwrappedInterval));
            return true;
        }

        var propertyCreated = false;
        var property = object[propertyName];
        if (!isSampled && hasInterval) {
            combinedInterval = combinedInterval.clone();
            combinedInterval.data = type.getValue(unwrappedInterval);

            if (!defined(property)) {
                property = new TimeIntervalCollectionProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }

            if (property instanceof TimeIntervalCollectionProperty) {
                property.getIntervals().addInterval(combinedInterval);
            } else {
                //TODO
            }
        } else if (isSampled && !hasInterval) {
            if (!(property instanceof SampledProperty)) {
                property = new SampledProperty(type.type);
                object[propertyName] = property;
                propertyCreated = true;
            }
            property.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
        } else if (isSampled && hasInterval) {
            if (!defined(property)) {
                property = new CompositeProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }
            if (property instanceof CompositeProperty) {
                var intervals = property.getIntervals();
                var interval = intervals.findInterval(combinedInterval.start, combinedInterval.stop, combinedInterval.isStartIncluded, combinedInterval.isStopIncluded);
                var intervalData;
                if (defined(interval)) {
                    intervalData = interval.data;
                } else {
                    interval = combinedInterval.clone();
                    intervalData = new SampledProperty(type.type);
                    interval.data = intervalData;
                    intervals.addInterval(interval);
                }
                if (!(intervalData instanceof SampledProperty)) {
                    intervalData = new SampledProperty(type.type);
                    interval.Data = intervalData;
                }
                intervalData.addSamplesFlatArray(unwrappedInterval, JulianDate.fromIso8601(packetData.epoch));
            } else {
                //TODO
            }
        }
        return propertyCreated;
    }

    function processPacketData(type, object, propertyName, packetData, interval, sourceUri) {
        if (!defined(packetData)) {
            return false;
        }

        var updated = false;
        if (Array.isArray(packetData)) {
            for ( var i = 0, len = packetData.length; i < len; i++) {
                updated = processProperty(type, object, propertyName, packetData[i], interval, sourceUri) || updated;
            }
        } else {
            updated = processProperty(type, object, propertyName, packetData, interval, sourceUri) || updated;
        }
        return updated;
    }

    return processPacketData;
});
