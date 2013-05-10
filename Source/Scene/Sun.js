/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/ComponentDatatype',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/PrimitiveType',
        '../Renderer/BlendingState',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        './SceneMode',
        '../Shaders/SunVS',
        '../Shaders/SunFS'
    ], function(
        BoundingSphere,
        Cartesian2,
        ComponentDatatype,
        destroyObject,
        CesiumMath,
        PrimitiveType,
        BlendingState,
        BufferUsage,
        DrawCommand,
        SceneMode,
        SunVS,
        SunFS) {
    "use strict";

    var Sun = function() {
        this._command = new DrawCommand();

        /**
         * Determines if the sun will be shown.
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
     * @private
     */
    Sun.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        // TODO
        if (frameState.mode !== SceneMode.SCENE3D) {
            return undefined;
        }

        if (!frameState.passes.color) {
            return undefined;
        }

        var command = this._command;

        if (typeof command.vertexArray === 'undefined') {
            var attributeIndices = {
                direction : 0
            };

            var directions = new Uint8Array(4 * 2);
            directions[0] = 0;
            directions[1] = 0;

            directions[2] = 255;
            directions[3] = 0.0;

            directions[4] = 255;
            directions[5] = 255;

            directions[6] = 0.0;
            directions[7] = 255;

            var vertexBuffer = context.createVertexBuffer(directions, BufferUsage.STATIC_DRAW);
            var attributes = [{
                index : attributeIndices.direction,
                vertexBuffer : vertexBuffer,
                componentsPerAttribute : 2,
                normalize : true,
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE
            }];
            command.vertexArray = context.createVertexArray(attributes);
            command.primitiveType = PrimitiveType.TRIANGLE_FAN;

            command.shaderProgram = context.getShaderCache().getShaderProgram(SunVS, SunFS, attributeIndices);
            command.renderState = context.createRenderState({
                blending : BlendingState.ALPHA_BLEND
            });

            var that = this;
            command.uniformMap = {
                u_morphTime : function() {
                    return that.morphTime;
                }
            };

            command.boundingVolume = new BoundingSphere();
            command.boundingVolume.radius = CesiumMath.SOLAR_RADIUS;
        }

        command.boundingVolume.center = context.getUniformState().getSunPositionWC();

        return command;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Sun
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Sun#destroy
     */
    Sun.prototype.isDestroyed = function() {
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
     * @memberof Sun
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Sun#isDestroyed
     *
     * @example
     * sun = sun && sun.destroy();
     */
    Sun.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.release();
        return destroyObject(this);
    };

    return Sun;
});