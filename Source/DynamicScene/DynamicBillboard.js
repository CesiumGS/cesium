/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * An optionally time-dynamic billboard.
     *
     * @alias DynamicBillboard
     * @constructor
     */
    var DynamicBillboard = function() {
        /**
         * Gets or sets the string {@link Property} specifying the URL of the billboard's texture.
         * @type {Property}
         */
        this.image = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's scale.
         * @type {Property}
         */
        this.scale = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's rotation.
         * @type {Property}
         */
        this.rotation = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard rotation's aligned axis.
         * @type {Property}
         */
        this.alignedAxis = undefined;
        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the billboard's horizontal origin.
         * @type {Property}
         */
        this.horizontalOrigin = undefined;
        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the billboard's vertical origin.
         * @type {Property}
         */
        this.verticalOrigin = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the billboard's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard's eye offset.
         * @type {Property}
         */
        this.eyeOffset = undefined;
        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the billboard's pixel offset.
         * @type {Property}
         */
        this.pixelOffset = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the billboard's visibility.
         * @type {Property}
         */
        this.show = undefined;
    };

    /**
     * Given two DynamicObjects, takes the billboard properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
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
     * @memberof DynamicBillboard
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the billboard from.
     */
    DynamicBillboard.undefineProperties = function(dynamicObject) {
        dynamicObject.billboard = undefined;
    };

    return DynamicBillboard;
});
