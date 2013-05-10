/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/GeometryFilters',
        '../Core/PrimitiveType',
        '../Core/BoundingSphere',
        '../Renderer/BufferUsage',
        '../Renderer/VertexLayout',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './SceneMode'
    ], function(
        destroyObject,
        Matrix4,
        GeometryFilters,
        PrimitiveType,
        BoundingSphere,
        BufferUsage,
        VertexLayout,
        CommandLists,
        DrawCommand,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Primitive = function(meshes, appearance) {
        /**
         * DOC_TBA
         */
        this.meshes = meshes;

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
        this._va = undefined;

        this._commandLists = new CommandLists();
    };

    function processGeometry(geometries) {
        // Unify to world coordinates before combining.
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            GeometryFilters.transformToWorldCoordinates(geometries[i]);
        }

        var geometry = GeometryFilters.combine(geometries);

        return geometry;
    }

    /**
     * @private
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show || (frameState.mode !== SceneMode.SCENE3D)) {
// TODO: support Columbus view and 2D
            return;
        }

// TODO: throw if meshes and appearance are not defined

        var colorCommands = this._commandLists.colorList;

        if (typeof this._va === 'undefined') {
            var mesh = processGeometry(this.meshes);
            // Break into multiple meshes to fit within unsigned short indices if needed
            var meshes = GeometryFilters.fitToUnsignedShortIndices(mesh);
            var attributeIndices = GeometryFilters.createAttributeIndices(mesh);

            var va = [];
            var length = meshes.length;
            var i;
            for (i = 0; i < length; ++i) {
                va.push(context.createVertexArrayFromMesh({
                    mesh : meshes[i],
                    attributeIndices : attributeIndices,
                    bufferUsage : BufferUsage.STATIC_DRAW,
                    vertexLayout : VertexLayout.INTERLEAVED
                }));
            }

            var appearance = this.appearance;

            this._va = va;
            this._sp = context.getShaderCache().replaceShaderProgram(this._sp, appearance.vertexShaderSource, appearance.getFragmentShaderSource(), attributeIndices);
            this._rs = context.createRenderState(appearance.renderState);

            for (i = 0; i < length; ++i) {
                var command = new DrawCommand();
// TODO: this assumes indices in the meshes - and only one set
                command.primitiveType = mesh.indexLists[0].primitiveType;
                command.vertexArray = this._va[i];
                command.renderState = this._rs;
                command.shaderProgram = this._sp;
                command.uniformMap = appearance.material._uniforms;
// TODO: could use bounding volume per mesh
                command.boundingVolume = mesh.boundingSphere;
                colorCommands.push(command);
            }
        }

        if (frameState.passes.color) {
            // The geometry is static but the model matrix can change
            var len = colorCommands.length;
            for (var i = 0; i < len; ++i) {
                colorCommands[i].modelMatrix = this.modelMatrix;
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
        this._sp = this._sp && this._sp.release();

        var va = this._va;
        if (typeof va !== 'undefined') {
            var length = va.length;
            for (var i = 0; i < length; ++i) {
                va[i].destroy();
            }
            this._va = undefined;
        }

        return destroyObject(this);
    };

    return Primitive;
});