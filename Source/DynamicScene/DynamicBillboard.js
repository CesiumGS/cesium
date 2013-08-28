/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        Event) {
    "use strict";

    /**
     * An optionally time-dynamic billboard.
     *
     * @alias DynamicBillboard
     * @constructor
     */
    var DynamicBillboard = function() {
        this._image = undefined;
        this._scale = undefined;
        this._rotation = undefined;
        this._alignedAxis = undefined;
        this._horizontalOrigin = undefined;
        this._verticalOrigin = undefined;
        this._color = undefined;
        this._eyeOffset = undefined;
        this._pixelOffset = undefined;
        this._show = undefined;
        this._propertyAssigned = new Event();
    };

    defineProperties(DynamicBillboard.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicBillboard.prototype
         * @type {Event}
         */
        propertyAssigned : {
            get : function() {
                return this._propertyAssigned;
            }
        },

        /**
         * Gets or sets the string {@link Property} specifying the URL of the billboard's texture.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        image : {
            get : function() {
                return this._image;
            },
            set : function(value) {
                var oldValue = this._image;
                this._image = value;
                this._propertyAssigned.raiseEvent(this, 'image', value, oldValue);
            }
        },

        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's scale.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        scale : {
            get : function() {
                return this._scale;
            },
            set : function(value) {
                var oldValue = this._scale;
                this._scale = value;
                this._propertyAssigned.raiseEvent(this, 'scale', value, oldValue);
            }
        },
        /**
         * Gets or sets the numeric {@link Property} specifying the billboard's rotation.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        rotation : {
            get : function() {
                return this._rotation;
            },
            set : function(value) {
                var oldValue = this._rotation;
                this._rotation = value;
                this._propertyAssigned.raiseEvent(this, 'rotation', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard rotation's aligned axis.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        alignedAxis : {
            get : function() {
                return this._alignedAxis;
            },
            set : function(value) {
                var oldValue = this._alignedAxis;
                this._alignedAxis = value;
                this._propertyAssigned.raiseEvent(this, 'alignedAxis', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link HorizontalOrigin} {@link Property} specifying the billboard's horizontal origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        horizontalOrigin : {
            get : function() {
                return this._horizontalOrigin;
            },
            set : function(value) {
                var oldValue = this._horizontalOrigin;
                this._horizontalOrigin = value;
                this._propertyAssigned.raiseEvent(this, 'horizontalOrigin', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link VerticalOrigin} {@link Property} specifying the billboard's vertical origin.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        verticalOrigin : {
            get : function() {
                return this._verticalOrigin;
            },
            set : function(value) {
                var oldValue = this._verticalOrigin;
                this._verticalOrigin = value;
                this._propertyAssigned.raiseEvent(this, 'verticalOrigin', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link Color} {@link Property} specifying the billboard's color.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        color : {
            get : function() {
                return this._color;
            },
            set : function(value) {
                var oldValue = this._color;
                this._color = value;
                this._propertyAssigned.raiseEvent(this, 'color', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link Cartesian3} {@link Property} specifying the billboard's eye offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        eyeOffset : {
            get : function() {
                return this._eyeOffset;
            },
            set : function(value) {
                var oldValue = this._eyeOffset;
                this._eyeOffset = value;
                this._propertyAssigned.raiseEvent(this, 'eyeOffset', value, oldValue);
            }
        },
        /**
         * Gets or sets the {@link Cartesian2} {@link Property} specifying the billboard's pixel offset.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        pixelOffset : {
            get : function() {
                return this._pixelOffset;
            },
            set : function(value) {
                var oldValue = this._pixelOffset;
                this._pixelOffset = value;
                this._propertyAssigned.raiseEvent(this, 'pixelOffset', value, oldValue);
            }
        },
        /**
         * Gets or sets the boolean {@link Property} specifying the billboard's visibility.
         * @memberof DynamicBillboard.prototype
         * @type {Property}
         */
        show : {
            get : function() {
                return this._show;
            },
            set : function(value) {
                var oldValue = this._show;
                this._show = value;
                this._propertyAssigned.raiseEvent(this, 'show', value, oldValue);
            }
        }
    });

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
