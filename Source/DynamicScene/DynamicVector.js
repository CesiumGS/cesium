/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        './CzmlBoolean',
        './CzmlDirection',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty'],
function(
        TimeInterval,
        defaultValue,
        CzmlBoolean,
        CzmlDirection,
        CzmlNumber,
        CzmlColor,
        DynamicProperty) {
    "use strict";

    /**
     * Represents a time-dynamic vector, typically used in conjunction with DynamicVectorVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicVector
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicVectorVisualizer
     * @see VisualizerCollection
     * @see CzmlDefaults
     */
    var DynamicVector = function() {
        /**
         * A DynamicProperty of type CzmlColor which determines the vector's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the vector's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the vector's width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type CzmlDirection which determines the vector's direction.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.direction = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the vector's graphical length.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.length = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's vector.
     * If the DynamicObject does not have a vector, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the vector data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicVector.processCzmlPacket = function(dynamicObject, packet) {
        var vectorData = packet.vector;
        if (typeof vectorData === 'undefined') {
            return false;
        }

        var vectorUpdated = false;
        var vector = dynamicObject.vector;
        vectorUpdated = typeof vector === 'undefined';
        if (vectorUpdated) {
            dynamicObject.vector = vector = new DynamicVector();
        }

        var interval = vectorData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof vectorData.color !== 'undefined') {
            var color = vector.color;
            if (typeof color === 'undefined') {
                vector.color = color = new DynamicProperty(CzmlColor);
                vectorUpdated = true;
            }
            color.processCzmlIntervals(vectorData.color, interval);
        }

        if (typeof vectorData.width !== 'undefined') {
            var width = vector.width;
            if (typeof width === 'undefined') {
                vector.width = width = new DynamicProperty(CzmlNumber);
                vectorUpdated = true;
            }
            width.processCzmlIntervals(vectorData.width, interval);
        }

        if (typeof vectorData.direction !== 'undefined') {
            var direction = vector.direction;
            if (typeof direction === 'undefined') {
                vector.direction = direction = new DynamicProperty(CzmlDirection);
                vectorUpdated = true;
            }
            direction.processCzmlIntervals(vectorData.direction, interval);
        }

        if (typeof vectorData.length !== 'undefined') {
            var length = vector.length;
            if (typeof length === 'undefined') {
                vector.length = length = new DynamicProperty(CzmlNumber);
                vectorUpdated = true;
            }
            length.processCzmlIntervals(vectorData.length, interval);
        }

        if (typeof vectorData.show !== 'undefined') {
            var show = vector.show;
            if (typeof show === 'undefined') {
                vector.show = show = new DynamicProperty(CzmlBoolean);
                vectorUpdated = true;
            }
            show.processCzmlIntervals(vectorData.show, interval);
        }
        return vectorUpdated;
    };

    /**
     * Given two DynamicObjects, takes the vector properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicVector.mergeProperties = function(targetObject, objectToMerge) {
        var vectorToMerge = objectToMerge.vector;
        if (typeof vectorToMerge !== 'undefined') {

            var targetVector = targetObject.vector;
            if (typeof targetVector === 'undefined') {
                targetObject.vector = targetVector = new DynamicVector();
            }

            targetVector.color = defaultValue(targetVector.color, vectorToMerge.color);
            targetVector.width = defaultValue(targetVector.width, vectorToMerge.width);
            targetVector.direction = defaultValue(targetVector.direction, vectorToMerge.direction);
            targetVector.length = defaultValue(targetVector.length, vectorToMerge.length);
            targetVector.show = defaultValue(targetVector.show, vectorToMerge.show);
        }
    };

    /**
     * Given a DynamicObject, undefines the vector associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the vector from.
     *
     * @see CzmlDefaults
     */
    DynamicVector.undefineProperties = function(dynamicObject) {
        dynamicObject.vector = undefined;
    };

    return DynamicVector;
});
