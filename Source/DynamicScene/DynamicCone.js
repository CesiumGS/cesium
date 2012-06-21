/*global define*/
define([
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty',
        './DynamicMaterialProperty'
       ], function(
         TimeInterval,
         CzmlBoolean,
         CzmlNumber,
         CzmlColor,
         DynamicProperty,
         DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic cone, typically used in conjunction with DynamicConeVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @name DynamicCone
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicConeVisualizer
     * @see VisualizerCollection
     * @see ComplexConicSensor
     * @see CzmlStandard
     */
    function DynamicCone() {
        this.capMaterial = undefined;
        this.innerHalfAngle = undefined;
        this.innerMaterial = undefined;
        this.intersectionColor = undefined;
        this.maximumClockAngle = undefined;
        this.minimumClockAngle = undefined;
        this.outerHalfAngle = undefined;
        this.outerMaterial = undefined;
        this.radius = undefined;
        this.show = undefined;
        this.showIntersection = undefined;
        this.silhouetteMaterial = undefined;
    }

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's cone.
     * If the DynamicObject does not have a cone, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param dynamicObject The DynamicObject which will contain the cone data.
     * @param packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlStandard#updaters
     */
    DynamicCone.processCzmlPacket = function(dynamicObject, packet) {
        var coneData = packet.cone;
        var coneUpdated = false;
        if (typeof coneData !== 'undefined') {
            var cone = dynamicObject.cone;
            coneUpdated = typeof cone === 'undefined';
            if (coneUpdated) {
                dynamicObject.cone = cone = new DynamicCone();
            }

            var interval = coneData.interval;
            if (typeof interval !== 'undefined') {
                interval = TimeInterval.fromIso8601(interval);
            }

            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'show', CzmlBoolean, coneData.show, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'innerHalfAngle', CzmlNumber, coneData.innerHalfAngle, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'outerHalfAngle', CzmlNumber, coneData.outerHalfAngle, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'minimumClockAngle', CzmlNumber, coneData.minimumClockAngle, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'maximumClockAngle', CzmlNumber, coneData.maximumClockAngle, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'radius', CzmlNumber, coneData.radius, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'showIntersection', CzmlBoolean, coneData.showIntersection, interval) || coneUpdated;
            coneUpdated = DynamicProperty.processCzmlPacket(cone, 'intersectionColor', CzmlColor, coneData.intersectionColor, interval) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, 'capMaterial', coneData.capMaterial, interval) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, 'innerMaterial', coneData.innerMaterial, interval) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, 'outerMaterial', coneData.outerMaterial, interval) || coneUpdated;
            coneUpdated = DynamicMaterialProperty.processCzmlPacket(cone, 'silhouetteMaterial', coneData.silhouetteMaterial, interval) || coneUpdated;
        }
        return coneUpdated;
    };

    /**
     * Given two DynamicObjects, takes the cone properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlStandard
     */
    DynamicCone.mergeProperties = function(targetObject, objectToMerge) {
        var coneToMerge = objectToMerge.cone;
        if (typeof coneToMerge !== 'undefined') {

            var targetCone = targetObject.cone;
            if (typeof targetCone === 'undefined') {
                targetObject.cone = targetCone = new DynamicCone();
            }

            targetCone.show = targetCone.show || coneToMerge.show;
            targetCone.innerHalfAngle = targetCone.innerHalfAngle || coneToMerge.innerHalfAngle;
            targetCone.outerHalfAngle = targetCone.outerHalfAngle || coneToMerge.outerHalfAngle;
            targetCone.minimumClockAngle = targetCone.minimumClockAngle || coneToMerge.minimumClockAngle;
            targetCone.maximumClockAngle = targetCone.maximumClockAngle || coneToMerge.maximumClockAngle;
            targetCone.radius = targetCone.radius || coneToMerge.radius;
            targetCone.showIntersection = targetCone.showIntersection || coneToMerge.showIntersection;
            targetCone.intersectionColor = targetCone.intersectionColor || coneToMerge.intersectionColor;
            targetCone.capMaterial = targetCone.capMaterial || coneToMerge.capMaterial;
            targetCone.innerMaterial = targetCone.innerMaterial || coneToMerge.innerMaterial;
            targetCone.outerMaterial = targetCone.outerMaterial || coneToMerge.outerMaterial;
            targetCone.silhouetteMaterial = targetCone.silhouetteMaterial || coneToMerge.silhouetteMaterial;
        }
    };

    /**
     * Given a DynamicObject, undefines the cone associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the cone from.
     *
     * @see CzmlStandard
     */
    DynamicCone.undefineProperties = function(dynamicObject) {
        dynamicObject.cone = undefined;
    };

    return DynamicCone;
});