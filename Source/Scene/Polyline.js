/*global define*/
define([
        '../Core/arrayRemoveDuplicates',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/DistanceDisplayCondition',
        '../Core/Matrix4',
        '../Core/PolylinePipeline',
        './Material'
    ], function(
        arrayRemoveDuplicates,
        BoundingSphere,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        DistanceDisplayCondition,
        Matrix4,
        PolylinePipeline,
        Material) {
    'use strict';

    /**
     * A renderable polyline. Create this by calling {@link PolylineCollection#add}
     *
     * @alias Polyline
     * @internalConstructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.show=true] <code>true</code> if this polyline will be shown; otherwise, <code>false</code>.
     * @param {Number} [options.width=1.0] The width of the polyline in pixels.
     * @param {Boolean} [options.loop=false] Whether a line segment will be added between the last and first line positions to make this line a loop.
     * @param {Material} [options.material=Material.ColorType] The material.
     * @param {Cartesian3[]} [options.positions] The positions.
     * @param {Object} [options.id] The user-defined object to be returned when this polyline is picked.
     * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this polyline will be displayed.
     * @param {PolylineCollection} polylineCollection The renderable polyline collection.
     *
     * @see PolylineCollection
     *
     */
    function Polyline(options, polylineCollection) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._show = defaultValue(options.show, true);
        this._width = defaultValue(options.width, 1.0);
        this._loop = defaultValue(options.loop, false);
        this._distanceDisplayCondition = options.distanceDisplayCondition;

        this._material = options.material;
        if (!defined(this._material)) {
            this._material = Material.fromType(Material.ColorType, {
                color : new Color(1.0, 1.0, 1.0, 1.0)
            });
        }

        var positions = options.positions;
        if (!defined(positions)) {
            positions = [];
        }

        this._positions = positions;
        this._actualPositions = arrayRemoveDuplicates(positions, Cartesian3.equalsEpsilon);

        if (this._loop && this._actualPositions.length > 2) {
            if (this._actualPositions === this._positions) {
                this._actualPositions = positions.slice();
            }
            this._actualPositions.push(Cartesian3.clone(this._actualPositions[0]));
        }

        this._length = this._actualPositions.length;
        this._id = options.id;

        var modelMatrix;
        if (defined(polylineCollection)) {
            modelMatrix = Matrix4.clone(polylineCollection.modelMatrix);
        }

        this._modelMatrix = modelMatrix;
        this._segments = PolylinePipeline.wrapLongitude(this._actualPositions, modelMatrix);

        this._actualLength = undefined;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylineCollection = polylineCollection;
        this._dirty = false;
        this._pickId = undefined;
        this._boundingVolume = BoundingSphere.fromPoints(this._actualPositions);
        this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, this._modelMatrix);
        this._boundingVolume2D = new BoundingSphere(); // modified in PolylineCollection
    }

    var POSITION_INDEX = Polyline.POSITION_INDEX = 0;
    var SHOW_INDEX = Polyline.SHOW_INDEX = 1;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX = 2;
    var MATERIAL_INDEX = Polyline.MATERIAL_INDEX = 3;
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX = 4;
    var DISTANCE_DISPLAY_CONDITION = Polyline.DISTANCE_DISPLAY_CONDITION = 5;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES = 6;

    function makeDirty(polyline, propertyChanged) {
        ++polyline._propertiesChanged[propertyChanged];
        var polylineCollection = polyline._polylineCollection;
        if (defined(polylineCollection)) {
            polylineCollection._updatePolyline(polyline, propertyChanged);
            polyline._dirty = true;
        }
    }

    defineProperties(Polyline.prototype, {

        /**
         * Determines if this polyline will be shown.  Use this to hide or show a polyline, instead
         * of removing it and re-adding it to the collection.
         * @memberof Polyline.prototype
         * @type {Boolean}
         */
        show: {
            get: function() {
                return this._show;
            },
            set: function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (value !== this._show) {
                    this._show = value;
                    makeDirty(this, SHOW_INDEX);
                }
            }
        },

        /**
         * Gets or sets the positions of the polyline.
         * @memberof Polyline.prototype
         * @type {Cartesian3[]}
         * @example
         * polyline.positions = Cesium.Cartesian3.fromDegreesArray([
         *     0.0, 0.0,
         *     10.0, 0.0,
         *     0.0, 20.0
         * ]);
         */
        positions : {
            get: function() {
                return this._positions;
            },
            set: function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var positions = arrayRemoveDuplicates(value, Cartesian3.equalsEpsilon);

                if (this._loop && positions.length > 2) {
                    if (positions === value) {
                        positions = value.slice();
                    }
                    positions.push(Cartesian3.clone(positions[0]));
                }

                if (this._actualPositions.length !== positions.length || this._actualPositions.length !== this._length) {
                    makeDirty(this, POSITION_SIZE_INDEX);
                }

                this._positions = value;
                this._actualPositions = positions;
                this._length = positions.length;
                this._boundingVolume = BoundingSphere.fromPoints(this._actualPositions, this._boundingVolume);
                this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, this._modelMatrix, this._boundingVolumeWC);
                makeDirty(this, POSITION_INDEX);

                this.update();
            }
        },

        /**
         * Gets or sets the surface appearance of the polyline.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}.
         * @memberof Polyline.prototype
         * @type {Material}
         */
        material: {
            get: function() {
                return this._material;
            },
            set: function(material) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(material)) {
                    throw new DeveloperError('material is required.');
                }
                //>>includeEnd('debug');

                if (this._material !== material) {
                    this._material = material;
                    makeDirty(this, MATERIAL_INDEX);
                }
            }
        },

        /**
         * Gets or sets the width of the polyline.
         * @memberof Polyline.prototype
         * @type {Number}
         */
        width: {
            get: function() {
                return this._width;
            },
            set: function(value) {
                //>>includeStart('debug', pragmas.debug)
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                var width = this._width;
                if (value !== width) {
                    this._width = value;
                    makeDirty(this, WIDTH_INDEX);
                }
            }
        },

        /**
         * Gets or sets whether a line segment will be added between the first and last polyline positions.
         * @memberof Polyline.prototype
         * @type {Boolean}
         */
        loop: {
            get: function() {
                return this._loop;
            },
            set: function(value) {
                //>>includeStart('debug', pragmas.debug)
                if (!defined(value)) {
                    throw new DeveloperError('value is required.');
                }
                //>>includeEnd('debug');

                if (value !== this._loop) {
                    var positions = this._actualPositions;
                    if (value) {
                        if (positions.length > 2 && !Cartesian3.equals(positions[0], positions[positions.length - 1])) {
                            if (positions.length === this._positions.length) {
                                this._actualPositions = positions = this._positions.slice();
                            }
                            positions.push(Cartesian3.clone(positions[0]));
                        }
                    } else {
                        if (positions.length > 2 && Cartesian3.equals(positions[0], positions[positions.length - 1])) {
                            if (positions.length - 1 === this._positions.length) {
                                this._actualPositions = this._positions;
                            } else {
                                positions.pop();
                            }
                        }
                    }

                    this._loop = value;
                    makeDirty(this, POSITION_SIZE_INDEX);
                }
            }
        },

        /**
         * Gets or sets the user-defined object returned when the polyline is picked.
         * @memberof Polyline.prototype
         * @type {Object}
         */
        id : {
            get : function() {
                return this._id;
            },
            set : function(value) {
                this._id = value;
                if (defined(this._pickId)) {
                    this._pickId.object.id = value;
                }
            }
        },

        /**
         * Gets or sets the condition specifying at what distance from the camera that this polyline will be displayed.
         * @memberof Polyline.prototype
         * @type {DistanceDisplayCondition}
         * @default undefined
         */
        distanceDisplayCondition : {
            get : function() {
                return this._distanceDisplayCondition;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value.far <= value.near) {
                    throw new DeveloperError('far distance must be greater than near distance.');
                }
                //>>includeEnd('debug');
                if (!DistanceDisplayCondition.equals(value, this._distanceDisplayCondition)) {
                    this._distanceDisplayCondition = DistanceDisplayCondition.clone(value, this._distanceDisplayCondition);
                    makeDirty(this, DISTANCE_DISPLAY_CONDITION);
                }
            }
        }
    });

    /**
     * @private
     */
    Polyline.prototype.update = function() {
        var modelMatrix = Matrix4.IDENTITY;
        if (defined(this._polylineCollection)) {
            modelMatrix = this._polylineCollection.modelMatrix;
        }

        var segmentPositionsLength = this._segments.positions.length;
        var segmentLengths = this._segments.lengths;

        var positionsChanged = this._propertiesChanged[POSITION_INDEX] > 0 || this._propertiesChanged[POSITION_SIZE_INDEX] > 0;
        if (!Matrix4.equals(modelMatrix, this._modelMatrix) || positionsChanged) {
            this._segments = PolylinePipeline.wrapLongitude(this._actualPositions, modelMatrix);
            this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, modelMatrix, this._boundingVolumeWC);
        }

        this._modelMatrix = modelMatrix;

        if (this._segments.positions.length !== segmentPositionsLength) {
            // number of positions changed
            makeDirty(this, POSITION_SIZE_INDEX);
        } else {
            var length = segmentLengths.length;
            for (var i = 0; i < length; ++i) {
                if (segmentLengths[i] !== this._segments.lengths[i]) {
                    // indices changed
                    makeDirty(this, POSITION_SIZE_INDEX);
                    break;
                }
            }
        }
    };

    /**
     * @private
     */
    Polyline.prototype.getPickId = function(context) {
        if (!defined(this._pickId)) {
            this._pickId = context.createPickId({
                primitive : this,
                collection : this._polylineCollection,
                id : this._id
            });
        }
        return this._pickId;
    };

    Polyline.prototype._clean = function() {
        this._dirty = false;
        var properties = this._propertiesChanged;
        for ( var k = 0; k < NUMBER_OF_PROPERTIES - 1; ++k) {
            properties[k] = 0;
        }
    };

    Polyline.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._material = this._material && this._material.destroy();
        this._polylineCollection = undefined;
    };

    return Polyline;
});
