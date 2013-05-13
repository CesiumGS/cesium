/*global define*/
define([
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
    var Primitive = function(geometries, appearance) {
        /**
         * DOC_TBA
         */
        this.geometries = geometries;

        /**
         * DOC_TBA
         */
        this.appearance = appearance;

        /**
         * DOC_TBA
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();

        /**
         * DOC_TBA
         */
        this.show = true;

        this._sp = undefined;
        this._rs = undefined;
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

    function processGeometry(primitive, geometries, context) {
        // Add pickColor attribute if any geometries are pickable
        if (Geometry.isPickable(geometries)) {
            addPickColorAttribute(primitive, geometries, context);
        }

        // Unify to world coordinates before combining.
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            GeometryFilters.transformToWorldCoordinates(geometries[i]);
        }

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryFilters.combine(geometries);

        // Split position for GPU RTE
        geometry = GeometryFilters.encodeAttribute(geometry, 'position', 'positionHigh', 'positionLow');

        return geometry;
    }

    /**
     * @private
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D) ||
            (typeof this.geometries === 'undefined') ||
            (typeof this.appearance === 'undefined')) {
// TODO: support Columbus view and 2D
            return;
        }

        var colorCommands = this._commandLists.colorList;
        var pickCommands = this._commandLists.pickList;
        var length;
        var i;

        if (typeof this._sp === 'undefined') {
            var geometries = (this.geometries instanceof Array) ? this.geometries : [this.geometries];
            var geometry = processGeometry(this, geometries, context);
            // Break into multiple geometries to fit within unsigned short indices if needed
            var finalGeometries = GeometryFilters.fitToUnsignedShortIndices(geometry);
            var attributeIndices = GeometryFilters.createAttributeIndices(geometry);

            var va = [];
            length = finalGeometries.length;
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
            var pickable = Geometry.isPickable(geometries);

            this._va = va;
// TODO: recompile on material change.
            this._sp = context.getShaderCache().replaceShaderProgram(this._sp, appearance.vertexShaderSource, fs, attributeIndices);
            if (pickable) {
                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, vs, createPickFragmentShaderSource(fs, 'varying'), attributeIndices);
            }
            this._rs = context.createRenderState(appearance.renderState);

            for (i = 0; i < length; ++i) {
                var command = new DrawCommand();
// TODO: this assumes indices in the geometries - and only one set
                command.primitiveType = geometry.indexLists[0].primitiveType;
                command.vertexArray = this._va[i];
                command.renderState = this._rs;
                command.shaderProgram = this._sp;
                command.uniformMap = appearance.material._uniforms;
// TODO: could use bounding volume per geometry
                command.boundingVolume = geometry.boundingSphere;
                colorCommands.push(command);

                if (pickable) {
                    var pickCommand = new DrawCommand();
                    pickCommand.primitiveType = geometry.indexLists[0].primitiveType;
                    pickCommand.vertexArray = this._va[i];
                    pickCommand.renderState = this._rs;
                    pickCommand.shaderProgram = this._pickSP;
                    pickCommand.uniformMap = appearance.material._uniforms;
                    pickCommand.boundingVolume = geometry.boundingSphere;
                    pickCommands.push(pickCommand);
                }
            }
        }

        // The geometry is static but the model matrix can change
        if (frameState.passes.color || frameState.passes.pick) {
            length = colorCommands.length;
            for (var i = 0; i < length; ++i) {
                colorCommands[i].modelMatrix = this.modelMatrix;
            }

            length = pickCommands.length;
            for (var i = 0; i < length; ++i) {
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