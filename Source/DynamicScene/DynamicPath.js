/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * A time-dynamic path representing the visualization of a moving object.
     * @alias DynamicPath
     * @constructor
     */
    var DynamicPath = function() {
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the path's color.
         * @type {Property}
         */
        this.color = undefined;
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the the path's outline color.
         * @type {Property}
         */
        this.outlineColor = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the path's outline width.
         * @type {Property}
         */
        this.outlineWidth = undefined;
        /**
         * Gets or sets the boolean {@link Property} specifying the path's visibility.
         * @type {Property}
         */
        this.show = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the the path's width.
         * @type {Property}
         */
        this.width = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the maximum step size, in seconds, to take when sampling the position.
         * @type {Property}
         */
        this.resolution = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds in front of the object to show.
         * @type {Property}
         */
        this.leadTime = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the number of seconds behind the object to show.
         * @type {Property}
         */
        this.trailTime = undefined;
    };

    /**
     * Given two DynamicObjects, takes the path properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicPath.mergeProperties = function(targetObject, objectToMerge) {
        var pathToMerge = objectToMerge.path;
        if (defined(pathToMerge)) {

            var targetpath = targetObject.path;
            if (!defined(targetpath)) {
                targetObject.path = targetpath = new DynamicPath();
            }

            targetpath.color = defaultValue(targetpath.color, pathToMerge.color);
            targetpath.width = defaultValue(targetpath.width, pathToMerge.width);
            targetpath.resolution = defaultValue(targetpath.resolution, pathToMerge.resolution);
            targetpath.outlineColor = defaultValue(targetpath.outlineColor, pathToMerge.outlineColor);
            targetpath.outlineWidth = defaultValue(targetpath.outlineWidth, pathToMerge.outlineWidth);
            targetpath.show = defaultValue(targetpath.show, pathToMerge.show);
            targetpath.leadTime = defaultValue(targetpath.leadTime, pathToMerge.leadTime);
            targetpath.trailTime = defaultValue(targetpath.trailTime, pathToMerge.trailTime);
        }
    };

    /**
     * Given a DynamicObject, undefines the path associated with it.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the path from.
     */
    DynamicPath.undefineProperties = function(dynamicObject) {
        dynamicObject.path = undefined;
    };

    return DynamicPath;
});
