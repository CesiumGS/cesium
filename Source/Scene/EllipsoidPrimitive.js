/*global define*/
define([
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/combine',
        '../Core/ComponentDatatype',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/BoundingSphere',
        '../Core/PrimitiveType',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        '../Renderer/createPickFragmentShaderSource',
        './Material',
        './SceneMode',
        '../Shaders/EllipsoidVS',
        '../Shaders/EllipsoidFS'
    ], function(
        BoxTessellator,
        Cartesian3,
        Cartesian4,
        Color,
        combine,
        ComponentDatatype,
        DeveloperError,
        destroyObject,
        Ellipsoid,
        Matrix4,
        MeshFilters,
        BoundingSphere,
        PrimitiveType,
        CullFace,
        BlendingState,
        BufferUsage,
        CommandLists,
        DrawCommand,
        createPickFragmentShaderSource,
        Material,
        SceneMode,
        EllipsoidVS,
        EllipsoidFS) {
    "use strict";

    var attributeIndices = {
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
     * @example
     * // 1. Create a sphere using the ellipsoid primitive
     * var e = new EllipsoidPrimitive();
     * e.center = ellipsoid.cartographicToCartesian(
     *   Cartographic.fromDegrees(-75.0, 40.0, 500000.0));
     * e.radii = new Cartesian3(500000.0, 500000.0, 500000.0);
     * primitives.add(e);
     *
     * @example
     * // 2. Create a tall ellipsoid in an east-north-up reference frame
     * var e = new EllipsoidPrimitive();
     * e.modelMatrix = Transforms.eastNorthUpToFixedFrame(
     *   ellipsoid.cartographicToCartesian(
     *     Cartographic.fromDegrees(-95.0, 40.0, 200000.0)));
     * e.radii = new Cartesian3(100000.0, 100000.0, 200000.0);
     * primitives.add(e);
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Volumes.html">Cesium Sandcastle Volumes Demo</a>
     */
    var EllipsoidPrimitive = function() {
        /**
         * The center of the ellipsoid in the ellipsoid's model coordinates.
         * <p>
         * The default is {@link Cartesian3.ZERO}.
         * </p>
         *
         * @type Cartesian3
         *
         * @see EllipsoidPrimitive#modelMatrix
         */
        this.center = Cartesian3.ZERO.clone();

        /**
         * The radius of the ellipsoid along the <code>x</code>, <code>y</code>, and <code>z</code> axes in the ellipsoid's model coordinates.
         * When these are the same, the ellipsoid is a sphere.
         * <p>
         * The default is <code>undefined</code>.  The ellipsoid is not drawn until a radii is provided.
         * </p>
         *
         * @type Cartesian3
         *
         * @example
         * // A sphere with a radius of 2.0
         * e.radii = new Cartesian3(2.0, 2.0, 2.0);
         *
         * @see EllipsoidPrimitive#modelMatrix
         */
        this.radii = undefined;
        this._radii = new Cartesian3();

        this._oneOverEllipsoidRadiiSquared = new Cartesian3();
        this._boundingSphere = new BoundingSphere();

        /**
         * The 4x4 transformation matrix that transforms the ellipsoid from model to world coordinates.
         * When this is the identity matrix, the ellipsoid is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         * <p>
         * The default is {@link Matrix4.IDENTITY}.
         * </p>
         *
         * @type Matrix4
         *
         * @example
         * var origin = ellipsoid.cartographicToCartesian(
         *   Cartographic.fromDegrees(-95.0, 40.0, 200000.0));
         * e.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._computedModelMatrix = Matrix4.IDENTITY.clone();

        /**
         * Determines if the ellipsoid primitive will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * The surface appearance of the ellipsoid.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
         * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
         * <p>
         * The default material is <code>Material.ColorType</code>.
         * </p>
         *
         * @type Material
         *
         * @example
         * // 1. Change the color of the default material to yellow
         * e.material.uniforms.color = new Color(1.0, 1.0, 0.0, 1.0);
         *
         * // 2. Change material to horizontal stripes
         * e.material = Material.fromType(scene.getContext(), Material.StripeType);
         *
         * @see <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>
         */
        this.material = Material.fromType(undefined, Material.ColorType);
        this._material = undefined;

        this._sp = undefined;
        this._rs = undefined;
        this._va = undefined;

        this._pickSP = undefined;
        this._pickId = undefined;

        this._colorCommand = new DrawCommand();
        this._pickCommand = new DrawCommand();
        this._commandLists = new CommandLists();

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

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
        }

        var mesh = BoxTessellator.compute({
            dimensions : new Cartesian3(2.0, 2.0, 2.0)
        });

        vertexArray = context.createVertexArrayFromMesh({
            mesh: mesh,
            attributeIndices: attributeIndices,
            bufferUsage: BufferUsage.STATIC_DRAW
        });

        context.cache.ellipsoidPrimitive_vertexArray = vertexArray;
        return vertexArray;
    }

    /**
     * @private
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    EllipsoidPrimitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D) ||
            (typeof this.center === 'undefined') ||
            (typeof this.radii === 'undefined')) {
            return;
        }

        if (typeof this.material === 'undefined') {
            throw new DeveloperError('this.material must be defined.');
        }

        if (typeof this._rs === 'undefined') {
            this._rs = context.createRenderState({
                // Cull front faces - not back faces - so the ellipsoid doesn't
                // disappear if the viewer enters the bounding box.
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : true
                },
                // Do not write depth since the depth for the bounding box is
                // wrong; it is not the true of the ray casted ellipsoid.
                // Once WebGL has the extension for writing gl_FragDepth,
                // we can write the correct depth.  For now, most ellipsoids
                // will be translucent so we don't want to write depth anyway.
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });
        }

        if (typeof this._va === 'undefined') {
            this._va = getVertexArray(context);
        }

        var radii = this.radii;
        if (!Cartesian3.equals(this._radii, radii)) {
            Cartesian3.clone(radii, this._radii);

            var r = this._oneOverEllipsoidRadiiSquared;
            r.x = 1.0 / (radii.x * radii.x);
            r.y = 1.0 / (radii.y * radii.y);
            r.z = 1.0 / (radii.z * radii.z);

            this._boundingSphere.radius = Cartesian3.getMaximumComponent(radii);
        }

        // Translate model coordinates used for rendering such that the origin is the center of the ellipsoid.
        Matrix4.multiplyByTranslation(this.modelMatrix, this.center, this._computedModelMatrix);

        var ellipsoidCommandLists = this._commandLists;
        ellipsoidCommandLists.removeAll();

        var materialChanged = this._material !== this.material;
        this._material = this.material;

        if (frameState.passes.color) {
            var colorCommand = this._colorCommand;

            // Recompile shader when material changes
            if (materialChanged) {
                var colorFS =
                    '#line 0\n' +
                    this.material.shaderSource +
                    '#line 0\n' +
                    EllipsoidFS;

                this._sp = context.getShaderCache().replaceShaderProgram(this._sp, EllipsoidVS, colorFS, attributeIndices);

                colorCommand.primitiveType = PrimitiveType.TRIANGLES;
                colorCommand.vertexArray = this._va;
                colorCommand.renderState = this._rs;
                colorCommand.shaderProgram = this._sp;
                colorCommand.uniformMap = combine([this._uniforms, this.material._uniforms], false, false);
                colorCommand.executeInClosestFrustum = true;
            }

            colorCommand.boundingVolume = this._boundingSphere;
            colorCommand.modelMatrix = this._computedModelMatrix;

            ellipsoidCommandLists.colorList.push(colorCommand);
        }

        if (frameState.passes.pick) {
            var pickCommand = this._pickCommand;

            if (typeof this._pickId === 'undefined') {
                this._pickId = context.createPickId(this);
            }

            // Recompile shader when material changes
            if (materialChanged || typeof this._pickSP === 'undefined') {
                var pickFS = createPickFragmentShaderSource(
                    '#line 0\n' +
                    this.material.shaderSource +
                    '#line 0\n' +
                    EllipsoidFS, 'uniform');

                this._pickSP = context.getShaderCache().replaceShaderProgram(this._pickSP, EllipsoidVS, pickFS, attributeIndices);

                pickCommand.primitiveType = PrimitiveType.TRIANGLES;
                pickCommand.vertexArray = this._va;
                pickCommand.renderState = this._rs;
                pickCommand.shaderProgram = this._pickSP;
                pickCommand.uniformMap = combine([this._uniforms, this._pickUniforms, this.material._uniforms], false, false);
                pickCommand.executeInClosestFrustum = true;
            }

            pickCommand.boundingVolume = this._boundingSphere;
            pickCommand.modelMatrix = this._computedModelMatrix;

            ellipsoidCommandLists.pickList.push(pickCommand);
        }

        commandList.push(ellipsoidCommandLists);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof EllipsoidPrimitive
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @memberof EllipsoidPrimitive
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see EllipsoidPrimitive#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    EllipsoidPrimitive.prototype.destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._pickSP = this._pickSP && this._pickSP.release();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return EllipsoidPrimitive;
});