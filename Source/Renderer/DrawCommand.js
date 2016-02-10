/*global define*/
define([
        '../Core/defaultValue',
        '../Core/PrimitiveType'
    ], function(
        defaultValue,
        PrimitiveType) {
    'use strict';

    /**
     * Represents a command to the renderer for drawing.
     *
     * @private
     */
    function DrawCommand(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The bounding volume of the geometry in world space.  This is used for culling and frustum selection.
         * <p>
         * For best rendering performance, use the tightest possible bounding volume.  Although
         * <code>undefined</code> is allowed, always try to provide a bounding volume to
         * allow the tightest possible near and far planes to be computed for the scene, and
         * minimize the number of frustums needed.
         * </p>
         *
         * @type {Object}
         * @default undefined
         *
         * @see DrawCommand#debugShowBoundingVolume
         */
        this.boundingVolume = options.boundingVolume;

        /**
         * The oriented bounding box of the geometry in world space. If this is defined, it is used instead of
         * {@link DrawCommand#boundingVolume} for plane intersection testing.
         *
         * @type {OrientedBoundingBox}
         * @default undefined
         *
         * @see DrawCommand#debugShowBoundingVolume
         */
        this.orientedBoundingBox = options.orientedBoundingBox;

        /**
         * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
         * If the command was already culled, set this to <code>false</code> for a performance improvement.
         *
         * @type {Boolean}
         * @default true
         */
        this.cull = defaultValue(options.cull, true);

        /**
         * The transformation from the geometry in model space to world space.
         * <p>
         * When <code>undefined</code>, the geometry is assumed to be defined in world space.
         * </p>
         *
         * @type {Matrix4}
         * @default undefined
         */
        this.modelMatrix = options.modelMatrix;

        /**
         * The type of geometry in the vertex array.
         *
         * @type {PrimitiveType}
         * @default PrimitiveType.TRIANGLES
         */
        this.primitiveType = defaultValue(options.primitiveType, PrimitiveType.TRIANGLES);

        /**
         * The vertex array.
         *
         * @type {VertexArray}
         * @default undefined
         */
        this.vertexArray = options.vertexArray;

        /**
         * The number of vertices to draw in the vertex array.
         *
         * @type {Number}
         * @default undefined
         */
        this.count = options.count;

        /**
         * The offset to start drawing in the vertex array.
         *
         * @type {Number}
         * @default 0
         */
        this.offset = defaultValue(options.offset, 0);

        /**
         * The number of instances to draw.
         *
         * @type {Number}
         * @default 1
         */
        this.instanceCount = defaultValue(options.instanceCount, 0);

        /**
         * The shader program to apply.
         *
         * @type {ShaderProgram}
         * @default undefined
         */
        this.shaderProgram = options.shaderProgram;

        /**
         * An object with functions whose names match the uniforms in the shader program
         * and return values to set those uniforms.
         *
         * @type {Object}
         * @default undefined
         */
        this.uniformMap = options.uniformMap;

        /**
         * The render state.
         *
         * @type {RenderState}
         * @default undefined
         */
        this.renderState = options.renderState;

        /**
         * The framebuffer to draw to.
         *
         * @type {Framebuffer}
         * @default undefined
         */
        this.framebuffer = options.framebuffer;

        /**
         * The pass when to render.
         *
         * @type {Pass}
         * @default undefined
         */
        this.pass = options.pass;

        /**
         * Specifies if this command is only to be executed in the frustum closest
         * to the eye containing the bounding volume. Defaults to <code>false</code>.
         *
         * @type {Boolean}
         * @default false
         */
        this.executeInClosestFrustum = defaultValue(options.executeInClosestFrustum, false);

        /**
         * The object who created this command.  This is useful for debugging command
         * execution; it allows us to see who created a command when we only have a
         * reference to the command, and can be used to selectively execute commands
         * with {@link Scene#debugCommandFilter}.
         *
         * @type {Object}
         * @default undefined
         *
         * @see Scene#debugCommandFilter
         */
        this.owner = options.owner;

        /**
         * This property is for debugging only; it is not for production use nor is it optimized.
         * <p>
         * Draws the {@link DrawCommand#boundingVolume} for this command, assuming it is a sphere, when the command executes.
         * </p>
         *
         * @type {Boolean}
         * @default false
         *
         * @see DrawCommand#boundingVolume
         */
        this.debugShowBoundingVolume = defaultValue(options.debugShowBoundingVolume, false);

        /**
         * Used to implement Scene.debugShowFrustums.
         * @private
         */
        this.debugOverlappingFrustums = 0;

        /**
         * @private
         */
        this.oit = undefined;
    }

    /**
     * Executes the draw command.
     *
     * @param {Context} context The renderer context in which to draw.
     * @param {PassState} [passState] The state for the current render pass.
     * @param {RenderState} [renderState] The render state that will override the render state of the command.
     * @param {ShaderProgram} [shaderProgram] The shader program that will override the shader program of the command.
     */
    DrawCommand.prototype.execute = function(context, passState, renderState, shaderProgram) {
        context.draw(this, passState, renderState, shaderProgram);
    };

    return DrawCommand;
});
