/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlColor',
        './DynamicProperty',
        './DynamicMaterialProperty'
       ], function(
         TimeInterval,
         defaultValue,
         defined,
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
     * @alias DynamicCone
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicConeVisualizer
     * @see VisualizerCollection
     * @see ComplexConicSensor
     * @see CzmlDefaults
     */
    var DynamicCone = function() {
        /**
         * A DynamicProperty of type CzmlNumber which determines the cone's minimum clock-angle.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.minimumClockAngle = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the cone's maximum clock-angle.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.maximumClockAngle = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the cone's inner half-angle.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.innerHalfAngle = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the cone's outer half-angle.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.outerHalfAngle = undefined;
        /**
         * A DynamicMaterialProperty which determines the cone's cap material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.capMaterial = undefined;
        /**
         * A DynamicMaterialProperty which determines the cone's inner material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.innerMaterial = undefined;
        /**
         * A DynamicMaterialProperty which determines the cone's outer material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.outerMaterial = undefined;
        /**
         * A DynamicMaterialProperty which determines the cone's silhouette material.
         * @type {DynamicMaterialProperty}
         * @default undefined
         */
        this.silhouetteMaterial = undefined;
        /**
         * A DynamicProperty of type CzmlColor which determines the color of the line formed by the intersection of the cone and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionColor = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the approximate pixel width of the line formed by the intersection of the cone and other central bodies.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.intersectionWidth = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the cone's intersection visibility
         * @type {DynamicProperty}
         * @default undefined
         */
        this.showIntersection = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the cone's radius.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.radius = undefined;
        /**
         * A DynamicProperty of type CzmlBoolean which determines the cone's visibility
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's cone.
     * If the DynamicObject does not have a cone, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the cone data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicCone.processCzmlPacket = function(dynamicObject, packet) {
        var coneData = packet.cone;
        if (!defined(coneData)) {
            return false;
        }

        var coneUpdated = false;
        var cone = dynamicObject.cone;
        coneUpdated = !defined(cone);
        if (coneUpdated) {
            dynamicObject.cone = cone = new DynamicCone();
        }

        var interval = coneData.interval;
        if (defined(interval)) {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (defined(coneData.show)) {
            var show = cone.show;
            if (!defined(show)) {
                cone.show = show = new DynamicProperty(CzmlBoolean);
                coneUpdated = true;
            }
            show.processCzmlIntervals(coneData.show, interval);
        }

        if (defined(coneData.innerHalfAngle)) {
            var innerHalfAngle = cone.innerHalfAngle;
            if (!defined(innerHalfAngle)) {
                cone.innerHalfAngle = innerHalfAngle = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            innerHalfAngle.processCzmlIntervals(coneData.innerHalfAngle, interval);
        }

        if (defined(coneData.outerHalfAngle)) {
            var outerHalfAngle = cone.outerHalfAngle;
            if (!defined(outerHalfAngle)) {
                cone.outerHalfAngle = outerHalfAngle = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            outerHalfAngle.processCzmlIntervals(coneData.outerHalfAngle, interval);
        }

        if (defined(coneData.minimumClockAngle)) {
            var minimumClockAngle = cone.minimumClockAngle;
            if (!defined(minimumClockAngle)) {
                cone.minimumClockAngle = minimumClockAngle = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            minimumClockAngle.processCzmlIntervals(coneData.minimumClockAngle, interval);
        }

        if (defined(coneData.maximumClockAngle)) {
            var maximumClockAngle = cone.maximumClockAngle;
            if (!defined(maximumClockAngle)) {
                cone.maximumClockAngle = maximumClockAngle = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            maximumClockAngle.processCzmlIntervals(coneData.maximumClockAngle, interval);
        }

        if (defined(coneData.radius)) {
            var radius = cone.radius;
            if (!defined(radius)) {
                cone.radius = radius = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            radius.processCzmlIntervals(coneData.radius, interval);
        }

        if (defined(coneData.showIntersection)) {
            var showIntersection = cone.showIntersection;
            if (!defined(showIntersection)) {
                cone.showIntersection = showIntersection = new DynamicProperty(CzmlBoolean);
                coneUpdated = true;
            }
            showIntersection.processCzmlIntervals(coneData.showIntersection, interval);
        }

        if (defined(coneData.intersectionColor)) {
            var intersectionColor = cone.intersectionColor;
            if (!defined(intersectionColor)) {
                cone.intersectionColor = intersectionColor = new DynamicProperty(CzmlColor);
                coneUpdated = true;
            }
            intersectionColor.processCzmlIntervals(coneData.intersectionColor, interval);
        }

        if (defined(coneData.intersectionWidth)) {
            var intersectionWidth = cone.intersectionWidth;
            if (!defined(intersectionWidth)) {
                cone.intersectionWidth = intersectionWidth = new DynamicProperty(CzmlNumber);
                coneUpdated = true;
            }
            intersectionWidth.processCzmlIntervals(coneData.intersectionWidth, interval);
        }

        if (defined(coneData.capMaterial)) {
            var capMaterial = cone.capMaterial;
            if (!defined(capMaterial)) {
                cone.capMaterial = capMaterial = new DynamicMaterialProperty();
                coneUpdated = true;
            }
            capMaterial.processCzmlIntervals(coneData.capMaterial, interval);
        }

        if (defined(coneData.innerMaterial)) {
            var innerMaterial = cone.innerMaterial;
            if (!defined(innerMaterial)) {
                cone.innerMaterial = innerMaterial = new DynamicMaterialProperty();
                coneUpdated = true;
            }
            innerMaterial.processCzmlIntervals(coneData.innerMaterial, interval);
        }

        if (defined(coneData.outerMaterial)) {
            var outerMaterial = cone.outerMaterial;
            if (!defined(outerMaterial)) {
                cone.outerMaterial = outerMaterial = new DynamicMaterialProperty();
                coneUpdated = true;
            }
            outerMaterial.processCzmlIntervals(coneData.outerMaterial, interval);
        }

        if (defined(coneData.silhouetteMaterial)) {
            var silhouetteMaterial = cone.silhouetteMaterial;
            if (!defined(silhouetteMaterial)) {
                cone.silhouetteMaterial = silhouetteMaterial = new DynamicMaterialProperty();
                coneUpdated = true;
            }
            silhouetteMaterial.processCzmlIntervals(coneData.silhouetteMaterial, interval);
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
     * @see CzmlDefaults
     */
    DynamicCone.mergeProperties = function(targetObject, objectToMerge) {
        var coneToMerge = objectToMerge.cone;
        if (defined(coneToMerge)) {

            var targetCone = targetObject.cone;
            if (!defined(targetCone)) {
                targetObject.cone = targetCone = new DynamicCone();
            }

            targetCone.show = defaultValue(targetCone.show, coneToMerge.show);
            targetCone.innerHalfAngle = defaultValue(targetCone.innerHalfAngle, coneToMerge.innerHalfAngle);
            targetCone.outerHalfAngle = defaultValue(targetCone.outerHalfAngle, coneToMerge.outerHalfAngle);
            targetCone.minimumClockAngle = defaultValue(targetCone.minimumClockAngle, coneToMerge.minimumClockAngle);
            targetCone.maximumClockAngle = defaultValue(targetCone.maximumClockAngle, coneToMerge.maximumClockAngle);
            targetCone.radius = defaultValue(targetCone.radius, coneToMerge.radius);
            targetCone.showIntersection = defaultValue(targetCone.showIntersection, coneToMerge.showIntersection);
            targetCone.intersectionColor = defaultValue(targetCone.intersectionColor, coneToMerge.intersectionColor);
            targetCone.intersectionWidth = defaultValue(targetCone.intersectionWidth, coneToMerge.intersectionWidth);
            targetCone.capMaterial = defaultValue(targetCone.capMaterial, coneToMerge.capMaterial);
            targetCone.innerMaterial = defaultValue(targetCone.innerMaterial, coneToMerge.innerMaterial);
            targetCone.outerMaterial = defaultValue(targetCone.outerMaterial, coneToMerge.outerMaterial);
            targetCone.silhouetteMaterial = defaultValue(targetCone.silhouetteMaterial, coneToMerge.silhouetteMaterial);
        }
    };

    /**
     * Given a DynamicObject, undefines the cone associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the cone from.
     *
     * @see CzmlDefaults
     */
    DynamicCone.undefineProperties = function(dynamicObject) {
        dynamicObject.cone = undefined;
    };

    return DynamicCone;
});
