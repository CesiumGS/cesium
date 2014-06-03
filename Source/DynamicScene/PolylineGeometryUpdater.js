/*global define*/
define([
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/PolylineGeometry',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/PolylineColorAppearance',
        '../Scene/PolylineMaterialAppearance',
        '../Scene/Primitive',
        './ColorMaterialProperty',
        './ConstantProperty',
        './MaterialProperty',
        './Property'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        GeometryInstance,
        Iso8601,
        PolylineGeometry,
        ShowGeometryInstanceAttribute,
        PolylineColorAppearance,
        PolylineMaterialAppearance,
        Primitive,
        ColorMaterialProperty,
        ConstantProperty,
        MaterialProperty,
        Property) {
    "use strict";

    var defaultMaterial = ColorMaterialProperty.fromColor(Color.WHITE);
    var defaultShow = new ConstantProperty(true);

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.vertexFormat = undefined;
        this.positions = undefined;
        this.width = undefined;
    };

    /**
     * A {@link GeometryUpdater} for polylines.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias PolylineGeometryUpdater
     * @constructor
     *
     * @param {DynamicObject} dynamicObject The object containing the geometry to be visualized.
     */
    var PolylineGeometryUpdater = function(dynamicObject) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required');
        }
        //>>includeEnd('debug');

        this._dynamicObject = dynamicObject;
        this._dynamicObjectSubscription = dynamicObject.definitionChanged.addEventListener(PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        this._fillEnabled = false;
        this._dynamic = false;
        this._geometryChanged = new Event();
        this._showProperty = undefined;
        this._materialProperty = undefined;
        this._options = new GeometryOptions(dynamicObject);
        this._onDynamicObjectPropertyChanged(dynamicObject, 'polyline', dynamicObject.polyline, undefined);
    };

    defineProperties(PolylineGeometryUpdater, {
        /**
         * Gets the type of Appearance to use for simple color-based geometry.
         * @memberof PolylineGeometryUpdater
         * @type {Appearance}
         */
        perInstanceColorAppearanceType : {
            value : PolylineColorAppearance
        },
        /**
         * Gets the type of Appearance to use for material-based geometry.
         * @memberof PolylineGeometryUpdater
         * @type {Appearance}
         */
        materialAppearanceType : {
            value : PolylineMaterialAppearance
        }
    });

    defineProperties(PolylineGeometryUpdater.prototype, {
        /**
         * Gets the object associated with this geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {DynamicObject}
         * @readonly
         */
        dynamicObject :{
            get : function() {
                return this._dynamicObject;
            }
        },
        /**
         * Gets a value indicating if the geometry has a fill component.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        fillEnabled : {
            get : function() {
                return this._fillEnabled;
            }
        },
        /**
         * Gets a value indicating if fill visibility varies with simulation time.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantFill : {
            get : function() {
                return !this._fillEnabled || (!defined(this._dynamicObject.availability) && Property.isConstant(this._showProperty));
            }
        },
        /**
         * Gets the material property used to fill the geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {MaterialProperty}
         * @readonly
         */
        fillMaterialProperty : {
            get : function() {
                return this._materialProperty;
            }
        },
        /**
         * Gets a value indicating if the geometry has an outline component.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        outlineEnabled : {
            value : false
        },
        /**
         * Gets a value indicating if outline visibility varies with simulation time.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        hasConstantOutline : {
            value : true
        },
        /**
         * Gets the {@link Color} property for the geometry outline.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Property}
         * @readonly
         */
        outlineColorProperty : {
            value : undefined
        },
        /**
         * Gets a value indicating if the geometry is time-varying.
         * If true, all visualization is delegated to the {@link DynamicGeometryUpdater}
         * returned by GeometryUpdater#createDynamicUpdater.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isDynamic : {
            get : function() {
                return this._dynamic;
            }
        },
        /**
         * Gets a value indicating if the geometry is closed.
         * This property is only valid for static geometry.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isClosed : {
            value : false
        },
        /**
         * Gets an event that is raised whenever the public properties
         * of this updater change.
         * @memberof PolylineGeometryUpdater.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        geometryChanged : {
            get : function() {
                return this._geometryChanged;
            }
        }
    });

    /**
     * Checks if the geometry is outlined at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is outlined at the provided time, false otherwise.
     */
    PolylineGeometryUpdater.prototype.isOutlineVisible = function(time) {
        return false;
    };

    /**
     * Checks if the geometry is filled at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve visibility.
     * @returns {Boolean} true if geometry is filled at the provided time, false otherwise.
     */
    PolylineGeometryUpdater.prototype.isFilled = function(time) {
        var dynamicObject = this._dynamicObject;
        return this._fillEnabled && dynamicObject.isAvailable(time) && this._showProperty.getValue(time);
    };

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    PolylineGeometryUpdater.prototype.createFillGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }

        if (!this._fillEnabled) {
            throw new DeveloperError('This instance does not represent a filled geometry.');
        }
        //>>includeEnd('debug');

        var color;
        var attributes;
        var dynamicObject = this._dynamicObject;
        var isAvailable = dynamicObject.isAvailable(time);
        var show = new ShowGeometryInstanceAttribute(isAvailable && this._showProperty.getValue(time));

        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor = Color.WHITE;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time);
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                color : color
            };
        } else {
            attributes = {
                show : show
            };
        }

        return new GeometryInstance({
            id : dynamicObject,
            geometry : new PolylineGeometry(this._options),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    PolylineGeometryUpdater.prototype.createOutlineGeometryInstance = function(time) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('This instance does not represent an outlined geometry.');
        //>>includeEnd('debug');
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    PolylineGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    PolylineGeometryUpdater.prototype.destroy = function() {
        this._dynamicObjectSubscription();
        destroyObject(this);
    };

    PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        if (!(propertyName === 'availability' || propertyName === 'vertexPositions' || propertyName === 'polyline')) {
            return;
        }

        var polyline = this._dynamicObject.polyline;

        if (!defined(polyline)) {
            if (this._fillEnabled) {
                this._fillEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var vertexPositions = this._dynamicObject.vertexPositions;

        var show = polyline.show;
        if ((defined(show) && show.isConstant && !show.getValue(Iso8601.MINIMUM_VALUE)) || //
            (!defined(vertexPositions))) {
            if (this._fillEnabled) {
                this._fillEnabled = false;
                this._geometryChanged.raiseEvent(this);
            }
            return;
        }

        var material = defaultValue(polyline.material, defaultMaterial);
        var isColorMaterial = material instanceof ColorMaterialProperty;
        this._materialProperty = material;
        this._showProperty = defaultValue(show, defaultShow);
        this._fillEnabled = true;

        var width = polyline.width;

        if (!vertexPositions.isConstant || !Property.isConstant(width)) {
            if (!this._dynamic) {
                this._dynamic = true;
                this._geometryChanged.raiseEvent(this);
            }
        } else {
            var options = this._options;
            var positions = vertexPositions.getValue(Iso8601.MINIMUM_VALUE, options.positions);

            //Because of the way we currently handle reference properties,
            //we can't automatically assume the positions are  always valid.
            if (!defined(positions) || positions.length < 2) {
                if (this._fillEnabled) {
                    this._fillEnabled = false;
                    this._geometryChanged.raiseEvent(this);
                }
                return;
            }

            options.vertexFormat = isColorMaterial ? PolylineColorAppearance.VERTEX_FORMAT : PolylineMaterialAppearance.VERTEX_FORMAT;
            options.positions = positions;
            options.width = defined(width) ? width.getValue(Iso8601.MINIMUM_VALUE) : undefined;
            this._dynamic = false;
            this._geometryChanged.raiseEvent(this);
        }
    };

    /**
     * Creates the dynamic updater to be used when GeometryUpdater#isDynamic is true.
     *
     * @param {PrimitiveCollection} primitives The primitive collection to use.
     * @returns {DynamicGeometryUpdater} The dynamic updater used to update the geometry each frame.
     *
     * @exception {DeveloperError} This instance does not represent dynamic geometry.
     */
    PolylineGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        //>>includeStart('debug', pragmas.debug);
        if (!this._dynamic) {
            throw new DeveloperError('This instance does not represent dynamic geometry.');
        }

        if (!defined(primitives)) {
            throw new DeveloperError('primitives is required.');
        }
        //>>includeEnd('debug');

        return new DynamicGeometryUpdater(primitives, this);
    };

    /**
     * @private
     */
    var DynamicGeometryUpdater = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._primitive = undefined;
        this._geometryUpdater = geometryUpdater;
        this._options = new GeometryOptions(geometryUpdater._dynamicObject);
    };

    DynamicGeometryUpdater.prototype.update = function(time) {
        var geometryUpdater = this._geometryUpdater;

        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }

        var dynamicObject = geometryUpdater._dynamicObject;
        var polyline = dynamicObject.polyline;
        var show = polyline.show;

        if (!dynamicObject.isAvailable(time) || (defined(show) && !show.getValue(time))) {
            return;
        }

        var options = this._options;
        var vertexPositions = dynamicObject.vertexPositions;

        var positions = vertexPositions.getValue(time, options.positions);
        //Because of the way we currently handle reference properties,
        //we can't automatically assume the positions are  always valid.
        if (!defined(positions) || positions.length < 2) {
            return;
        }

        options.positions = positions;

        var width = polyline.width;
        options.width = defined(width) ? width.getValue(time) : undefined;

        this._material = MaterialProperty.getValue(time, geometryUpdater.fillMaterialProperty, this._material);
        var material = this._material;
        var appearance = new PolylineMaterialAppearance({
            material : material,
            translucent : material.isTranslucent(),
            closed : false
        });
        options.vertexFormat = appearance.vertexFormat;

        this._primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                id : dynamicObject,
                geometry : new PolylineGeometry(options)
            }),
            appearance : appearance,
            asynchronous : false
        });
        this._primitives.add(this._primitive);
    };

    DynamicGeometryUpdater.prototype.isDestroyed = function() {
        return false;
    };

    DynamicGeometryUpdater.prototype.destroy = function() {
        if (defined(this._primitive)) {
            this._primitives.remove(this._primitive);
        }
        destroyObject(this);
    };

    return PolylineGeometryUpdater;
});