import defaultValue from '../Core/defaultValue.js';
import Pass from './Pass.js';

    /**
     * Represents a command to the renderer for GPU Compute (using old-school GPGPU).
     *一个特殊的DrawCommand，它不是为了渲染，而是通过渲染机制，实现GPU的计算
     * @private
     */
    function ComputeCommand(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The vertex array. If none is provided, a viewport quad will be used.
         *
         * @type {VertexArray}
         * @default undefined
         */
        this.vertexArray = options.vertexArray;

        /**
         * The fragment shader source. The default vertex shader is ViewportQuadVS.
         *
         * @type {ShaderSource}
         * @default undefined
         */
        this.fragmentShaderSource = options.fragmentShaderSource;

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
         * Texture to use for offscreen rendering.
         * 执行后的结果保存在outputTexture
         * @type {Texture}
         * @default undefined
         */
        this.outputTexture = options.outputTexture;

        /**
         * Function that is called immediately before the ComputeCommand is executed. Used to
         * update any renderer resources. Takes the ComputeCommand as its single argument.
         *执行前计算一下当前网格中插值点经纬度和墨卡托 并构建相关的参数，比如GLSL中的计算逻辑,传入的参数，包括attribute和uniform等
         * @type {Function}
         * @default undefined
         */
        this.preExecute = options.preExecute;

        /**
         * Function that is called after the ComputeCommand is executed. Takes the output
         * texture as its single argument.
         *
         * @type {Function}
         * @default undefined
         */
        this.postExecute = options.postExecute;

        /**
         * Whether the renderer resources will persist beyond this call. If not, they
         * will be destroyed after completion.
         *
         * @type {Boolean}
         * @default false
         */
        this.persists = defaultValue(options.persists, false);

        /**
         * The pass when to render. Always compute pass.
         *
         * @type {Pass}
         * @default Pass.COMPUTE;
         */
        this.pass = Pass.COMPUTE;

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
    }

    /**
     * Executes the compute command.
     *
     * @param {ComputeEngine} computeEngine The context that processes the compute command.
     */
    ComputeCommand.prototype.execute = function(computeEngine) {
        computeEngine.execute(this);
    };
export default ComputeCommand;
