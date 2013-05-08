/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/VertexLayout',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './SceneMode'
    ], function(
        destroyObject,
        Matrix4,
        MeshFilters,
        PrimitiveType,
        BufferUsage,
        VertexLayout,
        CommandLists,
        DrawCommand,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     */
    var Primitive = function(mesh, appearance) {
        /**
         * DOC_TBA
         */
        this.mesh = mesh;

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

    /**
     * @private
     */
    Primitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show || (frameState.mode !== SceneMode.SCENE3D)) {
// TODO: support Columbus view and 2D
            return;
        }

// TODO: throw if mesh and appearance are not defined

        if (typeof this._va === 'undefined') {
            var attributeIndices = MeshFilters.createAttributeIndices(this.mesh);
            var appearance = this.appearance;

            this._va = context.createVertexArrayFromMesh({
                mesh : this.mesh,
                attributeIndices : attributeIndices,
                bufferUsage : BufferUsage.STATIC_DRAW,
                vertexLayout : VertexLayout.INTERLEAVED
            });
            this._sp = context.getShaderCache().replaceShaderProgram(this._sp, appearance.vertexShaderSource, appearance.getFragmentShaderSource(), attributeIndices);
            this._rs = context.createRenderState(appearance.renderState);

            var colorCommand = new DrawCommand();
// TODO: primitive type from mesh
            colorCommand.primitiveType = PrimitiveType.TRIANGLES;
            colorCommand.vertexArray = this._va;
            colorCommand.renderState = this._rs;
            colorCommand.shaderProgram = this._sp;
            colorCommand.uniformMap = appearance.material._uniforms;
// TODO:    colorCommand.boundingVolume =
            colorCommand.modelMatrix = this.modelMatrix;
            this._commandLists.colorList.push(colorCommand);
        }

        if (frameState.passes.color) {
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
        this._va = this._va && this._va.destroy();
        return destroyObject(this);
    };

    return Primitive;
});