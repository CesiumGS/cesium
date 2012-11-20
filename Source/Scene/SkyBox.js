/*global define*/
define([
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Renderer/loadCubeMap',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/BlendingState',
        '../Scene/SceneMode',
        '../Shaders/SkyBoxVS',
        '../Shaders/SkyBoxFS'
    ], function(
        BoxTessellator,
        Cartesian3,
        destroyObject,
        DeveloperError,
        Matrix4,
        MeshFilters,
        PrimitiveType,
        loadCubeMap,
        BufferUsage,
        DrawCommand,
        BlendingState,
        SceneMode,
        SkyBoxVS,
        SkyBoxFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias SkyBox
     * @constructor
     *
     * @exception {DeveloperError} cubeMapUrls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
     */
    var SkyBox = function(cubeMapUrls) {
        if ((typeof cubeMapUrls === 'undefined') ||
            (typeof cubeMapUrls.positiveX === 'undefined') ||
            (typeof cubeMapUrls.negativeX === 'undefined') ||
            (typeof cubeMapUrls.positiveY === 'undefined') ||
            (typeof cubeMapUrls.negativeY === 'undefined') ||
            (typeof cubeMapUrls.positiveZ === 'undefined') ||
            (typeof cubeMapUrls.negativeZ === 'undefined')) {
            throw new DeveloperError('cubeMapUrls is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.');
        }

        this._command = new DrawCommand();
        this._cubeMap = undefined;
        this._cubeMapUrls = cubeMapUrls;

        /**
         * Determines if the sky box will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type Number
         */
        this.morphTime = 1.0;
    };

    /**
     * DOC_TBA
     *
     * @memberof SkyBox
     */
    SkyBox.prototype.getCubeMapUrls = function() {
        return this._cubeMapUrls;
    };

    /**
     * @private
     */
    SkyBox.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        if ((frameState.mode !== SceneMode.SCENE3D) &&
            (frameState.mode !== SceneMode.MORPHING)) {
            return undefined;
        }

        // The sky box is only rendered during the color pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.color) {
            return undefined;
        }

        var command = this._command;

        if (typeof command.vertexArray === 'undefined') {
            var that = this;

            loadCubeMap(context, this._cubeMapUrls).then(function(cubeMap) {
                that._cubeMap = cubeMap;

                command.uniformMap = {
                    u_cubeMap: function() {
                        return cubeMap;
                    },
                    u_morphTime : function() {
                        return that.morphTime;
                    }
                };
            });

            var mesh = BoxTessellator.compute({
                dimensions : new Cartesian3(2.0, 2.0, 2.0)
            });
            var attributeIndices = MeshFilters.createAttributeIndices(mesh);

            command.primitiveType = PrimitiveType.TRIANGLES;
            command.modelMatrix = Matrix4.IDENTITY.clone();
            command.vertexArray = context.createVertexArrayFromMesh({
                mesh: mesh,
                attributeIndices: attributeIndices,
                bufferUsage: BufferUsage.STATIC_DRAW
            });
            command.shaderProgram = context.getShaderCache().getShaderProgram(SkyBoxVS, SkyBoxFS, attributeIndices);
            command.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        if (typeof this._cubeMap === 'undefined') {
            return undefined;
        }

        return command;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof SkyBox
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see SkyBox#destroy
     */
    SkyBox.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof SkyBox
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see SkyBox#isDestroyed
     *
     * @example
     * skyBox = skyBox && skyBox.destroy();
     */
    SkyBox.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.release();
        this._cubeMap = this._cubeMap && this._cubeMap.destroy();
        return destroyObject(this);
    };

    return SkyBox;
});