import BoxGeometry from '../Core/BoxGeometry.js';
import BoundingSphere from '../Core/BoundingSphere.js';
import Cartesian3 from '../Core/Cartesian3.js';
import defined from '../Core/defined.js';
import VertexFormat from '../Core/VertexFormat.js';
import BufferUsage from '../Renderer/BufferUsage.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Pass from '../Renderer/Pass.js';
import RenderState from '../Renderer/RenderState.js';
import ShaderProgram from '../Renderer/ShaderProgram.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import VertexArray from '../Renderer/VertexArray.js';
import DepthPlaneFS from '../Shaders/DepthPlaneFS.js';
import DepthPlaneVS from '../Shaders/DepthPlaneVS.js';
import CullFace from './CullFace.js';
import DepthFunction from './DepthFunction.js';
import SceneMode from './SceneMode.js';
import BlendingState from './BlendingState.js';

    /**
     * @private
     */
    function DepthPlane() {
        this._rs = undefined;
        this._sp = undefined;
        this._va = undefined;
        this._command = undefined;
        this._mode = undefined;
        this._useLogDepth = false;
    }

    DepthPlane.prototype.update = function(frameState) {
        this._mode = frameState.mode;
        if (frameState.mode !== SceneMode.SCENE3D) {
            return;
        }

        var context = frameState.context;
        var ellipsoid = frameState.mapProjection.ellipsoid;
        var useLogDepth = frameState.useLogDepth;

        if (!defined(this._command)) {
            this._rs = RenderState.fromCache({ // Write depth, not color
                cull : {
                    enabled : true,
                    face : CullFace.FRONT
                },
                depthTest : {
                    enabled : true,
                    func : DepthFunction.ALWAYS
                },
                /*colorMask : {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                }*/
                blending : BlendingState.ALPHA_BLEND
            });

            this._command = new DrawCommand({
                renderState : this._rs,
                boundingVolume : new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius),
                pass : Pass.OPAQUE,
                owner : this
            });
        }

        if (!defined(this._sp) || this._useLogDepth !== useLogDepth) {
            this._useLogDepth = useLogDepth;

            var vs = new ShaderSource({
                sources : [DepthPlaneVS]

            });
            var fs = new ShaderSource({
                sources : [DepthPlaneFS]
            });
            if (useLogDepth) {
                var extension =
                    '#ifdef GL_EXT_frag_depth \n' +
                    '#extension GL_EXT_frag_depth : enable \n' +
                    '#endif \n\n';

                fs.sources.push(extension);
                fs.defines.push('LOG_DEPTH');
                vs.defines.push('LOG_DEPTH');
                vs.defines.push('DISABLE_GL_POSITION_LOG_DEPTH');
            }

            this._sp = ShaderProgram.replaceCache({
                shaderProgram : this._sp,
                context : context,
                vertexShaderSource : vs,
                fragmentShaderSource : fs,
                attributeLocations : {
                    position : 0
                }
            });

            this._command.shaderProgram = this._sp;
        }

        // depth plane
        if (!defined(this._va)) {
            var dimensions = Cartesian3.multiplyByScalar(ellipsoid.radii, 2, new Cartesian3());
            var geometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
                dimensions : dimensions,
                vertexFormat : VertexFormat.POSITION_ONLY
            }));

            this._va = VertexArray.fromGeometry({
                context : context,
                geometry : geometry,
                attributeLocations : {
                    position : 0
                },
                bufferUsage : BufferUsage.STATIC_DRAW
            });

            this._command.vertexArray = this._va;
        }
    };

    DepthPlane.prototype.execute = function(context, passState) {
        if (this._mode === SceneMode.SCENE3D) {
            this._command.execute(context, passState);
        }
    };

    DepthPlane.prototype.isDestroyed = function() {
        return false;
    };

    DepthPlane.prototype.destroy = function() {
        this._sp = this._sp && this._sp.destroy();
        this._va = this._va && this._va.destroy();
    };
export default DepthPlane;
