/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Color',
        './processPacketData'],
function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian3,
        Color,
        processPacketData) {
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
         * A DynamicProperty of type Color which determines the vector's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the vector's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
        /**
         * A DynamicProperty of type Number which determines the vector's width.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.width = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the vector's direction.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.direction = undefined;
        /**
         * A DynamicProperty of type Number which determines the vector's graphical length.
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
    DynamicVector.processCzmlPacket = function(dynamicObject, packet, dynamicObjectCollection, sourceUri) {
        var vectorData = packet.vector;
        if (!defined(vectorData)) {
            return false;
        }

        var interval = vectorData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        var vector = dynamicObject.vector;
        var vectorUpdated = !defined(vector);
        if (vectorUpdated) {
            dynamicObject.vector = vector = new DynamicVector();
        }

        vectorUpdated = processPacketData(Color, vector, 'color', vectorData.color, interval, sourceUri) || vectorUpdated;
        vectorUpdated = processPacketData(Boolean, vector, 'show', vectorData.show, interval, sourceUri) || vectorUpdated;
        vectorUpdated = processPacketData(Number, vector, 'width', vectorData.width, interval, sourceUri) || vectorUpdated;
        vectorUpdated = processPacketData(Cartesian3, vector, 'direction', vectorData.direction, interval, sourceUri) || vectorUpdated;
        vectorUpdated = processPacketData(Number, vector, 'length', vectorData.length, interval, sourceUri) || vectorUpdated;

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
        if (defined(vectorToMerge)) {

            var targetVector = targetObject.vector;
            if (!defined(targetVector)) {
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
