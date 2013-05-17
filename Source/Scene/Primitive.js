/*global define*/
define([
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/GeometryFilters',
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
        GeometryFilters,
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
        this.geometries = options.geometries;

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

    function addPickColorAttribute(primitive, geometries, context) {
        var length = geometries.length;
        var i;

        for (i = 0; i < length; ++i) {
            var geometry = geometries[i];
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.pickColor = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            if (typeof geometry.pickData !== 'undefined') {
                var pickId = context.createPickId({
                    primitive : primitive,
                    pickData : geometry.pickData
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

    function transformToWorldCoordinates(primitive, geometries) {
        var toWorld = primitive._transformToWorldCoordinates;
        var length = geometries.length;
        var i;

        if (!toWorld && (length > 1)) {
            var modelMatrix = Matrix4.clone(geometries[0].modelMatrix);

            for (i = 1; i < length; ++i) {
                if (!Matrix4.equals(modelMatrix, geometries[i])) {
                    toWorld = true;
                    break;
                }
            }
        }

        if (toWorld) {
            for (i = 0; i < length; ++i) {
                GeometryFilters.transformToWorldCoordinates(geometries[i]);
            }
        } else {
            // Leave geometry in local coordinate system; auto update model-matrix.
            Matrix4.clone(geometries[0].modelMatrix, primitive.modelMatrix);
        }
    }

    function geometryPipeline(primitive, geometries, context) {
        // Add pickColor attribute if any geometries are pickable
        if (Geometry.isPickable(geometries)) {
            addPickColorAttribute(primitive, geometries, context);
        }

        // Unify to world coordinates before combining.  If there is only one geometry or all
        // geometries are in the same (non-world) coordinate system, only combine if the user requested it.
        transformToWorldCoordinates(primitive, geometries);

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryFilters.combine(geometries);

        // Split position for GPU RTE
        GeometryFilters.encodeAttribute(geometry, 'position', 'positionHigh', 'positionLow');

        if (!context.getElementIndexUint()) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryFilters.fitToUnsignedShortIndices(geometry);
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
            ((typeof this.geometries === 'undefined') && (this._va.length === 0)) ||
            (typeof this.appearance === 'undefined')) {
// TODO: support Columbus view and 2D
            return;
        }

        var colorCommands = this._commandLists.colorList;
        var pickCommands = this._commandLists.pickList;
        var length;
        var i;

        if (this._va.length === 0) {
            var geometries = (this.geometries instanceof Array) ? this.geometries : [this.geometries];
            var finalGeometries = geometryPipeline(this, geometries, context);

            length = finalGeometries.length;
            if (this._vertexCacheOptimize) {
                // Optimize for vertex shader caches
                for (i = 0; i < length; ++i) {
                    GeometryFilters.reorderForPostVertexCache(finalGeometries[i]);
                    GeometryFilters.reorderForPreVertexCache(finalGeometries[i]);
                }
            }

            var attributeIndices = GeometryFilters.createAttributeIndices(finalGeometries[0]);

            var va = [];
            for (i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromMesh({
                    mesh : finalGeometries[i],
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

            if (Geometry.isPickable(geometries)) {
                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, vs, createPickFragmentShaderSource(fs, 'varying'), attributeIndices);
                pickRS = rs;
            } else {
                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, appearance.vertexShaderSource, fs, attributeIndices);

                // Still render during pick pass, but depth-only.
                var appearanceRS = clone(appearance.renderState, true);
                appearanceRS.colorMask = {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                };
                pickRS = context.createRenderState(appearanceRS);
            }

            for (i = 0; i < length; ++i) {
                var geometry = finalGeometries[i];

                var command = new DrawCommand();
// TODO: this assumes indices in the geometries - and only one set
                command.primitiveType = geometry.indexLists[0].primitiveType;
                command.vertexArray = this._va[i];
                command.renderState = rs;
                command.shaderProgram = this._sp;
                command.uniformMap = appearance.material._uniforms;
                command.boundingVolume = geometry.boundingSphere;
                colorCommands.push(command);

                var pickCommand = new DrawCommand();
                pickCommand.primitiveType = geometry.indexLists[0].primitiveType;
                pickCommand.vertexArray = this._va[i];
                pickCommand.renderState = pickRS;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = appearance.material._uniforms;
                pickCommand.boundingVolume = geometry.boundingSphere;
                pickCommands.push(pickCommand);
            }

            if (this._releaseGeometries) {
                this.geometries = undefined;
            }
        }

        // The geometry is static but the model matrix can change
        if (frameState.passes.color || frameState.passes.pick) {
            length = colorCommands.length;
            for (var i = 0; i < length; ++i) {
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

        var pickIds = this_pickIds;
        length = pickIds.length;
        for (i = 0; i < length; ++i) {
            pickIds[i].destroy();
        }
        this.this_pickIds = undefined;

        return destroyObject(this);
    };

    return Primitive;
});