/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/WallGeometry',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        WallGeometry,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * @constructor
     * @param {ConstantProperty} of {Array} of {Cartesian3} vectors. Optional.
     */
    var DynamicWall = function(coordinates) {
        // define core properties

        // @property {WallGeometry}
        this._geometry = undefined;
        // @memberof {... ??}
        this._material = undefined;

        if (typeof vertexPositions !== 'undefined') {
            this._geometry = new WallGeometry({positions: coordinates});
        }

        // @overridde
        this._show = undefined;
        // @override
        this._propertyChanged = new Event();
    };


    // define accessors
    defineProperties(DynamicWall.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPoint.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Geometry that constructs the wall
         * @memberof WallGeometry.prototype
         */
        geometry: createDynamicPropertyDescriptor('geometry', '_geometry'),
        material: createDynamicPropertyDescriptor('material', '_material')
    });


    // define custom operations

    /**
     * Duplicates a DynamicWall instance.
     * @memberof DynamicWall.prototype
     *
     * @param {DynamicWall} [result] The object onto which to store the result.
     * @returns {DynamicWall} The modified result parameter or a new instance if one was not provided.
     */
    DynamicWall.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicWall();
        }

        result.geometry = this.geometry;
        result.material = this.material;

        result.show = this.show;

        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicWall
     *
     * @param {DynamicWall} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicWall.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.geometry = defaultValue(this.geometry, source.geometry);
        this.material = defaultValue(this.material, source.material);

        this.show = defaultValue(this.show, source.show);
    };

    return DynamicWall;
});
