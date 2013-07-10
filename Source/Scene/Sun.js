/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
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
        Cartesian3,
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

    /**
     * Draws a sun billboard.
     * <p>This is only supported in 3D and Columbus view.</p>
     *
     * @alias Sun
     * @constructor
     *
     * @example
     * scene.sun = new Sun();
     *
     * @see Scene.sun
     */
    var Sun = function() {
        this._command = new DrawCommand();

        this._boundingVolume = new BoundingSphere();
        this._boundingVolume.radius = CesiumMath.SOLAR_RADIUS * 30.0;

        this._boundingVolume2D = new BoundingSphere();
        this._boundingVolume2D.radius = this._boundingVolume.radius;

        /**
         * Determines if the sun will be shown.
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
     * @private
     */
    Sun.prototype.update = function(context, frameState) {
        if (!this.show) {
            return undefined;
        }

        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
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
            command.boundingVolume = new BoundingSphere();
        }

        var sunPosition = context.getUniformState().getSunPositionWC();
        var sunPositionCV = context.getUniformState().getSunPositionColumbusView();

        var boundingVolume = this._boundingVolume;
        var boundingVolume2D = this._boundingVolume2D;

        Cartesian3.clone(sunPosition, boundingVolume.center);
        boundingVolume2D.center.x = sunPositionCV.z;
        boundingVolume2D.center.y = sunPositionCV.x;
        boundingVolume2D.center.z = sunPositionCV.y;

        if (mode === SceneMode.SCENE3D) {
            BoundingSphere.clone(boundingVolume, command.boundingVolume);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            BoundingSphere.clone(boundingVolume2D, command.boundingVolume);
        }

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
