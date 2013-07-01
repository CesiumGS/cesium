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
     * A sky box around the scene to draw stars.  The sky box is defined using the True Equator Mean Equinox (TEME) axes.
     * <p>
     * This is only supported in 3D.  The sky box is faded out when morphing to 2D or Columbus view.
     * </p>
     *
     * @alias SkyBox
     * @constructor
     *
     * @param {Object} sources The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
     *
     * @exception {DeveloperError} sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
     * @exception {DeveloperError} sources properties must all be the same type.
     *
     * @example
     * scene.skyBox = new SkyBox({
     *     positiveX : 'skybox_px.png',
     *     negativeX : 'skybox_nx.png',
     *     positiveY : 'skybox_py.png',
     *     negativeY : 'skybox_ny.png',
     *     positiveZ : 'skybox_pz.png',
     *     negativeZ : 'skybox_nz.png'
     * });
     *
     * @see Scene#skyBox
     * @see Transforms.computeTemeToPseudoFixedMatrix
     */
    var SkyBox = function(sources) {
        if ((typeof sources === 'undefined') ||
            (typeof sources.positiveX === 'undefined') ||
            (typeof sources.negativeX === 'undefined') ||
            (typeof sources.positiveY === 'undefined') ||
            (typeof sources.negativeY === 'undefined') ||
            (typeof sources.positiveZ === 'undefined') ||
            (typeof sources.negativeZ === 'undefined')) {
            throw new DeveloperError('sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.');
        }

        if ((typeof sources.positiveX !== typeof sources.negativeX) ||
            (typeof sources.positiveX !== typeof sources.positiveY) ||
            (typeof sources.positiveX !== typeof sources.negativeY) ||
            (typeof sources.positiveX !== typeof sources.positiveZ) ||
            (typeof sources.positiveX !== typeof sources.negativeZ)) {
            throw new DeveloperError('sources properties must all be the same type.');
        }

        this._command = new DrawCommand();
        this._cubeMap = undefined;
        this._sources = sources;

        /**
         * Determines if the sky box will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type {Boolean}
         * @default true
         */
        this.show = true;
    };

    /**
     * Returns the sources used to create the cube map faces: an object
     * with <code>positiveX</code>, <code>negativeX</code>, <code>positiveY</code>,
     * <code>negativeY</code>, <code>positiveZ</code>, and <code>negativeZ</code> properties.
     * These are either URLs or <code>Image</code> objects, depending on how the sky box
     * was constructed.
     *
     * @memberof SkyBox
     *
     * @return {Object} The sources used to create the cube map faces.
     */
    SkyBox.prototype.getSources = function() {
        return this._sources;
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
            var sources = this._sources;
            var that = this;

            if (typeof sources.positiveX === 'string') {
                // Given urls for cube-map images.  Load them.
                loadCubeMap(context, this._sources).then(function(cubeMap) {
                    that._cubeMap = cubeMap;
                });
            } else {
                this._cubeMap = context.createCubeMap({
                    source : sources
                });
            }

            command.uniformMap = {
                u_cubeMap: function() {
                    return that._cubeMap;
                }
            };

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
