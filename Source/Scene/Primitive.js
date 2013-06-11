/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/GeometryPipeline',
        '../Core/PrimitiveType',
        '../Core/BoundingSphere',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/ComponentDatatype',
        '../Renderer/BufferUsage',
        '../Renderer/VertexLayout',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Renderer/createPickFragmentShaderSource',
        './SceneMode'
    ], function(
        clone,
        defaultValue,
        destroyObject,
        Matrix4,
        Color,
        GeometryPipeline,
        PrimitiveType,
        BoundingSphere,
        Geometry,
        GeometryAttribute,
        ComponentDatatype,
        BufferUsage,
        VertexLayout,
        CommandLists,
        DrawCommand,
        createPickFragmentShaderSource,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Primitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.geometryInstances = options.geometryInstances;

        /**
         * DOC_TBA
         */
        this.appearance = options.appearance;

        /**
         * DOC_TBA
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();

        /**
         * DOC_TBA
         */
        this.show = true;

        this._vertexCacheOptimize = defaultValue(options.vertexCacheOptimize, true);
        this._releaseGeometries = defaultValue(options.releaseGeometries, false);
        // When true, geometry is transformed to world coordinates even if there is a single
        // geometry or all geometries are in the same reference frame.
        this._transformToWorldCoordinates = defaultValue(options.transformToWorldCoordinates, true);

        this._sp = undefined;
        this._va = [];

        this._pickSP = undefined;
        this._pickIds = [];

        this._commandLists = new CommandLists();
    };

    function hasPerInstanceColor(instances) {
        var perInstanceColor = false;
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            if (typeof instances[i].color !== 'undefined') {
                perInstanceColor = true;
                break;
            }
        }

        return perInstanceColor;
    }

    function addColorAttribute(primitive, instances, context) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance.geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.color = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            var color = instance.color;

            if (typeof color !== 'undefined') {
                var red = Color.floatToByte(color.red);
                var green = Color.floatToByte(color.green);
                var blue = Color.floatToByte(color.blue);
                var alpha = Color.floatToByte(color.alpha);
                var values = attributes.color.values;

                for (var j = 0; j < numberOfComponents; j += 4) {
                    values[j] = red;
                    values[j + 1] = green;
                    values[j + 2] = blue;
                    values[j + 3] = alpha;
                }
            }
        }
    }

    function isPickable(instances) {
        var pickable = false;
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            if (typeof instances[i].pickData !== 'undefined') {
                pickable = true;
                break;
            }
        }

        return pickable;
    }

    function addPickColorAttribute(primitive, instances, context) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance.geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.pickColor = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            if (typeof instance.pickData !== 'undefined') {
                var pickId = context.createPickId({
                    primitive : primitive,
                    pickData : instance.pickData
                });
                primitive._pickIds.push(pickId);

                var pickColor = pickId.color;
                var red = Color.floatToByte(pickColor.red);
                var green = Color.floatToByte(pickColor.green);
                var blue = Color.floatToByte(pickColor.blue);
                var alpha = Color.floatToByte(pickColor.alpha);
                var values = attributes.pickColor.values;

                for (var j = 0; j < numberOfComponents; j += 4) {
                    values[j] = red;
                    values[j + 1] = green;
                    values[j + 2] = blue;
                    values[j + 3] = alpha;
                }
            }
        }
    }

    function addDefaultAttributes(instances) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var geometry = instances[i].geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var positionLength = positionAttr.values.length / positionAttr.componentsPerAttribute;

            var numberOfComponents;
            var values;
            var j;

            if (typeof attributes.normal === 'undefined') {
                numberOfComponents = 3 * positionLength;
                values = new Float32Array(numberOfComponents);
                attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : values
                });

                for (j = 0; j < numberOfComponents; j += 3) {
                    values[j] = 0.0;
                    values[j + 1] = 0.0;
                    values[j + 2] = 1.0;
                }
            }

            if (typeof attributes.tangent === 'undefined') {
                numberOfComponents = 3 * positionLength;
                values = new Float32Array(numberOfComponents);
                attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : values
                });

                for (j = 0; j < numberOfComponents; j += 3) {
                    values[j] = 1.0;
                    values[j + 1] = 0.0;
                    values[j + 2] = 0.0;
                }
            }

            if (typeof attributes.binormal === 'undefined') {
                numberOfComponents = 3 * positionLength;
                values = new Float32Array(numberOfComponents);
                attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : values
                });

                for (j = 0; j < numberOfComponents; j += 3) {
                    values[j] = 0.0;
                    values[j + 1] = 1.0;
                    values[j + 2] = 0.0;
                }
            }

            if (typeof attributes.st === 'undefined') {
                numberOfComponents = 2 * positionLength;
                values = new Float32Array(numberOfComponents);
                attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : values
                });

                for (j = 0; j < numberOfComponents; j += 2) {
                    values[j] = 0.0;
                    values[j + 1] = 0.0;
                }
            }
        }
    }

    function transformToWorldCoordinates(primitive, instances) {
        var toWorld = primitive._transformToWorldCoordinates;
        var length = instances.length;
        var i;

        if (!toWorld && (length > 1)) {
            var modelMatrix = instances[0].modelMatrix;

            for (i = 1; i < length; ++i) {
                if (!Matrix4.equals(modelMatrix, instances[i].modelMatrix)) {
                    toWorld = true;
                    break;
                }
            }
        }

        if (toWorld) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.transformToWorldCoordinates(instances[i]);
            }
        } else {
            // Leave geometry in local coordinate system; auto update model-matrix.
            Matrix4.clone(instances[0].modelMatrix, primitive.modelMatrix);
        }
    }

    // PERFORMANCE_IDEA:  Move pipeline to a web-worker.
    function geometryPipeline(primitive, instances, context) {
        // Copy instances first since most pipeline operations modify the geometry and instance in-place.
        var length = instances.length;
        var insts = new Array(length);
        for (var i = 0; i < length; ++i) {
            insts[i] = instances[i].clone();
        }

        // Add color attribute if any geometries have per-geometry color
        if (hasPerInstanceColor(insts)) {
            addColorAttribute(primitive, insts, context);
        }

        // Add pickColor attribute if any geometries are pickable
        if (isPickable(insts)) {
            addPickColorAttribute(primitive, insts, context);
        }

        // Add default values for any undefined attributes
        addDefaultAttributes(insts);

        // Unify to world coordinates before combining.  If there is only one geometry or all
        // geometries are in the same (non-world) coordinate system, only combine if the user requested it.
        transformToWorldCoordinates(primitive, insts);

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryPipeline.combine(insts);

        // Split position for GPU RTE
        GeometryPipeline.encodeAttribute(geometry, 'position', 'positionHigh', 'positionLow');

        if (!context.getElementIndexUint()) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
    }

    /**
     * @private
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D) ||
            ((typeof this.geometryInstances === 'undefined') && (this._va.length === 0)) ||
            (typeof this.appearance === 'undefined')) {
// TODO: support Columbus view and 2D
            return;
        }

        var colorCommands = this._commandLists.colorList;
        var pickCommands = this._commandLists.pickList;
        var length;
        var i;

        if (this._va.length === 0) {
            var instances = (this.geometryInstances instanceof Array) ? this.geometryInstances : [this.geometryInstances];
            var geometries = geometryPipeline(this, instances, context);

            length = geometries.length;
            if (this._vertexCacheOptimize) {
                // Optimize for vertex shader caches
                for (i = 0; i < length; ++i) {
                    GeometryPipeline.reorderForPostVertexCache(geometries[i]);
                    GeometryPipeline.reorderForPreVertexCache(geometries[i]);
                }
            }

            var attributeIndices = GeometryPipeline.createAttributeIndices(geometries[0]);

            var va = [];
            for (i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromGeometry({
                    geometry : geometries[i],
                    attributeIndices : attributeIndices,
                    bufferUsage : BufferUsage.STATIC_DRAW,
                    vertexLayout : VertexLayout.INTERLEAVED
                }));
            }

            var appearance = this.appearance;
            var vs = appearance.vertexShaderSource;
            var fs = appearance.getFragmentShaderSource();

            this._va = va;
// TODO: recompile on material change.
            this._sp = context.getShaderCache().replaceShaderProgram(this._sp, appearance.vertexShaderSource, fs, attributeIndices);
            var rs = context.createRenderState(appearance.renderState);
            var pickRS;

            if (isPickable(instances)) {
                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, vs, createPickFragmentShaderSource(fs, 'varying'), attributeIndices);
                pickRS = rs;
            } else {
                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, appearance.vertexShaderSource, fs, attributeIndices);

                // Still render during pick pass, but depth-only.
                var appearanceRS = clone(appearance.renderState);
                appearanceRS.colorMask = {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                };
                pickRS = context.createRenderState(appearanceRS);
            }

            var uniforms = (typeof appearance.material !== 'undefined') ? appearance.material._uniforms : undefined;

            for (i = 0; i < length; ++i) {
                var geometry = geometries[i];

                var command = new DrawCommand();
                command.owner = this;
                command.primitiveType = geometry.primitiveType;
                command.vertexArray = this._va[i];
                command.renderState = rs;
                command.shaderProgram = this._sp;
                command.uniformMap = uniforms;
                command.boundingVolume = geometry.boundingSphere;
                colorCommands.push(command);

                var pickCommand = new DrawCommand();
                pickCommand.owner = this;
                pickCommand.primitiveType = geometry.primitiveType;
                pickCommand.vertexArray = this._va[i];
                pickCommand.renderState = pickRS;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = uniforms;
                pickCommand.boundingVolume = geometry.boundingSphere;
                pickCommands.push(pickCommand);
            }

            if (this._releaseGeometries) {
                this.geometryInstances = undefined;
            }
        }

        // The geometry is static but the model matrix can change
        if (frameState.passes.color || frameState.passes.pick) {
            length = colorCommands.length;
            for (i = 0; i < length; ++i) {
                colorCommands[i].modelMatrix = this.modelMatrix;
                pickCommands[i].modelMatrix = this.modelMatrix;
            }

            commandList.push(this._commandLists);
        }
    };

    /**
     * DOC_TBA
     */
    Primitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    Primitive.prototype.destroy = function() {
        var length;
        var i;

        this._sp = this._sp && this._sp.release();
        this._pickSP = this._pickSP && this._pickSP.release();

        var va = this._va;
        length = va.length;
        for (i = 0; i < length; ++i) {
            va[i].destroy();
        }
        this._va = undefined;

        var pickIds = this._pickIds;
        length = pickIds.length;
        for (i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }
        this._pickIds = undefined;

        return destroyObject(this);
    };

    return Primitive;
});