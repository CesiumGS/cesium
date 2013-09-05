/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
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
                if (oldValue !== value) {
                    this._image = value;
                    this._propertyAssigned.raiseEvent(this, 'image', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._scale = value;
                    this._propertyAssigned.raiseEvent(this, 'scale', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._rotation = value;
                    this._propertyAssigned.raiseEvent(this, 'rotation', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._alignedAxis = value;
                    this._propertyAssigned.raiseEvent(this, 'alignedAxis', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._horizontalOrigin = value;
                    this._propertyAssigned.raiseEvent(this, 'horizontalOrigin', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._verticalOrigin = value;
                    this._propertyAssigned.raiseEvent(this, 'verticalOrigin', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._color = value;
                    this._propertyAssigned.raiseEvent(this, 'color', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._eyeOffset = value;
                    this._propertyAssigned.raiseEvent(this, 'eyeOffset', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._pixelOffset = value;
                    this._propertyAssigned.raiseEvent(this, 'pixelOffset', value, oldValue);
                }
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
                if (oldValue !== value) {
                    this._show = value;
                    this._propertyAssigned.raiseEvent(this, 'show', value, oldValue);
                }
            }
        }
    });

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicBillboard} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicBillboard.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.color = defaultValue(this.color, source.color);
        this.eyeOffset = defaultValue(this.eyeOffset, source.eyeOffset);
        this.horizontalOrigin = defaultValue(this.horizontalOrigin, source.horizontalOrigin);
        this.image = defaultValue(this.image, source.image);
        this.pixelOffset = defaultValue(this.pixelOffset, source.pixelOffset);
        this.scale = defaultValue(this.scale, source.scale);
        this.rotation = defaultValue(this.rotation, source.rotation);
        this.alignedAxis = defaultValue(this.alignedAxis, source.alignedAxis);
        this.show = defaultValue(this.show, source.show);
        this.verticalOrigin = defaultValue(this.verticalOrigin, source.verticalOrigin);
    };

    return DynamicBillboard;
});
