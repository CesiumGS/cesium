/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/Iso8601',
        './CompositeProperty',
        './ConstantProperty',
        './SampledProperty',
        './TimeIntervalCollectionProperty'
    ], function(
        TimeInterval,
        Iso8601,
        CompositeProperty,
        ConstantProperty,
        SampledProperty,
        TimeIntervalCollectionProperty) {
    "use strict";

    function processProperty(type, object, propertyName, packetData, interval, sourceUri) {
        var combinedInterval;
        var packetInterval = packetData.interval;
        if (typeof packetInterval !== 'undefined') {
            combinedInterval = TimeInterval.fromIso8601(packetInterval);
            if (typeof interval !== 'undefined') {
                combinedInterval = combinedInterval.intersect(interval);
            }
        } else if (typeof interval !== 'undefined') {
            combinedInterval = interval;
        }

        var unwrappedInterval = type.unwrapInterval(packetData, sourceUri);

        var hasInterval = typeof combinedInterval !== 'undefined' && !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);
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

            if (typeof property === 'undefined') {
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
                property = new SampledProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }
            property.addSamplesFlatArray(unwrappedInterval, packetData.epoch);
        } else if (isSampled && hasInterval) {
            if (typeof property === 'undefined') {
                property = new CompositeProperty();
                object[propertyName] = property;
                propertyCreated = true;
            }
            if (property instanceof CompositeProperty) {
                property.addSamplesFlatArray(unwrappedInterval, packetData.epoch);
            } else {
                //TODO
            }
        }
        return propertyCreated;
    }

    function processPacketData(type, object, propertyName, packetData, interval, sourceUri) {
        if (typeof packetData === 'undefined') {
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
