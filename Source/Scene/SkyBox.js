import BoxGeometry from '../Core/BoxGeometry.js';
import Cartesian3 from '../Core/Cartesian3.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import GeometryPipeline from '../Core/GeometryPipeline.js';
import Matrix4 from '../Core/Matrix4.js';
import VertexFormat from '../Core/VertexFormat.js';
import BufferUsage from '../Renderer/BufferUsage.js';
import CubeMap from '../Renderer/CubeMap.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import loadCubeMap from '../Renderer/loadCubeMap.js';
import RenderState from '../Renderer/RenderState.js';
import ShaderProgram from '../Renderer/ShaderProgram.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import VertexArray from '../Renderer/VertexArray.js';
import SkyBoxFS from '../Shaders/SkyBoxFS.js';
import SkyBoxVS from '../Shaders/SkyBoxVS.js';
import BlendingState from './BlendingState.js';
import SceneMode from './SceneMode.js';

    /**
     * A sky box around the scene to draw stars.  The sky box is defined using the True Equator Mean Equinox (TEME) axes.
     * <p>
     * This is only supported in 3D.  The sky box is faded out when morphing to 2D or Columbus view.  The size of
     * the sky box must not exceed {@link Scene#maximumCubeMapSize}.
     * </p>
     *
     * @alias SkyBox
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Object} [options.sources] The source URL or <code>Image</code> object for each of the six cube map faces.  See the example below.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     *
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
    function SkyBox(options) {
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

        this._command = new DrawCommand({
            modelMatrix : Matrix4.clone(Matrix4.IDENTITY),
            owner : this
        });
        this._cubeMap = undefined;

        this._attributeLocations = undefined;
        this._useHdr = undefined;
    }

    /**
     * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
     * get the draw commands needed to render this primitive.
     * <p>
     * Do not call this function directly.  This is documented just to
     * list the exceptions that may be propagated when the scene is rendered:
     * </p>
     *
     * @exception {DeveloperError} this.sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.
     * @exception {DeveloperError} this.sources properties must all be the same type.
     */
    SkyBox.prototype.update = function(frameState, useHdr) {
        var that = this;

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

        var context = frameState.context;

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
                throw new DeveloperError('this.sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.');
            }

            if ((typeof sources.positiveX !== typeof sources.negativeX) ||
                (typeof sources.positiveX !== typeof sources.positiveY) ||
                (typeof sources.positiveX !== typeof sources.negativeY) ||
                (typeof sources.positiveX !== typeof sources.positiveZ) ||
                (typeof sources.positiveX !== typeof sources.negativeZ)) {
                throw new DeveloperError('this.sources properties must all be the same type.');
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
                this._cubeMap = new CubeMap({
                    context : context,
                    source : sources
                });
            }
        }

        var command = this._command;

        if (!defined(command.vertexArray)) {
            command.uniformMap = {
                u_cubeMap: function() {
                    return that._cubeMap;
                }
            };

            var geometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
                dimensions : new Cartesian3(2.0, 2.0, 2.0),
                vertexFormat : VertexFormat.POSITION_ONLY
            }));
            var attributeLocations = this._attributeLocations = GeometryPipeline.createAttributeLocations(geometry);

            command.vertexArray = VertexArray.fromGeometry({
                context : context,
                geometry : geometry,
                attributeLocations : attributeLocations,
                bufferUsage : BufferUsage.STATIC_DRAW
            });

            command.renderState = RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        if (!defined(command.shaderProgram) || this._useHdr !== useHdr) {
            var fs = new ShaderSource({
                defines : [useHdr ? 'HDR' : ''],
                sources : [SkyBoxFS]
            });
            command.shaderProgram = ShaderProgram.fromCache({
                context : context,
                vertexShaderSource : SkyBoxVS,
                fragmentShaderSource : fs,
                attributeLocations : this._attributeLocations
            });
            this._useHdr = useHdr;
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * skyBox = skyBox && skyBox.destroy();
     *
     * @see SkyBox#isDestroyed
     */
    SkyBox.prototype.destroy = function() {
        var command = this._command;
        command.vertexArray = command.vertexArray && command.vertexArray.destroy();
        command.shaderProgram = command.shaderProgram && command.shaderProgram.destroy();
        this._cubeMap = this._cubeMap && this._cubeMap.destroy();
        return destroyObject(this);
    };
export default SkyBox;
