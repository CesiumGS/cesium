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

        this._commands = [];
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
            var attributeIndices = GeometryFilters.createAttributeIndices(this.mesh);
            var appearance = this.appearance;

            this._va = context.createVertexArrayFromMesh({
                mesh : this.mesh,
                attributeIndices : attributeIndices,
                bufferUsage : BufferUsage.STATIC_DRAW,
                vertexLayout : VertexLayout.INTERLEAVED
            });
            this._sp = context.getShaderCache().replaceShaderProgram(this._sp, appearance.vertexShaderSource, appearance.getFragmentShaderSource(), attributeIndices);
            this._rs = context.createRenderState(appearance.renderState);

            var command = new DrawCommand();
// TODO: best owner?  Include mesh?
            command.owner = this;
// TODO: this assumes indices in the mesh - and only one set
            command.primitiveType = this.mesh.indexLists[0].primitiveType;
            command.vertexArray = this._va;
            command.renderState = this._rs;
            command.shaderProgram = this._sp;
            command.uniformMap = appearance.material._uniforms;
            command.boundingVolume = this.mesh.boundingSphere;
//            command.boundingVolume = BoundingSphere.fromVertices(this.mesh.attributes.position.values);

            this._commands.push(command);
        }

        if (frameState.passes.color) {
            var commands = this._commands;
            var len = commands.length;
            for (var i = 0; i < len; ++i) {
                commands[i].modelMatrix = this.modelMatrix;
                this._commandLists.colorList[i] = commands[i];
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
        this._va = this._va && this._va.destroy();
        return destroyObject(this);
    };

    return Primitive;
});