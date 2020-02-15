import BoundingSphere from '../Core/BoundingSphere.js';
import Cartesian3 from '../Core/Cartesian3.js';
import defined from '../Core/defined.js';
import EllipsoidGeometry from '../Core/EllipsoidGeometry.js';
import Matrix3 from '../Core/Matrix3.js';
import Matrix4 from '../Core/Matrix4.js';
import Quaternion from '../Core/Quaternion.js';
import VertexFormat from '../Core/VertexFormat.js';
import BufferUsage from '../Renderer/BufferUsage.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Pass from '../Renderer/Pass.js';
import RenderState from '../Renderer/RenderState.js';
import ShaderProgram from '../Renderer/ShaderProgram.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import VertexArray from '../Renderer/VertexArray.js';
import SceneMode from './SceneMode.js';
import CullFace from './CullFace.js';
import Cesium3DTileOptimizationHint from './Cesium3DTileOptimizationHint.js';
import DepthPlaneFS from '../Shaders/DepthPlaneFS.js';
import DepthPlaneVS from '../Shaders/DepthPlaneVS.js';


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
                    face : CullFace.BACK
                },
                depthTest : {
                    enabled : true
                },
                colorMask : {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                }
            });

            this._command = new DrawCommand({
                renderState : this._rs,
                boundingVolume : new BoundingSphere(Cartesian3.ZERO, ellipsoid.maximumRadius),
                pass : Pass.OPAQUE,
                owner : this
            });
        }

        var minimumHeight = Math.min(frameState.minimumTerrainHeight, 0.0);
        var scale = ellipsoid.maximumRadius;// + minimumHeight;
        var axesScale = new Cartesian3(scale * 2, scale * 2, scale * 0.025);
        //var axis = Cartesian3.normalize(frameState.camera.positionWC, new Cartesian3());
        var quaternion = Quaternion.fromRotationMatrix(context.uniformState.inverseViewRotation3D);
        //var quaternion = Quaternion.IDENTITY;
        var modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(Cartesian3.ZERO, quaternion, axesScale);
        this._command.modelMatrix = modelMatrix;

        if (!defined(this._sp) || this._useLogDepth !== useLogDepth) {
            this._useLogDepth = useLogDepth;

            var depthEllipsoidVS =
            'attribute vec4 position;\n' +
            'void main()\n' +
            '{\n' +
            '    gl_Position = czm_modelViewProjection * position;\n' +
            '}\n';

            var depthEllipsoidFS =
            'void main()\n' +
            '{\n' +
            '    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);\n' +
            '}\n';

            var vs = new ShaderSource({
                sources : [DepthPlaneVS]
            });
            var fs = new ShaderSource({
                sources : [DepthPlaneFS]
            });

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

        if (!defined(this._va)) {
            var geometry = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
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
