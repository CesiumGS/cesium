/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/BoxGeometry',
        '../Core/Cartesian3',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Core/VertexFormat',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/VertexArray',
        '../Shaders/EllipsoidFS',
        '../Shaders/EllipsoidVS',
        './BlendingState',
        './CullFace',
        './Material',
        './Pass',
        './SceneMode'
    ], function(
        BoundingSphere,
        BoxGeometry,
        Cartesian3,
        combine,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        Matrix4,
        VertexFormat,
        BufferUsage,
        DrawCommand,
        RenderState,
        ShaderProgram,
        ShaderSource,
        VertexArray,
        EllipsoidFS,
        EllipsoidVS,
        BlendingState,
        CullFace,
        Material,
        Pass,
        SceneMode) {
    "use strict";

    var attributeLocations = {
        position : 0
    };

    /**
     * A renderable ellipsoid.  It can also draw spheres when the three {@link EllipsoidPrimitive#radii} components are equal.
     * <p>
     * This is only supported in 3D.  The ellipsoid is not shown in 2D or Columbus view.
     * </p>
     *
     * @alias EllipsoidPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Cartesian3} [options.center=Cartesian3.ZERO] The center of the ellipsoid in the ellipsoid's model coordinates.
     * @param {Cartesian3} [options.radii] The radius of the ellipsoid along the <code>x</code>, <code>y</code>, and <code>z</code> axes in the ellipsoid's model coordinates.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the ellipsoid from model to world coordinates.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Material} [options.material=Material.ColorType] The surface appearance of the primitive.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}
     * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
     *
     * @private
     */
    var EllipsoidPrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The center of the ellipsoid in the ellipsoid's model coordinates.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type {Cartesian3}
         * @default {@link Cartesian3.ZERO}
         *
         * @see EllipsoidPrimitive#modelMatrix
         */
        this.center = Cartesian3.clone(defaultValue(options.center, Cartesian3.ZERO));
        this._center = new Cartesian3();

        /**
         * The radius of the ellipsoid along the <code>x</code>, <code>y</code>, and <code>z</code> axes in the ellipsoid's model coordinates.
         * When these are the same, the ellipsoid is a sphere.
         * <p>
         * The default is <code>undefined</code>.  The ellipsoid is not drawn until a radii is provided.
         * </p>
         *
         * @type {Cartesian3}
         * @default undefined
         *
         * @see EllipsoidPrimitive#modelMatrix
         *
         * @example
         * // A sphere with a radius of 2.0
         * e.radii = new Cesium.Cartesian3(2.0, 2.0, 2.0);
         */
        this.radii = Cartesian3.clone(options.radii);
        this._radii = new Cartesian3();

        this._oneOverEllipsoidRadiiSquared = new Cartesian3();
        this._boundingSphere = new BoundingSphere();

        /**
         * The 4x4 transformation matrix that transforms the ellipsoid from model to world coordinates.
         * When this is the identity matrix, the ellipsoid is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         *
         * @example
         * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
         * e.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = new Matrix4();
        this._computedModelMatrix = new Matrix4();

        /**
         * Determines if the ellipsoid primitive will be shown.
         *
         * @type {Boolean}
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * The surface appearance of the ellipsoid.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type {Material}
         * @default Material.fromType(Material.ColorType)
         *
         * @see {@link https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric|Fabric}
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * e.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * e.material = Cesium.Material.fromType(Cesium.Material.StripeType);
         */
        this.material = defaultValue(options.material, Material.fromType(Material.ColorType));
        this._material = undefined;
        this._translucent = undefined;

        /**
         * User-defined object returned when the ellipsoid is picked.
         *
         * @type Object
         *
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = undefined;

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the bounding sphere for each draw command in the primitive.
         * </p>
         *
         * @type {Boolean}
         *
         * @default false
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * @private
         */
        this.onlySunLighting = defaultValue(options.onlySunLighting, false);
        this._onlySunLighting = false;

        /**
         * @private
         */
        this._depthTestEnabled = defaultValue(options.depthTestEnabled, true);

        this._sp = undefined;
        this._rs = undefined;
        this._va = undefined;

        this._pickSP = undefined;
        this._pickId = undefined;

        this._colorCommand = new DrawCommand({
            owner : defaultValue(options._owner, this)
        });
        this._pickCommand = new DrawCommand({
            owner : defaultValue(options._owner, this)
        });

        var that = this;
        this._uniforms = {
            u_radii : function() {
                return that.radii;
            },
            u_oneOverEllipsoidRadiiSquared : function() {
                return that._oneOverEllipsoidRadiiSquared;
            }
        };

        this._pickUniforms = {
            czm_pickColor : function() {
                return that._pickId.color;
            }
        };
    };

    function getVertexArray(context) {
        var vertexArray = context.cache.ellipsoidPrimitive_vertexArray;

        if (defined(vertexArray)) {
            return vertexArray;
        }

        var geometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
            dimensions : new Cartesian3(2.0, 2.0, 2.0),
            vertexFormat : VertexFormat.POSITION_ONLY
        }));

        vertexArray = VertexArray.fromGeometry({
            context : context,
            geometry : geometry,
            attributeLocations : attributeLocations,
            bufferUsage : BufferUsage.STATIC_DRAW,
            interleave : true
        });

        context.cache.ellipsoidPrimitive_vertexArray = vertexArray;
        return vertexArray;
    }

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    EllipsoidPrimitive.prototype.update = function(frameState) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D) ||
            (!defined(this.center)) ||
            (!defined(this.radii))) {
            return;
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(this.material)) {
            throw new DeveloperError('this.material must be defined.');
        }
        //>>includeEnd('debug');

        var context = frameState.context;
        var translucent = this.material.isTranslucent();
        var translucencyChanged = this._translucent !== translucent;

        if (!defined(this._rs) || translucencyChanged) {
            this._translucent = translucent;

            // If this render state is ever updated to use a non-default
            // depth range, the hard-coded values in EllipsoidVS.glsl need
            // to be updated as well.

            this._rs = RenderState.fromCache({
                // Cull front faces - not back faces - so the ellipsoid doesn't
                // disappear if the viewer enters the bounding box.
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : this._depthTestEnabled
                },
                // Only write depth when EXT_frag_depth is supported since the depth for
                // the bounding box is wrong; it is not the true depth of the ray casted ellipsoid.
                depthMask : !translucent && context.fragmentDepth,
                blending : translucent ? BlendingState.ALPHA_BLEND : undefined
            });
        }

        if (!defined(this._va)) {
            this._va = getVertexArray(context);
        }

        var boundingSphereDirty = false;

        var radii = this.radii;
        if (!Cartesian3.equals(this._radii, radii)) {
            Cartesian3.clone(radii, this._radii);

            var r = this._oneOverEllipsoidRadiiSquared;
            r.x = 1.0 / (radii.x * radii.x);
            r.y = 1.0 / (radii.y * radii.y);
            r.z = 1.0 / (radii.z * radii.z);

            boundingSphereDirty = true;
        }

        if (!Matrix4.equals(this.modelMatrix, this._modelMatrix) || !Cartesian3.equals(this.center, this._center)) {
            Matrix4.clone(this.modelMatrix, this._modelMatrix);
            Cartesian3.clone(this.center, this._center);

            // Translate model coordinates used for rendering such that the origin is the center of the ellipsoid.
            Matrix4.multiplyByTranslation(this.modelMatrix, this.center, this._computedModelMatrix);
            boundingSphereDirty = true;
        }

        if (boundingSphereDirty) {
            Cartesian3.clone(Cartesian3.ZERO, this._boundingSphere.center);
            this._boundingSphere.radius = Cartesian3.maximumComponent(radii);
            BoundingSphere.transform(this._boundingSphere, this._computedModelMatrix, this._boundingSphere);
        }

        var materialChanged = this._material !== this.material;
        this._material = this.material;
        this._material.update(context);

        var lightingChanged = this.onlySunLighting !== this._onlySunLighting;
        this._onlySunLighting = this.onlySunLighting;

        var colorCommand = this._colorCommand;
        var fs;

        // Recompile shader when material, lighting, or translucency changes
        if (materialChanged || lightingChanged || translucencyChanged) {
            fs = new ShaderSource({
                sources : [this.material.shaderSource, EllipsoidFS]
            });
            if (this.onlySunLighting) {
                fs.defines.push('ONLY_SUN_LIGHTING');
            }
            if (!translucent && context.fragmentDepth) {
                fs.defines.push('WRITE_DEPTH');
            }

            this._sp = ShaderProgram.replaceCache({
                context : context,
                shaderProgram : this._sp,
                vertexShaderSource : EllipsoidVS,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });

            colorCommand.vertexArray = this._va;
            colorCommand.renderState = this._rs;
            colorCommand.shaderProgram = this._sp;
            colorCommand.uniformMap = combine(this._uniforms, this.material._uniforms);
            colorCommand.executeInClosestFrustum = translucent;
        }

        var commandList = frameState.commandList;
        var passes = frameState.passes;

        if (passes.render) {
            colorCommand.boundingVolume = this._boundingSphere;
            colorCommand.debugShowBoundingVolume = this.debugShowBoundingVolume;
            colorCommand.modelMatrix = this._computedModelMatrix;
            colorCommand.pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

            commandList.push(colorCommand);
        }

        if (passes.pick) {
            var pickCommand = this._pickCommand;

            if (!defined(this._pickId) || (this._id !== this.id)) {
                this._id = this.id;
                this._pickId = this._pickId && this._pickId.destroy();
                this._pickId = context.createPickId({
                    primitive : this,
                    id : this.id
                });
            }

            // Recompile shader when material changes
            if (materialChanged || lightingChanged || !defined(this._pickSP)) {
                fs = new ShaderSource({
                    sources : [this.material.shaderSource, EllipsoidFS],
                    pickColorQualifier : 'uniform'
                });
                if (this.onlySunLighting) {
                    fs.defines.push('ONLY_SUN_LIGHTING');
                }
                if (!translucent && context.fragmentDepth) {
                    fs.defines.push('WRITE_DEPTH');
                }

                this._pickSP = ShaderProgram.replaceCache({
                    context : context,
                    shaderProgram : this._pickSP,
                    vertexShaderSource : EllipsoidVS,
                    fragmentShaderSource : fs,
                    attributeLocations : attributeLocations
                });

                pickCommand.vertexArray = this._va;
                pickCommand.renderState = this._rs;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = combine(combine(this._uniforms, this._pickUniforms), this.material._uniforms);
                pickCommand.executeInClosestFrustum = translucent;
            }

            pickCommand.boundingVolume = this._boundingSphere;
            pickCommand.modelMatrix = this._computedModelMatrix;
            pickCommand.pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE;

            commandList.push(pickCommand);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see EllipsoidPrimitive#destroy
     */
    EllipsoidPrimitive.prototype.isDestroyed = function() {
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see EllipsoidPrimitive#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    EllipsoidPrimitive.prototype.destroy = function() {
        this._sp = this._sp && this._sp.destroy();
        this._pickSP = this._pickSP && this._pickSP.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return EllipsoidPrimitive;
});
