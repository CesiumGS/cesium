/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Scene/HorizontalOrigin',
        '../Scene/VerticalOrigin',
        '../Core/Color'
    ], function(
        TimeInterval,
        defaultValue,
        defined,
        Cartesian2,
        Cartesian3,
        HorizontalOrigin,
        VerticalOrigin,
        Color) {
    "use strict";

    /**
     * Represents a time-dynamic billboard, typically used in conjunction with DynamicBillboardVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicBillboard
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicBillboardVisualizer
     * @see VisualizerCollection
     * @see Billboard
     * @see BillboardCollection
     * @see CzmlDefaults
     */
    var DynamicBillboard = function() {
        /**
         * A DynamicProperty of type Image which determines the billboard's texture.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.image = undefined;
        /**
         * A DynamicProperty of type Number which determines the billboard's scale.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.scale = undefined;
        /**
         * A DynamicProperty of type Number which determines the billboard's rotation.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.rotation = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the billboard's aligned axis.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.alignedAxis = undefined;
        /**
         * A DynamicProperty of type HorizontalOrigin which determines the billboard's horizontal origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.horizontalOrigin = undefined;
        /**
         * A DynamicProperty of type VerticalOrigin which determines the billboard's vertical origin.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.verticalOrigin = undefined;
        /**
         * A DynamicProperty of type Color which determines the billboard's color.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.color = undefined;
        /**
         * A DynamicProperty of type Cartesian3 which determines the billboard's eye offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.eyeOffset = undefined;
        /**
         * A DynamicProperty of type Cartesian2 which determines the billboard's pixel offset.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.pixelOffset = undefined;
        /**
         * A DynamicProperty of type Boolean which determines the billboard's visibility.
         * @type {DynamicProperty}
         * @default undefined
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the billboard properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicBillboard.mergeProperties = function(targetObject, objectToMerge) {
        var billboardToMerge = objectToMerge.billboard;
        if (defined(billboardToMerge)) {

            var targetBillboard = targetObject.billboard;
            if (!defined(targetBillboard)) {
                targetObject.billboard = targetBillboard = new DynamicBillboard();
            }

            targetBillboard.color = defaultValue(targetBillboard.color, billboardToMerge.color);
            targetBillboard.eyeOffset = defaultValue(targetBillboard.eyeOffset, billboardToMerge.eyeOffset);
            targetBillboard.horizontalOrigin = defaultValue(targetBillboard.horizontalOrigin, billboardToMerge.horizontalOrigin);
            targetBillboard.image = defaultValue(targetBillboard.image, billboardToMerge.image);
            targetBillboard.pixelOffset = defaultValue(targetBillboard.pixelOffset, billboardToMerge.pixelOffset);
            targetBillboard.scale = defaultValue(targetBillboard.scale, billboardToMerge.scale);
            targetBillboard.rotation = defaultValue(targetBillboard.rotation, billboardToMerge.rotation);
            targetBillboard.alignedAxis = defaultValue(targetBillboard.alignedAxis, billboardToMerge.alignedAxis);
            targetBillboard.show = defaultValue(targetBillboard.show, billboardToMerge.show);
            targetBillboard.verticalOrigin = defaultValue(targetBillboard.verticalOrigin, billboardToMerge.verticalOrigin);
        }
    };

    /**
     * Given a DynamicObject, undefines the billboard associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the billboard from.
     *
     * @see CzmlDefaults
     */
    DynamicBillboard.undefineProperties = function(dynamicObject) {
        dynamicObject.billboard = undefined;
    };

    return DynamicBillboard;
});
