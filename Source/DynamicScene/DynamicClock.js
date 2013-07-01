/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/Iso8601',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/JulianDate'
    ], function(
        TimeInterval,
        Iso8601,
        ClockRange,
        ClockStep,
        JulianDate) {
    "use strict";

    /**
     * Represents CZML document-level clock settings.
     *
     * @alias DynamicClock
     * @constructor
     */
    var DynamicClock = function() {
        /**
         * The start time of the clock to use when looping or clamped.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.start}
         */
        this.startTime = Iso8601.MAXIMUM_INTERVAL.start;

        /**
         * The stop time of the clock to use when looping or clamped.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.stop}
         */
        this.stopTime = Iso8601.MAXIMUM_INTERVAL.stop;

        /**
         * The initial time to use when switching to this clock.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.start}
         */
        this.currentTime = Iso8601.MAXIMUM_INTERVAL.start;

        /**
         * Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type {ClockRange}
         * @default {@link ClockRange.LOOP_STOP}
         */
        this.clockRange = ClockRange.LOOP_STOP;

        /**
         * Determines if clock advancement is frame dependent or system clock dependent.
         * @type {ClockStep}
         * @default {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}
         */
        this.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;

        /**
         * Determines how much time advances with each tick, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @type {Number}
         * @default 1.0
         */
        this.multiplier = 1.0;
    };

    /**
     * Duplicates a DynamicClock instance.
     * @memberof DynamicClock
     *
     * @param {DynamicClock} [result] The object onto which to store the result.
     * @return {DynamicClock} The modified result parameter or a new DynamicClock instance if one was not provided.
     */
    DynamicClock.prototype.clone = function(result) {
        if (typeof result === 'undefined') {
            result = new DynamicClock();
        }
        result.startTime = this.startTime;
        result.stopTime = this.stopTime;
        result.clockRange = this.clockRange;
        result.clockStep = this.clockStep;
        result.multiplier = this.multiplier;
        result.currentTime = this.currentTime;
        return result;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's clock.
     * @memberof DynamicClock
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the clock data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The collection into which objects are being loaded.
     * @param {String} [sourceUri] The originating url of the CZML being processed.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicClock.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var clockUpdated = false;
        var clockPacket = packet.clock;
        if (typeof clockPacket !== 'undefined') {
            if (dynamicObject.id === 'document') {
                var clock = dynamicObject.clock;
                if (typeof clock === 'undefined') {
                    clock = new DynamicClock();
                    dynamicObject.clock = clock;
                    clockUpdated = true;
                }

                if (typeof clockPacket.interval !== 'undefined') {
                    var interval = TimeInterval.fromIso8601(clockPacket.interval);
                    if (typeof interval !== 'undefined') {
                        clock.startTime = interval.start;
                        clock.stopTime = interval.stop;
                    }
                }
                if (typeof clockPacket.currentTime !== 'undefined') {
                    clock.currentTime = JulianDate.fromIso8601(clockPacket.currentTime);
                }
                if (typeof typeof clockPacket.range !== 'undefined') {
                    clock.clockRange = ClockRange[clockPacket.range];
                }
                if (typeof clockPacket.step !== 'undefined') {
                    clock.clockStep = ClockStep[clockPacket.step];
                }
                if (typeof clockPacket.multiplier !== 'undefined') {
                    clock.multiplier = clockPacket.multiplier;
                }
            }
        }

        return clockUpdated;
    };

    /**
     * Given two DynamicObjects, takes the clock properties from the second
     * and assigns them to the first.
     * @memberof DynamicClock
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicClock.mergeProperties = function(targetObject, objectToMerge) {
        var clockToMerge = objectToMerge.clock;
        if (typeof clockToMerge !== 'undefined') {

            var targetClock = targetObject.clock;
            if (typeof targetClock === 'undefined') {
                targetClock = new DynamicClock();
                targetObject.clock = targetClock;
            }

            targetClock.startTime = clockToMerge.startTime;
            targetClock.stopTime = clockToMerge.stopTime;
            targetClock.currentTime = clockToMerge.currentTime;
            targetClock.clockRange = clockToMerge.clockRange;
            targetClock.clockStep = clockToMerge.clockStep;
            targetClock.multiplier = clockToMerge.multiplier;
        }
    };

    /**
     * Given a DynamicObject, undefines the clock associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     * @memberof DynamicClock
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the clock from.
     *
     * @see CzmlDefaults
     */
    DynamicClock.undefineProperties = function(dynamicObject) {
        dynamicObject.clock = undefined;
    };

    return DynamicClock;
});
