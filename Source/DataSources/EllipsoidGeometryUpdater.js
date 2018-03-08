define([
        '../Core/Check',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DistanceDisplayCondition',
        '../Core/DistanceDisplayConditionGeometryInstanceAttribute',
        '../Core/EllipsoidGeometry',
        '../Core/EllipsoidOutlineGeometry',
        '../Core/GeometryInstance',
        '../Core/Iso8601',
        '../Core/Matrix4',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive',
        '../Scene/SceneMode',
        './ColorMaterialProperty',
        './DynamicGeometryUpdater',
        './GeometryUpdater',
        './MaterialProperty',
        './Property'
    ], function(
        Check,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        EllipsoidGeometry,
        EllipsoidOutlineGeometry,
        GeometryInstance,
        Iso8601,
        Matrix4,
        ShowGeometryInstanceAttribute,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        SceneMode,
        ColorMaterialProperty,
        DynamicGeometryUpdater,
        GeometryUpdater,
        MaterialProperty,
        Property) {
    'use strict';

    var defaultMaterial = new ColorMaterialProperty(Color.WHITE);

    var radiiScratch = new Cartesian3();
    var scratchColor = new Color();
    var unitSphere = new Cartesian3(1, 1, 1);

    function EllipsoidGeometryOptions(entity) {
        this.id = entity;
        this.vertexFormat = undefined;
        this.radii = undefined;
        this.stackPartitions = undefined;
        this.slicePartitions = undefined;
        this.subdivisions = undefined;
    }

    /**
     * A {@link GeometryUpdater} for ellipsoids.
     * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
     * @alias EllipsoidGeometryUpdater
     * @constructor
     *
     * @param {Entity} entity The entity containing the geometry to be visualized.
     * @param {Scene} scene The scene where visualization is taking place.
     */
    function EllipsoidGeometryUpdater(entity, scene) {
        GeometryUpdater.call(this, {
            entity : entity,
            scene : scene,
            geometryOptions : new EllipsoidGeometryOptions(entity),
            geometryPropertyName : 'ellipsoid',
            observedPropertyNames : ['availability', 'position', 'orientation', 'ellipsoid']
        });

        this._isClosed = true;
    }

    if (defined(Object.create)) {
        EllipsoidGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
        EllipsoidGeometryUpdater.prototype.constructor = EllipsoidGeometryUpdater;
    }

    /**
     * Creates the geometry instance which represents the fill of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @param {Boolean} [skipModelMatrix=false] Whether to compute a model matrix for the geometry instance
     * @param {Matrix4} [modelMatrixResult] Used to store the result of the model matrix calculation
     * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent a filled geometry.
     */
    EllipsoidGeometryUpdater.prototype.createFillGeometryInstance = function(time, skipModelMatrix, modelMatrixResult) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var attributes;

        var color;
        var show = new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._fillProperty.getValue(time));
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);
        var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition);
        if (this._materialProperty instanceof ColorMaterialProperty) {
            var currentColor;
            if (defined(this._materialProperty.color) && (this._materialProperty.color.isConstant || isAvailable)) {
                currentColor = this._materialProperty.color.getValue(time, scratchColor);
            }
            if (!defined(currentColor)) {
                currentColor = Color.WHITE;
            }
            color = ColorGeometryInstanceAttribute.fromColor(currentColor);
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute,
                color : color
            };
        } else {
            attributes = {
                show : show,
                distanceDisplayCondition : distanceDisplayConditionAttribute
            };
        }

        return new GeometryInstance({
            id : entity,
            geometry : new EllipsoidGeometry(this._options),
            modelMatrix : skipModelMatrix ? undefined : entity.computeModelMatrix(time, modelMatrixResult),
            attributes : attributes
        });
    };

    /**
     * Creates the geometry instance which represents the outline of the geometry.
     *
     * @param {JulianDate} time The time to use when retrieving initial attribute values.
     * @param {Boolean} [skipModelMatrix=false] Whether to compute a model matrix for the geometry instance
     * @param {Matrix4} [modelMatrixResult] Used to store the result of the model matrix calculation
     * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
     *
     * @exception {DeveloperError} This instance does not represent an outlined geometry.
     */
    EllipsoidGeometryUpdater.prototype.createOutlineGeometryInstance = function(time, skipModelMatrix, modelMatrixResult) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var entity = this._entity;
        var isAvailable = entity.isAvailable(time);

        var outlineColor = Property.getValueOrDefault(this._outlineColorProperty, time, Color.BLACK, scratchColor);
        var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(time);

        return new GeometryInstance({
            id : entity,
            geometry : new EllipsoidOutlineGeometry(this._options),
            modelMatrix : skipModelMatrix ? undefined : entity.computeModelMatrix(time, modelMatrixResult),
            attributes : {
                show : new ShowGeometryInstanceAttribute(isAvailable && entity.isShowing && this._showProperty.getValue(time) && this._showOutlineProperty.getValue(time)),
                color : ColorGeometryInstanceAttribute.fromColor(outlineColor),
                distanceDisplayCondition : DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(distanceDisplayCondition)
            }
        });
    };

    EllipsoidGeometryUpdater.prototype._isHidden = function(entity, ellipsoid) {
        return !defined(entity.position) || !defined(ellipsoid.radii) || GeometryUpdater.prototype._isHidden.call(this, entity, ellipsoid);
    };

    EllipsoidGeometryUpdater.prototype._isDynamic = function(entity, ellipsoid) {
        return !entity.position.isConstant || //
               !Property.isConstant(entity.orientation) || //
               !ellipsoid.radii.isConstant || //
               !Property.isConstant(ellipsoid.stackPartitions) || //
               !Property.isConstant(ellipsoid.slicePartitions) || //
               !Property.isConstant(ellipsoid.outlineWidth) || //
               !Property.isConstant(ellipsoid.subdivisions);
    };

    EllipsoidGeometryUpdater.prototype._setStaticOptions = function(entity, ellipsoid) {
        var stackPartitions = ellipsoid.stackPartitions;
        var slicePartitions = ellipsoid.slicePartitions;
        var subdivisions = ellipsoid.subdivisions;
        var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

        var options = this._options;
        options.vertexFormat = isColorMaterial ? PerInstanceColorAppearance.VERTEX_FORMAT : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
        options.radii = ellipsoid.radii.getValue(Iso8601.MINIMUM_VALUE, options.radii);
        options.stackPartitions = defined(stackPartitions) ? stackPartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.slicePartitions = defined(slicePartitions) ? slicePartitions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
        options.subdivisions = defined(subdivisions) ? subdivisions.getValue(Iso8601.MINIMUM_VALUE) : undefined;
    };

    EllipsoidGeometryUpdater.DynamicGeometryUpdater = DynamicEllipsoidGeometryUpdater;

    /**
     * @private
     */
    function DynamicEllipsoidGeometryUpdater(geometryUpdater, primitives, groundPrimitives) {
        DynamicGeometryUpdater.call(this, geometryUpdater, primitives, groundPrimitives);

        this._scene = geometryUpdater._scene;
        this._modelMatrix = new Matrix4();
        this._attributes = undefined;
        this._outlineAttributes = undefined;
        this._lastSceneMode = undefined;
        this._lastShow = undefined;
        this._lastOutlineShow = undefined;
        this._lastOutlineWidth = undefined;
        this._lastOutlineColor = undefined;
        this._material = {};
    }

    if (defined(Object.create)) {
        DynamicEllipsoidGeometryUpdater.prototype = Object.create(DynamicGeometryUpdater.prototype);
        DynamicEllipsoidGeometryUpdater.prototype.constructor = DynamicEllipsoidGeometryUpdater;
    }

    DynamicEllipsoidGeometryUpdater.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var entity = this._entity;
        var ellipsoid = entity.ellipsoid;
        if (!entity.isShowing || !entity.isAvailable(time) || !Property.getValueOrDefault(ellipsoid.show, time, true)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }

            if (defined(this._outlinePrimitive)) {
                this._outlinePrimitive.show = false;
            }
            return;
        }

        var radii = Property.getValueOrUndefined(ellipsoid.radii, time, radiiScratch);
        var modelMatrix = entity.computeModelMatrix(time, this._modelMatrix);
        if (!defined(modelMatrix) || !defined(radii)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }

            if (defined(this._outlinePrimitive)) {
                this._outlinePrimitive.show = false;
            }
            return;
        }

        //Compute attributes and material.
        var showFill = Property.getValueOrDefault(ellipsoid.fill, time, true);
        var showOutline = Property.getValueOrDefault(ellipsoid.outline, time, false);
        var outlineColor = Property.getValueOrClonedDefault(ellipsoid.outlineColor, time, Color.BLACK, scratchColor);
        var material = MaterialProperty.getValue(time, defaultValue(ellipsoid.material, defaultMaterial), this._material);

        // Check properties that could trigger a primitive rebuild.
        var stackPartitions = Property.getValueOrUndefined(ellipsoid.stackPartitions, time);
        var slicePartitions = Property.getValueOrUndefined(ellipsoid.slicePartitions, time);
        var subdivisions = Property.getValueOrUndefined(ellipsoid.subdivisions, time);
        var outlineWidth = Property.getValueOrDefault(ellipsoid.outlineWidth, time, 1.0);

        //In 3D we use a fast path by modifying Primitive.modelMatrix instead of regenerating the primitive every frame.
        var sceneMode = this._scene.mode;
        var in3D = sceneMode === SceneMode.SCENE3D;

        var options = this._options;

        var shadows = this._geometryUpdater.shadowsProperty.getValue(time);

        var distanceDisplayConditionProperty = this._geometryUpdater.distanceDisplayConditionProperty;
        var distanceDisplayCondition = distanceDisplayConditionProperty.getValue(time);

        //We only rebuild the primitive if something other than the radii has changed
        //For the radii, we use unit sphere and then deform it with a scale matrix.
        var rebuildPrimitives = !in3D || this._lastSceneMode !== sceneMode || !defined(this._primitive) || //
                                options.stackPartitions !== stackPartitions || options.slicePartitions !== slicePartitions || //
                                options.subdivisions !== subdivisions || this._lastOutlineWidth !== outlineWidth;

        if (rebuildPrimitives) {
            var primitives = this._primitives;
            primitives.removeAndDestroy(this._primitive);
            primitives.removeAndDestroy(this._outlinePrimitive);
            this._primitive = undefined;
            this._outlinePrimitive = undefined;
            this._lastSceneMode = sceneMode;
            this._lastOutlineWidth = outlineWidth;

            options.stackPartitions = stackPartitions;
            options.slicePartitions = slicePartitions;
            options.subdivisions = subdivisions;
            options.radii = in3D ? unitSphere : radii;

            var appearance = new MaterialAppearance({
                material : material,
                translucent : material.isTranslucent(),
                closed : true
            });
            options.vertexFormat = appearance.vertexFormat;

            var fillInstance = this._geometryUpdater.createFillGeometryInstance(time, in3D, this._modelMatrix);

            this._primitive = primitives.add(new Primitive({
                geometryInstances : fillInstance,
                appearance : appearance,
                asynchronous : false,
                shadows : shadows
            }));

            var outlineInstance = this._geometryUpdater.createOutlineGeometryInstance(time, in3D, this._modelMatrix);
            this._outlinePrimitive = primitives.add(new Primitive({
                geometryInstances : outlineInstance,
                appearance : new PerInstanceColorAppearance({
                    flat : true,
                    translucent : outlineInstance.attributes.color.value[3] !== 255,
                    renderState : {
                        lineWidth : this._geometryUpdater._scene.clampLineWidth(outlineWidth)
                    }
                }),
                asynchronous : false,
                shadows : shadows
            }));

            this._lastShow = showFill;
            this._lastOutlineShow = showOutline;
            this._lastOutlineColor = Color.clone(outlineColor, this._lastOutlineColor);
            this._lastDistanceDisplayCondition = distanceDisplayCondition;
        } else if (this._primitive.ready) {
            //Update attributes only.
            var primitive = this._primitive;
            var outlinePrimitive = this._outlinePrimitive;

            primitive.show = true;
            outlinePrimitive.show = true;
            primitive.appearance.material = material;

            var attributes = this._attributes;
            if (!defined(attributes)) {
                attributes = primitive.getGeometryInstanceAttributes(entity);
                this._attributes = attributes;
            }
            if (showFill !== this._lastShow) {
                attributes.show = ShowGeometryInstanceAttribute.toValue(showFill, attributes.show);
                this._lastShow = showFill;
            }

            var outlineAttributes = this._outlineAttributes;

            if (!defined(outlineAttributes)) {
                outlineAttributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
                this._outlineAttributes = outlineAttributes;
            }

            if (showOutline !== this._lastOutlineShow) {
                outlineAttributes.show = ShowGeometryInstanceAttribute.toValue(showOutline, outlineAttributes.show);
                this._lastOutlineShow = showOutline;
            }

            if (!Color.equals(outlineColor, this._lastOutlineColor)) {
                outlineAttributes.color = ColorGeometryInstanceAttribute.toValue(outlineColor, outlineAttributes.color);
                Color.clone(outlineColor, this._lastOutlineColor);
            }

            if (!DistanceDisplayCondition.equals(distanceDisplayCondition, this._lastDistanceDisplayCondition)) {
                attributes.distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.toValue(distanceDisplayCondition, attributes.distanceDisplayCondition);
                outlineAttributes.distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.toValue(distanceDisplayCondition, outlineAttributes.distanceDisplayCondition);
                DistanceDisplayCondition.clone(distanceDisplayCondition, this._lastDistanceDisplayCondition);
            }
        }

        if (in3D) {
            //Since we are scaling a unit sphere, we can't let any of the values go to zero.
            //Instead we clamp them to a small value.  To the naked eye, this produces the same results
            //that you get passing EllipsoidGeometry a radii with a zero component.
            radii.x = Math.max(radii.x, 0.001);
            radii.y = Math.max(radii.y, 0.001);
            radii.z = Math.max(radii.z, 0.001);

            modelMatrix = Matrix4.multiplyByScale(modelMatrix, radii, modelMatrix);
            this._primitive.modelMatrix = modelMatrix;
            this._outlinePrimitive.modelMatrix = modelMatrix;
        }
    };

    return EllipsoidGeometryUpdater;
});
