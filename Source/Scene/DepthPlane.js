import BoundingSphere from '../Core/BoundingSphere.js';
import Cartesian3 from '../Core/Cartesian3.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
import defined from '../Core/defined.js';
import FeatureDetection from '../Core/FeatureDetection.js';
import Geometry from '../Core/Geometry.js';
import GeometryAttribute from '../Core/GeometryAttribute.js';
import PrimitiveType from '../Core/PrimitiveType.js';
import BufferUsage from '../Renderer/BufferUsage.js';
import DrawCommand from '../Renderer/DrawCommand.js';
import Pass from '../Renderer/Pass.js';
import RenderState from '../Renderer/RenderState.js';
import ShaderProgram from '../Renderer/ShaderProgram.js';
import ShaderSource from '../Renderer/ShaderSource.js';
import VertexArray from '../Renderer/VertexArray.js';
import DepthPlaneFS from '../Shaders/DepthPlaneFS.js';
import DepthPlaneVS from '../Shaders/DepthPlaneVS.js';
import SceneMode from './SceneMode.js';

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

    var depthQuadScratch = FeatureDetection.supportsTypedArrays() ? new Float32Array(12) : [];
    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();

    function computeDepthQuad(ellipsoid, frameState) {
        var radii = ellipsoid.radii;
        var p = frameState.camera.positionWC;

        // Find the corresponding position in the scaled space of the ellipsoid.
        var q = Cartesian3.multiplyComponents(ellipsoid.oneOverRadii, p, scratchCartesian1);

        var qMagnitude = Cartesian3.magnitude(q);
        var qUnit = Cartesian3.normalize(q, scratchCartesian2);

        // Determine the east and north directions at q.
        var eUnit = Cartesian3.normalize(Cartesian3.cross(Cartesian3.UNIT_Z, q, scratchCartesian3), scratchCartesian3);
        var nUnit = Cartesian3.normalize(Cartesian3.cross(qUnit, eUnit, scratchCartesian4), scratchCartesian4);

        // Determine the radius of the 'limb' of the ellipsoid.
        var wMagnitude = Math.sqrt(Cartesian3.magnitudeSquared(q) - 1.0);

        // Compute the center and offsets.
        var center = Cartesian3.multiplyByScalar(qUnit, 1.0 / qMagnitude, scratchCartesian1);
        var scalar = wMagnitude / qMagnitude;
        var eastOffset = Cartesian3.multiplyByScalar(eUnit, scalar, scratchCartesian2);
        var northOffset = Cartesian3.multiplyByScalar(nUnit, scalar, scratchCartesian3);

        // A conservative measure for the longitudes would be to use the min/max longitudes of the bounding frustum.
        var upperLeft = Cartesian3.add(center, northOffset, scratchCartesian4);
        Cartesian3.subtract(upperLeft, eastOffset, upperLeft);
        Cartesian3.multiplyComponents(radii, upperLeft, upperLeft);
        Cartesian3.pack(upperLeft, depthQuadScratch, 0);

        var lowerLeft = Cartesian3.subtract(center, northOffset, scratchCartesian4);
        Cartesian3.subtract(lowerLeft, eastOffset, lowerLeft);
        Cartesian3.multiplyComponents(radii, lowerLeft, lowerLeft);
        Cartesian3.pack(lowerLeft, depthQuadScratch, 3);

        var upperRight = Cartesian3.add(center, northOffset, scratchCartesian4);
        Cartesian3.add(upperRight, eastOffset, upperRight);
        Cartesian3.multiplyComponents(radii, upperRight, upperRight);
        Cartesian3.pack(upperRight, depthQuadScratch, 6);

        var lowerRight = Cartesian3.subtract(center, northOffset, scratchCartesian4);
        Cartesian3.add(lowerRight, eastOffset, lowerRight);
        Cartesian3.multiplyComponents(radii, lowerRight, lowerRight);
        Cartesian3.pack(lowerRight, depthQuadScratch, 9);

        return depthQuadScratch;
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
                    enabled : true
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

        // update depth plane
        var depthQuad = computeDepthQuad(ellipsoid, frameState);

        // depth plane
        if (!defined(this._va)) {
            var geometry = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : depthQuad
                    })
                },
                indices : [0, 1, 2, 2, 1, 3],
                primitiveType : PrimitiveType.TRIANGLES
            });

            this._va = VertexArray.fromGeometry({
                context : context,
                geometry : geometry,
                attributeLocations : {
                    position : 0
                },
                bufferUsage : BufferUsage.DYNAMIC_DRAW
            });

            this._command.vertexArray = this._va;
        } else {
            this._va.getAttribute(0).vertexBuffer.copyFromArrayView(depthQuad);
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
