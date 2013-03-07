/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/BoxTessellator',
        '../Core/Cartesian3',
        '../Core/combine',
        '../Core/Matrix4',
        '../Core/MeshFilters',
        '../Core/PrimitiveType',
        '../Renderer/CullFace',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Scene/Material',
        '../Shaders/EllipsoidVS',
        '../Shaders/EllipsoidFS'
    ], function(
        DeveloperError,
        defaultValue,
        BoxTessellator,
        Cartesian3,
        combine,
        Matrix4,
        MeshFilters,
        PrimitiveType,
        CullFace,
        BlendingState,
        BufferUsage,
        Material,
        EllipsoidVS,
        EllipsoidFS) {
    "use strict";

    /**
     * Represents a command to the renderer for drawing.
     *
     * @alias DrawCommand
     * @constructor
     */
    var DrawCommand = function() {
        /**
         * The bounding volume of the geometry.
         * @type DOC_TBA
         */
        this.boundingVolume = undefined;

        /**
         * The transformation from the geometry in model space to world space.
         * @type Matrix4
         */
        this.modelMatrix = undefined;

        /**
         * The type of geometry in the vertex array.
         * @type PrimitiveType
         */
        this.primitiveType = undefined;

        /**
         * The vertex array.
         * @type VertexArray
         */
        this.vertexArray = undefined;

        /**
         * The number of vertices to draw in the vertex array.
         * @type Number
         */
        this.count = undefined;

        /**
         * The offset to start drawing in the vertex array.
         * @type Number
         */
        this.offset = undefined;

        /**
         * The shader program to apply.
         * @type ShaderProgram
         */
        this.shaderProgram = undefined;

        /**
         * An object with functions whose names match the uniforms in the shader program
         * and return values to set those uniforms.
         * @type Object
         */
        this.uniformMap = undefined;

        /**
         * The render state.
         * @type Object
         *
         * @see Context#createRenderState
         */
        this.renderState = undefined;

        /**
         * The framebuffer to draw to.
         * @type Framebuffer
         */
        this.framebuffer = undefined;

        /**
         * Specifies if this command is only to be executed in the frustum closest
         * to the eye containing the bounding volume. Defaults to <code>false</code>.
         * @type Boolean
         */
        this.executeInClosestFrustum = false;

        /**
         *
         */
        this.debug = {
            /**
             *
             */
            creator : undefined,

            /**
             *
             */
            showBoundingVolume : false
        };
    };

    /**
     * Executes the draw command.
     *
     * @memberof DrawCommand
     *
     * @param {Context} context The renderer context in which to draw.
     * @param {Framebuffer} [framebuffer] The framebuffer to which to draw if one is not specified by the command.
     */
    DrawCommand.prototype.execute = function(context, framebuffer) {
        context.draw(this, framebuffer);

        // Debug code to draw bounding volume for command.  Not optimized!
        if (this.debug.showBoundingVolume && typeof this.boundingVolume !== 'undefined') {
            var r = this.boundingVolume.radius;
            var radii = new Cartesian3(r, r, r);

// TODO: material is part of Scene; not renderer.
            var material = Material.fromType(context, Material.ColorType);
            var uniforms = {
                u_radii : function() {
                    return radii;
                },
                u_oneOverEllipsoidRadiiSquared : function() {
                    return new Cartesian3(
                        1.0 / (radii.x * radii.x),
                        1.0 / (radii.y * radii.y),
                        1.0 / (radii.z * radii.z));
                }
            };

            var attributeIndices = {
                position : 0
            };

            var fsSource =
                '#line 0\n' +
                material.shaderSource +
                '#line 0\n' +
                EllipsoidFS;

            var sp = context.getShaderCache().getShaderProgram(EllipsoidVS, fsSource, attributeIndices);
            var rs = context.createRenderState({
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : true
                },
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });

            var mesh = BoxTessellator.compute({
                dimensions : new Cartesian3(2.0, 2.0, 2.0)
            });

            var va = context.createVertexArrayFromMesh({
                mesh: mesh,
                attributeIndices: attributeIndices,
                bufferUsage: BufferUsage.STATIC_DRAW
            });

            var command = new DrawCommand();
            command.primitiveType = PrimitiveType.TRIANGLES;
            command.vertexArray = va;
            command.renderState = rs;
            command.shaderProgram = sp;
            command.uniformMap = combine([uniforms, material._uniforms], false, false);
            command.modelMatrix = Matrix4.multiplyByTranslation(defaultValue(this.modelMatrix, Matrix4.IDENTITY), this.boundingVolume.center);

            command.execute(context, framebuffer);

            va.destroy();
            sp.release();
        }
    };

    return DrawCommand;
});