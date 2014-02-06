/*global define*/
define([
        '../Core/defaultValue',
        '../Core/BoxGeometry',
        '../Core/Cartesian3',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Core/GeometryPipeline',
        '../Core/VertexFormat',
        '../Core/PrimitiveType',
        '../Renderer/loadCubeMap',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/BlendingState',
        '../Scene/SceneMode',
        '../Shaders/SkyBoxVS',
        '../Shaders/SkyBoxFS'
    ], function(
        defaultValue,
        BoxGeometry,
        Cartesian3,
        defined,
        destroyObject,
        DeveloperError,
        Matrix4,
        GeometryPipeline,
        VertexFormat,
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
     * @param {Object} [options.sources] The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     *
     * @example
     * scene.skyBox = new Cesium.SkyBox({
     *   sources : {
     *     positiveX : 'skybox_px.png',
     *     negativeX : 'skybox_nx.png',
     *     positiveY : 'skybox_py.png',
     *     negativeY : 'skybox_ny.png',
     *     positiveZ : 'skybox_pz.png',
     *     negativeZ : 'skybox_nz.png'
     *   }
     * });
     *
     * @see Scene#skyBox
     * @see Transforms.computeTemeToPseudoFixedMatrix
     */
    var SkyBox = function(options) {
        /**
         * The sources used to create the cube map faces: an object
         * with <code>positiveX</code>, <code>negativeX</code>, <code>positiveY</code>,
         * <code>negativeY</code>, <code>positiveZ</code>, and <code>negativeZ</code> properties.
         * These can be either URLs or <code>Image</code> objects.
         *
         * @type Object
         * @default undefined
         */
        this.sources = options.sources;
        this._sources = undefined;

        /**
         * Determines if the sky box will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        this._command = new DrawCommand();
        this._command.owner = this;
        this._cubeMap = undefined;
    };

    /**
     * @exception {DeveloperError} sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
     * @exception {DeveloperError} sources properties must all be the same type.
     *
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

        // The sky box is only rendered during the render pass; it is not pickable, it doesn't cast shadows, etc.
        if (!frameState.passes.render) {
            return undefined;
        }

        if (this._sources !== this.sources) {
            this._sources = this.sources;
            var sources = this.sources;

            //>>includeStart('debug', pragmas.debug);
            if ((!defined(sources.positiveX)) ||
                (!defined(sources.negativeX)) ||
                (!defined(sources.positiveY)) ||
                (!defined(sources.negativeY)) ||
                (!defined(sources.positiveZ)) ||
                (!defined(sources.negativeZ))) {
                throw new DeveloperError('sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.');
            }

            if ((typeof sources.positiveX !== typeof sources.negativeX) ||
                (typeof sources.positiveX !== typeof sources.positiveY) ||
                (typeof sources.positiveX !== typeof sources.negativeY) ||
                (typeof sources.positiveX !== typeof sources.positiveZ) ||
                (typeof sources.positiveX !== typeof sources.negativeZ)) {
                throw new DeveloperError('sources properties must all be the same type.');
            }
            //>>includeEnd('debug');

            if (typeof sources.positiveX === 'string') {
                // Given urls for cube-map images.  Load them.
                loadCubeMap(context, this._sources).then(function(cubeMap) {
                    that._cubeMap = that._cubeMap && that._cubeMap.destroy();
                    that._cubeMap = cubeMap;
                });
            } else {
                this._cubeMap = this._cubeMap && this._cubeMap.destroy();
                this._cubeMap = context.createCubeMap({
                    source : sources
                });
            }
        }

        var command = this._command;

        if (!defined(command.vertexArray)) {
            var that = this;

            command.uniformMap = {
                u_cubeMap: function() {
                    return that._cubeMap;
                }
            };

            var geometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
                dimensions : new Cartesian3(2.0, 2.0, 2.0),
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);

            command.primitiveType = PrimitiveType.TRIANGLES;
            command.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
            command.vertexArray = context.createVertexArrayFromGeometry({
                geometry: geometry,
                attributeLocations: attributeLocations,
                bufferUsage: BufferUsage.STATIC_DRAW
            });
            command.shaderProgram = context.getShaderCache().getShaderProgram(SkyBoxVS, SkyBoxFS, attributeLocations);
            command.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        if (!defined(this._cubeMap)) {
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
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @returns {undefined}
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
