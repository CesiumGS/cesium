/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Matrix2',
        '../Core/Matrix3',
        '../Core/Matrix4',
        './UniformDatatype',
        '../Shaders/BuiltinFunctions'
    ], function(
        DeveloperError,
        RuntimeError,
        destroyObject,
        CesiumMath,
        Matrix2,
        Matrix3,
        Matrix4,
        UniformDatatype,
        ShadersBuiltinFunctions) {
    "use strict";
    /*global console*/

    var allAutomaticUniforms = {
        /**
         * An automatic GLSL uniform containing the viewport's <code>x</code>, <code>y</code>, <code>width</code>,
         * and <code>height</code> properties in an <code>vec4</code>'s <code>x</code>, <code>y</code>, <code>z</code>,
         * and <code>w</code> components, respectively.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewport</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewport
         * @glslUniform
         *
         * @see Context#getViewport
         *
         * @example
         * // GLSL declaration
         * uniform vec4 czm_viewport;
         *
         * // Scale the window coordinate components to [0, 1] by dividing
         * // by the viewport's width and height.
         * vec2 v = gl_FragCoord.xy / czm_viewport.zw;
         */
        czm_viewport : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR4;
            },

            getValue : function(uniformState) {
                var v = uniformState.getViewport();
                return {
                    x : v.x,
                    y : v.y,
                    z : v.width,
                    w : v.height
                };
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 orthographic projection matrix that
         * transforms window coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         * <br /><br />
         * This transform is useful when a vertex shader inputs or manipulates window coordinates
         * as done by {@link BillboardCollection}.
         * <br /><br />
         * Do not confuse {@link czm_viewportTransformation} with <code>czm_viewportOrthographic</code>.
         * The former transforms from normalized device coordinates to window coordinates; the later transforms
         * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewportOrthographic</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewportOrthographic
         * @glslUniform
         *
         * @see UniformState#getViewportOrthographic
         * @see czm_viewport
         * @see czm_viewportTransformation
         * @see BillboardCollection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_viewportOrthographic;
         *
         * // Example
         * gl_Position = czm_viewportOrthographic * vec4(windowPosition, 0.0, 1.0);
         */
        czm_viewportOrthographic : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getViewportOrthographic();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms normalized device coordinates to window coordinates.  The context's
         * full viewport is used, and the depth range is assumed to be <code>near = 0</code>
         * and <code>far = 1</code>.
         * <br /><br />
         * This transform is useful when there is a need to manipulate window coordinates
         * in a vertex shader as done by {@link BillboardCollection}.  In many cases,
         * this matrix will not be used directly; instead, {@link czm_modelToWindowCoordinates}
         * will be used to transform directly from model to window coordinates.
         * <br /><br />
         * Do not confuse <code>czm_viewportTransformation</code> with {@link czm_viewportOrthographic}.
         * The former transforms from normalized device coordinates to window coordinates; the later transforms
         * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewportTransformation</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewportTransformation
         * @glslUniform
         *
         * @see UniformState#getViewportTransformation
         * @see czm_viewport
         * @see czm_viewportOrthographic
         * @see czm_modelToWindowCoordinates
         * @see BillboardCollection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_viewportTransformation;
         *
         * // Use czm_viewportTransformation as part of the
         * // transform from model to window coordinates.
         * vec4 q = czm_modelViewProjection * positionMC;               // model to clip coordinates
         * q.xyz /= q.w;                                                // clip to normalized device coordinates (ndc)
         * q.xyz = (czm_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // ndc to window coordinates
         */
        czm_viewportTransformation : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getViewportTransformation();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model transformation matrix that
         * transforms model coordinates to world coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_model</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_model
         * @glslUniform
         *
         * @see UniformState#getModel
         * @see czm_inverseModel
         * @see czm_modelView
         * @see czm_modelViewProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_model;
         *
         * // Example
         * vec4 worldPosition = czm_model * modelPosition;
         */
        czm_model : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModel();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model transformation matrix that
         * transforms world coordinates to model coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseModel</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseModel
         * @glslUniform
         *
         * @see UniformState#getInverseModel
         * @see czm_model
         * @see czm_inverseModelView
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModel;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModel * worldPosition;
         */
        czm_inverseModel : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseModel();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 view transformation matrix that
         * transforms world coordinates to eye coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_view</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_view
         * @glslUniform
         *
         * @see UniformState#getView
         * @see czm_viewRotation
         * @see czm_modelView
         * @see czm_viewProjection
         * @see czm_modelViewProjection
         * @see czm_inverseView
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_view;
         *
         * // Example
         * vec4 eyePosition = czm_view * worldPosition;
         */
        czm_view : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getView();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 view transformation matrix that
         * transforms 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_view}, but in 2D and Columbus View it represents the view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_view3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_view3D
         * @glslUniform
         *
         * @see UniformState#getView3D
         * @see czm_view
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_view3D;
         *
         * // Example
         * vec4 eyePosition3D = czm_view3D * worldPosition3D;
         */
        czm_view3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getView3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 view rotation matrix that
         * transforms vectors in world coordinates to eye coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewRotation</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewRotation
         * @glslUniform
         *
         * @see UniformState#getViewRotation
         * @see czm_view
         * @see czm_inverseView
         * @see czm_inverseViewRotation
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_viewRotation;
         *
         * // Example
         * vec3 eyeVector = czm_viewRotation * worldVector;
         */
        czm_viewRotation : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getViewRotation();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 view rotation matrix that
         * transforms vectors in 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_viewRotation}, but in 2D and Columbus View it represents the view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewRotation3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewRotation3D
         * @glslUniform
         *
         * @see UniformState#getViewRotation3D
         * @see czm_viewRotation
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_viewRotation3D;
         *
         * // Example
         * vec3 eyeVector = czm_viewRotation3D * worldVector;
         */
        czm_viewRotation3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getViewRotation3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to world coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseView</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseView
         * @glslUniform
         *
         * @see UniformState#getInverseView
         * @see czm_view
         * @see czm_inverseNormal
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseView;
         *
         * // Example
         * vec4 worldPosition = czm_inverseView * eyePosition;
         */
        czm_inverseView : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseView();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseView}, but in 2D and Columbus View it represents the inverse view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseView3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseView3D
         * @glslUniform
         *
         * @see UniformState#getInverseView3D
         * @see czm_inverseView
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseView3D;
         *
         * // Example
         * vec4 worldPosition = czm_inverseView3D * eyePosition;
         */
        czm_inverseView3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseView3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that
         * transforms vectors from eye coordinates to world coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseViewRotation</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseViewRotation
         * @glslUniform
         *
         * @see UniformState#getInverseView
         * @see czm_view
         * @see czm_viewRotation
         * @see czm_inverseViewRotation
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseViewRotation;
         *
         * // Example
         * vec4 worldVector = czm_inverseViewRotation * eyeVector;
         */
        czm_inverseViewRotation : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseViewRotation();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that
         * transforms vectors from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseViewRotation}, but in 2D and Columbus View it represents the inverse view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseViewRotation3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseViewRotation3D
         * @glslUniform
         *
         * @see UniformState#getInverseView3D
         * @see czm_inverseViewRotation
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseViewRotation3D;
         *
         * // Example
         * vec4 worldVector = czm_inverseViewRotation3D * eyeVector;
         */
        czm_inverseViewRotation3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseViewRotation3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 projection transformation matrix that
         * transforms eye coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_projection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_projection
         * @glslUniform
         *
         * @see UniformState#getProjection
         * @see czm_viewProjection
         * @see czm_modelViewProjection
         * @see czm_infiniteProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_projection;
         *
         * // Example
         * gl_Position = czm_projection * eyePosition;
         */
        czm_projection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 inverse projection transformation matrix that
         * transforms from clip coordinates to eye coordinates. Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseProjection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseProjection
         * @glslUniform
         *
         * @see UniformState#getInverseProjection
         * @see czm_projection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseProjection;
         *
         * // Example
         * vec4 eyePosition = czm_inverseProjection * clipPosition;
         */
        czm_inverseProjection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 projection transformation matrix with the far plane at infinity,
         * that transforms eye coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  An infinite far plane is used
         * in algorithms like shadow volumes and GPU ray casting with proxy geometry to ensure that triangles
         * are not clipped by the far plane.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_infiniteProjection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_infiniteProjection
         * @glslUniform
         *
         * @see UniformState#getInfiniteProjection
         * @see czm_projection
         * @see czm_modelViewInfiniteProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_infiniteProjection;
         *
         * // Example
         * gl_Position = czm_infiniteProjection * eyePosition;
         */
        czm_infiniteProjection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInfiniteProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms model coordinates to eye coordinates.
         * <br /><br />
         * Positions should be transformed to eye coordinates using <code>czm_modelView</code> and
         * normals should be transformed using {@link czm_normal}.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelView</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelView
         * @glslUniform
         *
         * @see UniformState#getModelView
         * @see czm_model
         * @see czm_view
         * @see czm_modelViewProjection
         * @see czm_normal
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelView;
         *
         * // Example
         * vec4 eyePosition = czm_modelView * modelPosition;
         *
         * // The above is equivalent to, but more efficient than:
         * vec4 eyePosition = czm_view * czm_model * modelPosition;
         */
        czm_modelView : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelView();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms 3D model coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_modelView}, but in 2D and Columbus View it represents the model-view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Positions should be transformed to eye coordinates using <code>czm_modelView3D</code> and
         * normals should be transformed using {@link czm_normal3D}.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelView3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelView3D
         * @glslUniform
         *
         * @see UniformState#getModelView3D
         * @see czm_modelView
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelView3D;
         *
         * // Example
         * vec4 eyePosition = czm_modelView3D * modelPosition;
         *
         * // The above is equivalent to, but more efficient than:
         * vec4 eyePosition = czm_view3D * czm_model * modelPosition;
         */
        czm_modelView3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelView3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms model coordinates, relative to the eye, to eye coordinates.  This is used
         * in conjunction with {@link czm_translateRelativeToEye}.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelViewRelativeToEye</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelViewRelativeToEye
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelViewRelativeToEye;
         *
         * // Example
         * attribute vec3 positionHigh;
         * attribute vec3 positionLow;
         *
         * void main()
         * {
         *   vec3 p = czm_translateRelativeToEye(positionHigh, positionLow);
         *   gl_Position = czm_projection * (czm_modelViewRelativeToEye * vec4(p, 1.0));
         * }
         *
         * @see czm_modelViewProjectionRelativeToEye
         * @see czm_translateRelativeToEye
         * @see EncodedCartesian3
         */
        czm_modelViewRelativeToEye : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelViewRelativeToEye();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to model coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseModelView</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseModelView
         * @glslUniform
         *
         * @see UniformState#getInverseModelView
         * @see czm_modelView
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModelView;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModelView * eyePosition;
         */
        czm_inverseModelView : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseModelView();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to 3D model coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseModelView}, but in 2D and Columbus View it represents the inverse model-view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseModelView3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseModelView3D
         * @glslUniform
         *
         * @see UniformState#getInverseModelView
         * @see czm_inverseModelView
         * @see czm_modelView3D
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModelView3D;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModelView3D * eyePosition;
         */
        czm_inverseModelView3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseModelView3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
         * transforms world coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_viewProjection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewProjection
         * @glslUniform
         *
         * @see UniformState#getViewProjection
         * @see czm_view
         * @see czm_projection
         * @see czm_modelViewProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_viewProjection;
         *
         * // Example
         * vec4 gl_Position = czm_viewProjection * czm_model * modelPosition;
         *
         * // The above is equivalent to, but more efficient than:
         * gl_Position = czm_projection * czm_view * czm_model * modelPosition;
         */
        czm_viewProjection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getViewProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelViewProjection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelViewProjection
         * @glslUniform
         *
         * @see UniformState#getModelViewProjection
         * @see czm_model
         * @see czm_view
         * @see czm_projection
         * @see czm_modelView
         * @see czm_viewProjection
         * @see czm_modelViewInfiniteProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelViewProjection;
         *
         * // Example
         * vec4 gl_Position = czm_modelViewProjection * modelPosition;
         *
         * // The above is equivalent to, but more efficient than:
         * gl_Position = czm_projection * czm_view * czm_model * modelPosition;
         */
        czm_modelViewProjection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelViewProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates, relative to the eye, to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  This is used in
         * conjunction with {@link czm_translateRelativeToEye}.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelViewProjectionRelativeToEye</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelViewProjectionRelativeToEye
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelViewProjectionRelativeToEye;
         *
         * // Example
         * attribute vec3 positionHigh;
         * attribute vec3 positionLow;
         *
         * void main()
         * {
         *   vec3 p = czm_translateRelativeToEye(positionHigh, positionLow);
         *   gl_Position = czm_modelViewProjectionRelativeToEye * vec4(p, 1.0);
         * }
         *
         * @see czm_modelViewRelativeToEye
         * @see czm_translateRelativeToEye
         * @see EncodedCartesian3
         */
        czm_modelViewProjectionRelativeToEye : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelViewProjectionRelativeToEye();
            }
        },

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  The projection matrix places
         * the far plane at infinity.  This is useful in algorithms like shadow volumes and GPU ray casting with
         * proxy geometry to ensure that triangles are not clipped by the far plane.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_modelViewInfiniteProjection</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_modelViewInfiniteProjection
         * @glslUniform
         *
         * @see UniformState#getModelViewInfiniteProjection
         * @see czm_model
         * @see czm_view
         * @see czm_infiniteProjection
         * @see czm_modelViewProjection
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_modelViewInfiniteProjection;
         *
         * // Example
         * vec4 gl_Position = czm_modelViewInfiniteProjection * modelPosition;
         *
         * // The above is equivalent to, but more efficient than:
         * gl_Position = czm_infiniteProjection * czm_view * czm_model * modelPosition;
         */
        czm_modelViewInfiniteProjection : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX4;
            },

            getValue : function(uniformState) {
                return uniformState.getModelViewInfiniteProjection();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in model coordinates to eye coordinates.
         * <br /><br />
         * Positions should be transformed to eye coordinates using {@link czm_modelView} and
         * normals should be transformed using <code>czm_normal</code>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_normal</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_normal
         * @glslUniform
         *
         * @see UniformState#getNormal
         * @see czm_inverseNormal
         * @see czm_modelView
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_normal;
         *
         * // Example
         * vec3 eyeNormal = czm_normal * normal;
         */
        czm_normal : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getNormal();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in 3D model coordinates to eye coordinates.
         * In 3D mode, this is identical to
         * {@link czm_normal}, but in 2D and Columbus View it represents the normal transformation
         * matrix as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Positions should be transformed to eye coordinates using {@link czm_modelView3D} and
         * normals should be transformed using <code>czm_normal3D</code>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_normal3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_normal3D
         * @glslUniform
         *
         * @see UniformState#getNormal3D
         * @see czm_normal
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_normal3D;
         *
         * // Example
         * vec3 eyeNormal = czm_normal3D * normal;
         */
        czm_normal3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getNormal3D();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in eye coordinates to model coordinates.  This is
         * the opposite of the transform provided by {@link czm_normal}.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseNormal</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseNormal
         * @glslUniform
         *
         * @see UniformState#getInverseNormal
         * @see czm_normal
         * @see czm_modelView
         * @see czm_inverseView
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseNormal;
         *
         * // Example
         * vec3 normalMC = czm_inverseNormal * normalEC;
         */
        czm_inverseNormal : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseNormal();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in eye coordinates to 3D model coordinates.  This is
         * the opposite of the transform provided by {@link czm_normal}.
         * In 3D mode, this is identical to
         * {@link czm_inverseNormal}, but in 2D and Columbus View it represents the inverse normal transformation
         * matrix as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_inverseNormal3D</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_inverseNormal3D
         * @glslUniform
         *
         * @see UniformState#getInverseNormal3D
         * @see czm_inverseNormal
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseNormal3D;
         *
         * // Example
         * vec3 normalMC = czm_inverseNormal3D * normalEC;
         */
        czm_inverseNormal3D : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseNormal3D();
            }
        },

        /**
         * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
         * of the frustum defined by the camera.  This is the largest possible frustum, not an individual
         * frustum used for multi-frustum rendering.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_entireFrustum</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_entireFrustum
         * @glslUniform
         *
         * @see UniformState#getEntireFrustum
         * @see czm_currentFrustum
         *
         * @example
         * // GLSL declaration
         * uniform vec2 czm_entireFrustum;
         *
         * // Example
         * float frustumLength = czm_entireFrustum.y - czm_entireFrustum.x;
         */
        czm_entireFrustum : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR2;
            },

            getValue : function(uniformState) {
                return uniformState.getEntireFrustum();
            }
        },

        /**
         * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
         * of the frustum defined by the camera.  This is the individual
         * frustum used for multi-frustum rendering.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_currentFrustum</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_currentFrustum
         * @glslUniform
         *
         * @see UniformState#getCurrentFrustum
         * @see czm_entireFrustum
         *
         * @example
         * // GLSL declaration
         * uniform vec2 czm_currentFrustum;
         *
         * // Example
         * float frustumLength = czm_currentFrustum.y - czm_currentFrustum.x;
         */
        czm_currentFrustum : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR2;
            },

            getValue : function(uniformState) {
                return uniformState.getCurrentFrustum();
            }
        },

        /**
         * An automatic GLSL uniform representing the size of a pixel in meters at a distance of one meter
         * from the camera. The pixel size is linearly proportional to the distance from the camera.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_pixelSizeInMeters</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_pixelSizeInMeters
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform float czm_pixelSizeInMeters;
         *
         * // Example: the pixel size at a position in eye coordinates
         * float pixelSize = czm_pixelSizeInMeters * positionEC.z;
         */
        czm_pixelSizeInMeters : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT;
            },

            getValue : function(uniformState) {
                return uniformState.getPixelSize();
            }
        },

        /**
         * An automatic GLSL uniform representing the normalized direction to the sun in eye coordinates.
         * This is commonly used for directional lighting computations.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_sunDirectionEC</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_sunDirectionEC
         * @glslUniform
         *
         * @see UniformState#getSunDirectionEC
         * @see czm_moonDirectionEC
         * @see czm_sunDirectionWC
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunDirectionEC;
         *
         * // Example
         * float diffuse = max(dot(czm_sunDirectionEC, normalEC), 0.0);
         */
        czm_sunDirectionEC : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getSunDirectionEC();
            }
        },

        /**
         * An automatic GLSL uniform representing the normalized direction to the sun in world coordinates.
         * This is commonly used for directional lighting computations.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_sunDirectionWC</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_sunDirectionWC
         * @glslUniform
         *
         * @see UniformState#getSunDirectionWC
         * @see czm_sunDirectionEC
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunDirectionWC;
         */
        czm_sunDirectionWC : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getSunDirectionWC();
            }
        },

        /**
         * An automatic GLSL uniform representing the normalized direction to the moon in eye coordinates.
         * This is commonly used for directional lighting computations.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_moonDirectionEC</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_moonDirectionEC
         * @glslUniform
         *
         * @see UniformState#getMoonDirectionEC
         * @see czm_sunDirectionEC
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_moonDirectionEC;
         *
         * // Example
         * float diffuse = max(dot(czm_moonDirectionEC, normalEC), 0.0);
         */
        czm_moonDirectionEC : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getMoonDirectionEC();
            }
        },

        /**
         * An automatic GLSL uniform representing the high bits of the camera position in model
         * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
         * as described in <a href="http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/">Precisions, Precisions</a>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_encodedCameraPositionMCHigh</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_encodedCameraPositionMCHigh
         * @glslUniform
         *
         * @see czm_encodedCameraPositionMCLow
         * @see czm_modelViewRelativeToEye
         * @see czm_modelViewProjectionRelativeToEye
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_encodedCameraPositionMCHigh;
         */
        czm_encodedCameraPositionMCHigh : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getEncodedCameraPositionMCHigh();
            }
        },

        /**
         * An automatic GLSL uniform representing the low bits of the camera position in model
         * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
         * as described in <a href="http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/">Precisions, Precisions</a>.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_encodedCameraPositionMCHigh</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_encodedCameraPositionMCLow
         * @glslUniform
         *
         * @see czm_encodedCameraPositionMCHigh
         * @see czm_modelViewRelativeToEye
         * @see czm_modelViewProjectionRelativeToEye
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_encodedCameraPositionMCLow;
         */
        czm_encodedCameraPositionMCLow : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getEncodedCameraPositionMCLow();
            }
        },

        /**
         * An automatic GLSL uniform representing the position of the viewer (camera) in world coordinates.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_sunDirectionWC</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_viewerPositionWC
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_viewerPositionWC;
         */
        czm_viewerPositionWC : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_VECTOR3;
            },

            getValue : function(uniformState) {
                return uniformState.getInverseView().getTranslation();
            }
        },

        /**
         * An automatic GLSL uniform representing the frame number. This uniform is automatically incremented
         * every frame.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_frameNumber</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_frameNumber
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform float czm_frameNumber;
         */
        czm_frameNumber : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT;
            },

            getValue : function(uniformState) {
                return uniformState.getFrameNumber();
            }
        },

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that transforms
         * from True Equator Mean Equinox (TEME) axes to the pseudo-fixed axes at the current scene time.
         * <br /><br />
         * Like all automatic uniforms, <code>czm_temeToPseudoFixed</code> does not need to be explicitly declared.
         * However, it can be explicitly declared when a shader is also used by other applications such
         * as a third-party authoring tool.
         *
         * @alias czm_temeToPseudoFixed
         * @glslUniform
         *
         * @see UniformState#getTemeToPseudoFixedMatrix
         * @see Transforms.computeTemeToPseudoFixedMatrix
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_temeToPseudoFixed;
         *
         * // Example
         * vec3 pseudoFixed = czm_temeToPseudoFixed * teme;
         */
        czm_temeToPseudoFixed : {
            getSize : function() {
                return 1;
            },

            getDatatype : function() {
                return UniformDatatype.FLOAT_MATRIX3;
            },

            getValue : function(uniformState) {
                return uniformState.getTemeToPseudoFixedMatrix();
            }
        }
    };

    function getUniformDatatype(gl, activeUniformType) {
        switch (activeUniformType) {
        case gl.FLOAT:
            return function() {
                return UniformDatatype.FLOAT;
            };
        case gl.FLOAT_VEC2:
            return function() {
                return UniformDatatype.FLOAT_VECTOR2;
            };
        case gl.FLOAT_VEC3:
            return function() {
                return UniformDatatype.FLOAT_VECTOR3;
            };
        case gl.FLOAT_VEC4:
            return function() {
                return UniformDatatype.FLOAT_VECTOR4;
            };
        case gl.INT:
            return function() {
                return UniformDatatype.INT;
            };
        case gl.INT_VEC2:
            return function() {
                return UniformDatatype.INT_VECTOR2;
            };
        case gl.INT_VEC3:
            return function() {
                return UniformDatatype.INT_VECTOR3;
            };
        case gl.INT_VEC4:
            return function() {
                return UniformDatatype.INT_VECTOR4;
            };
        case gl.BOOL:
            return function() {
                return UniformDatatype.BOOL;
            };
        case gl.BOOL_VEC2:
            return function() {
                return UniformDatatype.BOOL_VECTOR2;
            };
        case gl.BOOL_VEC3:
            return function() {
                return UniformDatatype.BOOL_VECTOR3;
            };
        case gl.BOOL_VEC4:
            return function() {
                return UniformDatatype.BOOL_VECTOR4;
            };
        case gl.FLOAT_MAT2:
            return function() {
                return UniformDatatype.FLOAT_MATRIX2;
            };
        case gl.FLOAT_MAT3:
            return function() {
                return UniformDatatype.FLOAT_MATRIX3;
            };
        case gl.FLOAT_MAT4:
            return function() {
                return UniformDatatype.FLOAT_MATRIX4;
            };
        case gl.SAMPLER_2D:
            return function() {
                return UniformDatatype.SAMPLER_2D;
            };
        case gl.SAMPLER_CUBE:
            return function() {
                return UniformDatatype.SAMPLER_CUBE;
            };
        default:
            throw new RuntimeError('Unrecognized uniform type: ' + activeUniformType);
        }
    }

    var scratchUniformMatrix2 = (typeof Float32Array !== 'undefined') ? new Float32Array(4) : undefined;
    var scratchUniformMatrix3 = (typeof Float32Array !== 'undefined') ? new Float32Array(9) : undefined;
    var scratchUniformMatrix4 = (typeof Float32Array !== 'undefined') ? new Float32Array(16) : undefined;

    /**
     * A shader program's uniform, including the uniform's value.  This is most commonly used to change
     * the value of a uniform, but can also be used retrieve a uniform's name and datatype,
     * which is useful for creating user interfaces for tweaking shaders.
     * <br /><br />
     * Do not create a uniform object with the <code>new</code> keyword; a shader program's uniforms
     * are available via {@link ShaderProgram#getAllUniforms}.
     * <br /><br />
     * Changing a uniform's value will affect future calls to {@link Context#draw}
     * that use the corresponding shader program.
     * <br /><br />
     * The datatype of the <code>value</code> property depends on the datatype
     * used in the GLSL declaration as shown in the examples in the table below.
     * <br /><br />
     * <table border='1'>
     * <tr>
     * <td>GLSL</td>
     * <td>JavaScript</td>
     * </tr>
     * <tr>
     * <td><code>uniform float u_float; </code></td>
     * <td><code> sp.getAllUniforms().u_float.value = 1.0;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec2 u_vec2; </code></td>
     * <td><code> sp.getAllUniforms().u_vec2.value = new Cartesian2(1.0, 2.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec3 u_vec3; </code></td>
     * <td><code> sp.getAllUniforms().u_vec3.value = new Cartesian3(1.0, 2.0, 3.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform vec4 u_vec4; </code></td>
     * <td><code> sp.getAllUniforms().u_vec4.value = new Cartesian4(1.0, 2.0, 3.0, 4.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform int u_int; </code></td>
     * <td><code> sp.getAllUniforms().u_int.value = 1;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec2 u_ivec2; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec2.value = new Cartesian2(1, 2);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec3 u_ivec3; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec3.value = new Cartesian3(1, 2, 3);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform ivec4 u_ivec4; </code></td>
     * <td><code> sp.getAllUniforms().u_ivec4.value = new Cartesian4(1, 2, 3, 4);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bool u_bool; </code></td>
     * <td><code> sp.getAllUniforms().u_bool.value = true;</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec2 u_bvec2; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec2.value = new Cartesian2(true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec3 u_bvec3; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec3.value = new Cartesian3(true, true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform bvec4 u_bvec4; </code></td>
     * <td><code> sp.getAllUniforms().u_bvec4.value = new Cartesian4(true, true, true, true);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat2 u_mat2; </code></td>
     * <td><code> sp.getAllUniforms().u_mat2.value = new Matrix2(1.0, 2.0, 3.0, 4.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat3 u_mat3; </code></td>
     * <td><code> sp.getAllUniforms().u_mat3.value = new Matrix3(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform mat4 u_mat4; </code></td>
     * <td><code> sp.getAllUniforms().u_mat4.value = new Matrix4(1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform sampler2D u_texture; </code></td>
     * <td><code> sp.getAllUniforms().u_texture.value = context.createTexture2D(...);</code></td>
     * </tr>
     * <tr>
     * <td><code>uniform samplerCube u_cubeMap; </code></td>
     * <td><code> sp.getAllUniforms().u_cubeMap.value = context.createCubeMap(...);</code></td>
     * </tr>
     * </table>
     * <br />
     * When the GLSL uniform is declared as an array, <code>value</code> is also an array as shown in Example 2.
     * Individual members of a <code>struct uniform</code> can be accessed as done in Example 3.
     * <br /><br />
     * Uniforms whose names starting with <code>czm_</code>, such as {@link czm_viewProjection}, are called
     * automatic uniforms; they are implicitly declared and automatically assigned to in
     * <code>Context.draw</code> based on the {@link UniformState}.
     *
     * @alias Uniform
     * @internalConstructor
     *
     * @see Uniform#value
     * @see UniformDatatype
     * @see ShaderProgram#getAllUniforms
     * @see UniformState
     * @see Context#draw
     * @see Context#createTexture2D
     * @see Context#createCubeMap
     *
     * @example
     * // Example 1. Create a shader program and set its
     * // one uniform, a 4x4 matrix, to the identity matrix
     * var vs =
     *   'attribute vec4 position; ' +
     *   'uniform mat4 u_mvp; ' +
     *   'void main() { gl_Position = u_mvp * position; }';
     * var fs = // ...
     * var sp = context.createShaderProgram(vs, fs);
     *
     * var mvp = sp.getAllUniforms().u_mvp;
     * console.log(mvp.getName());           // 'u_mvp'
     * console.log(mvp.getDatatype().name);  // 'FLOAT_MATRIX4'
     * mvp.value = Matrix4.IDENTITY;
     *
     * //////////////////////////////////////////////////////////////////////
     *
     * // Example 2. Setting values for a GLSL array uniform
     * // GLSL:  uniform float u_float[2];
     * sp.getAllUniforms().u_float.value = new Cartesian2(1.0, 2.0);
     *
     * // GLSL:  uniform vec4 u_vec4[2];
     * sp.getAllUniforms().u_vec4.value = [
     *   Cartesian4.UNIT_X,
     *   Cartesian4.UNIT_Y
     * ];
     *
     * //////////////////////////////////////////////////////////////////////
     *
     * // Example 3. Setting values for members of a GLSL struct
     * // GLSL:  uniform struct { float f; vec4 v; } u_struct;
     * sp.getAllUniforms()['u_struct.f'].value = 1.0;
     * sp.getAllUniforms()['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
     */
    var Uniform = function(_gl, activeUniform, _uniformName, _location, uniformValue) {
        /**
         * The value of the uniform.  The datatype depends on the datatype used in the
         * GLSL declaration as explained in the {@link Uniform} help and shown
         * in the examples below.
         *
         * @field
         * @alias Uniform#value
         *
         * @see Context#createTexture2D
         *
         * @example
         * // GLSL:  uniform float u_float;
         * sp.getAllUniforms().u_float.value = 1.0;
         *
         * // GLSL:  uniform vec4 u_vec4;
         * sp.getAllUniforms().u_vec4.value = Cartesian4.ZERO;
         *
         * // GLSL:  uniform bvec4 u_bvec4;
         * sp.getAllUniforms().u_bvec4.value = new Cartesian4(true, true, true, true);
         *
         * // GLSL:  uniform mat4 u_mat4;
         * sp.getAllUniforms().u_mat4.value = Matrix4.IDENTITY;
         *
         * // GLSL:  uniform sampler2D u_texture;
         * sp.getAllUniforms().u_texture.value = context.createTexture2D(...);
         *
         * // GLSL:  uniform vec2 u_vec2[2];
         * sp.getAllUniforms().u_vec2.value = [
         *   new Cartesian2(1.0, 2.0),
         *   new Cartesian2(3.0, 4.0)
         * ];
         *
         * // GLSL:  uniform struct { float f; vec4 v; } u_struct;
         * sp.getAllUniforms()['u_struct.f'].value = 1.0;
         * sp.getAllUniforms()['u_struct.v'].value = new Cartesian4(1.0, 2.0, 3.0, 4.0);
         */
        this.value = uniformValue;

        /**
         * Returns the case-sensitive name of the GLSL uniform.
         *
         * @returns {String} The name of the uniform.
         * @function
         * @alias Uniform#getName
         *
         * @example
         * // GLSL: uniform mat4 u_mvp;
         * console.log(sp.getAllUniforms().u_mvp.getName());  // 'u_mvp'
         */
        this.getName = function() {
            return _uniformName;
        };

        /**
         * Returns the datatype of the uniform.  This is useful when dynamically
         * creating a user interface to tweak shader uniform values.
         *
         * @returns {UniformDatatype} The datatype of the uniform.
         * @function
         * @alias Uniform#getDatatype
         *
         * @see UniformDatatype
         *
         * @example
         * // GLSL: uniform mat4 u_mvp;
         * console.log(sp.getAllUniforms().u_mvp.getDatatype().name);  // 'FLOAT_MATRIX4'
         */
        this.getDatatype = getUniformDatatype(_gl, activeUniform.type);

        this._getLocation = function() {
            return _location;
        };

        this._set = function() {
            switch (activeUniform.type) {
            case _gl.FLOAT:
                return function() {
                    _gl.uniform1f(_location, this.value);
                };
            case _gl.FLOAT_VEC2:
                return function() {
                    var v = this.value;
                    _gl.uniform2f(_location, v.x, v.y);
                };
            case _gl.FLOAT_VEC3:
                return function() {
                    var v = this.value;
                    _gl.uniform3f(_location, v.x, v.y, v.z);
                };
            case _gl.FLOAT_VEC4:
                return function() {
                    var v = this.value;

                    if (typeof v.red !== 'undefined') {
                        _gl.uniform4f(_location, v.red, v.green, v.blue, v.alpha);
                    } else if (typeof v.x !== 'undefined') {
                        _gl.uniform4f(_location, v.x, v.y, v.z, v.w);
                    } else {
                        throw new DeveloperError('Invalid vec4 value for uniform "' + activeUniform.name + '".');
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                // See _setSampler()
                return undefined;
            case _gl.INT:
            case _gl.BOOL:
                return function() {
                    _gl.uniform1i(_location, this.value);
                };
            case _gl.INT_VEC2:
            case _gl.BOOL_VEC2:
                return function() {
                    var v = this.value;
                    _gl.uniform2i(_location, v.x, v.y);
                };
            case _gl.INT_VEC3:
            case _gl.BOOL_VEC3:
                return function() {
                    var v = this.value;
                    _gl.uniform3i(_location, v.x, v.y, v.z);
                };
            case _gl.INT_VEC4:
            case _gl.BOOL_VEC4:
                return function() {
                    var v = this.value;
                    _gl.uniform4i(_location, v.x, v.y, v.z, v.w);
                };
            case _gl.FLOAT_MAT2:
                return function() {
                    _gl.uniformMatrix2fv(_location, false, Matrix2.toArray(this.value, scratchUniformMatrix2));
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    _gl.uniformMatrix3fv(_location, false, Matrix3.toArray(this.value, scratchUniformMatrix3));
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    _gl.uniformMatrix4fv(_location, false, Matrix4.toArray(this.value, scratchUniformMatrix4));
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type + ' for uniform "' + activeUniform.name + '".');
            }
        }();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex);
                _gl.bindTexture(this.value._getTarget(), this.value._getTexture());
                _gl.uniform1i(_location, textureUnitIndex);

                return textureUnitIndex + 1;
            };

            this._clearSampler = function(textureUnitIndex) {
                _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex);
                _gl.bindTexture(this.value._getTarget(), null);

                return textureUnitIndex + 1;
            };
        }
    };

    /**
     * Uniform and UniformArray have the same documentation.  It is just an implementation
     * detail that they are two different types.
     *
     * @alias UniformArray
     * @constructor
     *
     * @see Uniform
     */
    var UniformArray = function(_gl, activeUniform, _uniformName, locations, value) {
        this.value = value;

        var _locations = locations;

        /**
         * @private
         */
        this.getName = function() {
            return _uniformName;
        };

        this.getDatatype = getUniformDatatype(_gl, activeUniform.type);

        this._getLocations = function() {
            return _locations;
        };

        this._set = function() {
            switch (activeUniform.type) {
            case _gl.FLOAT:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniform1f(_locations[i], this.value[i]);
                    }
                };
            case _gl.FLOAT_VEC2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform2f(_locations[i], v.x, v.y);
                    }
                };
            case _gl.FLOAT_VEC3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform3f(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.FLOAT_VEC4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];

                        if (typeof v.red !== 'undefined') {
                            _gl.uniform4f(_locations[i], v.red, v.green, v.blue, v.alpha);
                        } else if (typeof v.x !== 'undefined') {
                            _gl.uniform4f(_locations[i], v.x, v.y, v.z, v.w);
                        } else {
                            throw new DeveloperError('Invalid vec4 value.');
                        }
                    }
                };
            case _gl.SAMPLER_2D:
            case _gl.SAMPLER_CUBE:
                // See _setSampler()
                return undefined;
            case _gl.INT:
            case _gl.BOOL:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniform1i(_locations[i], this.value[i]);
                    }
                };
            case _gl.INT_VEC2:
            case _gl.BOOL_VEC2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform2i(_locations[i], v.x, v.y);
                    }
                };
            case _gl.INT_VEC3:
            case _gl.BOOL_VEC3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform3i(_locations[i], v.x, v.y, v.z);
                    }
                };
            case _gl.INT_VEC4:
            case _gl.BOOL_VEC4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        var v = this.value[i];
                        _gl.uniform4i(_locations[i], v.x, v.y, v.z, v.w);
                    }
                };
            case _gl.FLOAT_MAT2:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix2fv(_locations[i], false, Matrix2.toArray(this.value[i], scratchUniformMatrix2));
                    }
                };
            case _gl.FLOAT_MAT3:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix3fv(_locations[i], false, Matrix3.toArray(this.value[i], scratchUniformMatrix3));
                    }
                };
            case _gl.FLOAT_MAT4:
                return function() {
                    for ( var i = 0; i < _locations.length; ++i) {
                        _gl.uniformMatrix4fv(_locations[i], false, Matrix4.toArray(this.value[i], scratchUniformMatrix4));
                    }
                };
            default:
                throw new RuntimeError('Unrecognized uniform type: ' + activeUniform.type);
            }
        }();

        if ((activeUniform.type === _gl.SAMPLER_2D) || (activeUniform.type === _gl.SAMPLER_CUBE)) {
            this._setSampler = function(textureUnitIndex) {
                for ( var i = 0; i < _locations.length; ++i) {
                    var value = this.value[i];
                    var index = textureUnitIndex + i;
                    _gl.activeTexture(_gl.TEXTURE0 + index);
                    _gl.bindTexture(value._getTarget(), value._getTexture());
                    _gl.uniform1i(_locations[i], index);
                }

                return textureUnitIndex + _locations.length;
            };

            this._clearSampler = function(textureUnitIndex) {
                for ( var i = 0; i < _locations.length; ++i) {
                    _gl.activeTexture(_gl.TEXTURE0 + textureUnitIndex + i);
                    _gl.bindTexture(this.value[i]._getTarget(), null);
                }

                return textureUnitIndex + _locations.length;
            };
        }
    };

    /**
     * DOC_TBA
     *
     * @alias ShaderProgram
     * @internalConstructor
     *
     * @see Context#createShaderProgram
     * @see Context#getShaderCache
     */
    var ShaderProgram = function(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        var program = createAndLinkProgram(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations);
        var numberOfVertexAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        var uniforms = findUniforms(gl, program);
        var partitionedUniforms = partitionUniforms(uniforms.allUniforms);

        this._gl = gl;
        this._program = program;
        this._numberOfVertexAttributes = numberOfVertexAttributes;
        this._vertexAttributes = findVertexAttributes(gl, program, numberOfVertexAttributes);
        this._allUniforms = uniforms.allUniforms;
        this._uniforms = uniforms.uniforms;
        this._samplerUniforms = uniforms.samplerUniforms;
        this._automaticUniforms = partitionedUniforms.automaticUniforms;
        this._manualUniforms = partitionedUniforms.manualUniforms;
    };

    function extractShaderVersion(source) {
        // This will fail if the first #version is actually in a comment.
        var index = source.indexOf('#version');
        if (index !== -1) {
            var newLineIndex = source.indexOf('\n', index);

            // We could throw an exception if there is not a new line after
            // #version, but the GLSL compiler will catch it.
            if (index !== -1) {
                // Extract #version directive, including the new line.
                var version = source.substring(index, newLineIndex + 1);

                // Comment out original #version directive so the line numbers
                // are not off by one.  There can be only one #version directive
                // and it must appear at the top of the source, only preceded by
                // whitespace and comments.
                var modified = source.substring(0, index) + '//' + source.substring(index);

                return {
                    versionDirective : version,
                    modifiedSource : modified
                };
            }
        }

        return {
            versionDirective : '', // defaults to #version 100
            modifiedSource : source // no modifications required
        };
    }

    function getAutomaticUniformDeclaration(uniforms, uniform) {
        var automaticUniform = uniforms[uniform];
        var declaration = 'uniform ' + automaticUniform.getDatatype().getGLSL() + ' ' + uniform;

        var size = automaticUniform.getSize();
        if (size === 1) {
            declaration += ';';
        } else {
            declaration += '[' + size.toString() + '];';
        }

        return declaration;
    }

    function commentOutAutomaticUniforms(source) {
        // Comment out automatic uniforms that the user may have declared, perhaps
        // because the shader was authored in a third-party tool like RenderMonkey.
        // At runtime, all automatic uniforms are declared by the engine itself.

        // This function has problems if the automatic uniform was declared with the
        // wrong datatype or with extra whitespace or comments in the declaration.

        var modifiedSource = source;
        var uniforms = allAutomaticUniforms;
        for ( var uniform in uniforms) {
            if (uniforms.hasOwnProperty(uniform)) {
                var declaration = getAutomaticUniformDeclaration(uniforms, uniform);
                var index = modifiedSource.indexOf(declaration);
                if (index !== -1) {
                    modifiedSource =
                        modifiedSource.substring(0, index) +
                        '/*' +
                        modifiedSource.substring(index, declaration.length) +
                        '*/' +
                        modifiedSource.substring(index + declaration.length);
                }
            }
        }

        return modifiedSource;
    }

    function getFragmentShaderPrecision() {
        // TODO: Performance?
        return '#ifdef GL_FRAGMENT_PRECISION_HIGH \n' +
               '  precision highp float; \n' +
               '#else \n' +
               '  precision mediump float; \n' +
               '#endif \n\n';
    }

    function getBuiltinConstants() {
        var constants = {
            /**
             * A built-in GLSL floating-point constant for <code>Math.PI</code>.
             *
             * @alias czm_pi
             * @glslConstant
             *
             * @see CesiumMath.PI
             *
             * @example
             * // GLSL declaration
             * const float czm_pi = ...;
             *
             * // Example
             * float twoPi = 2.0 * czm_pi;
             */
            czm_pi : Math.PI.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>1/pi</code>.
             *
             * @alias czm_oneOverPi
             * @glslConstant
             *
             * @see CesiumMath.ONE_OVER_PI
             *
             * @example
             * // GLSL declaration
             * const float czm_oneOverPi = ...;
             *
             * // Example
             * float pi = 1.0 / czm_oneOverPi;
             */
            czm_oneOverPi : CesiumMath.ONE_OVER_PI.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>pi/2</code>.
             *
             * @alias czm_piOverTwo
             * @glslConstant
             *
             * @see CesiumMath.PI_OVER_TWO
             *
             * @example
             * // GLSL declaration
             * const float czm_piOverTwo = ...;
             *
             * // Example
             * float pi = 2.0 * czm_piOverTwo;
             */
            czm_piOverTwo : CesiumMath.PI_OVER_TWO.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>pi/3</code>.
             *
             * @alias czm_piOverThree
             * @glslConstant
             *
             * @see CesiumMath.PI_OVER_THREE
             *
             * @example
             * // GLSL declaration
             * const float czm_piOverThree = ...;
             *
             * // Example
             * float pi = 3.0 * czm_piOverThree;
             */
            czm_piOverThree : CesiumMath.PI_OVER_THREE.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>pi/4</code>.
             *
             * @alias czm_piOverFour
             * @glslConstant
             *
             * @see CesiumMath.PI_OVER_FOUR
             *
             * @example
             * // GLSL declaration
             * const float czm_piOverFour = ...;
             *
             * // Example
             * float pi = 4.0 * czm_piOverFour;
             */
            czm_piOverFour : CesiumMath.PI_OVER_FOUR.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>pi/6</code>.
             *
             * @alias czm_piOverSix
             * @glslConstant
             *
             * @see CesiumMath.PI_OVER_SIX
             *
             * @example
             * // GLSL declaration
             * const float czm_piOverSix = ...;
             *
             * // Example
             * float pi = 6.0 * czm_piOverSix;
             */
            czm_piOverSix : CesiumMath.PI_OVER_SIX.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>3pi/2</code>.
             *
             * @alias czm_threePiOver2
             * @glslConstant
             *
             * @see CesiumMath.THREE_PI_OVER_TWO
             *
             * @example
             * // GLSL declaration
             * const float czm_threePiOver2 = ...;
             *
             * // Example
             * float pi = (2.0 / 3.0) * czm_threePiOver2;
             */
            czm_threePiOver2 : CesiumMath.THREE_PI_OVER_TWO.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>2pi</code>.
             *
             * @alias czm_twoPi
             * @glslConstant
             *
             * @see CesiumMath.TWO_PI
             *
             * @example
             * // GLSL declaration
             * const float czm_twoPi = ...;
             *
             * // Example
             * float pi = czm_twoPi / 2.0;
             */
            czm_twoPi : CesiumMath.TWO_PI.toString(),

            /**
             * A built-in GLSL floating-point constant for <code>1/2pi</code>.
             *
             * @alias czm_oneOverTwoPi
             * @glslConstant
             *
             * @see CesiumMath.ONE_OVER_TWO_PI
             *
             * @example
             * // GLSL declaration
             * const float czm_oneOverTwoPi = ...;
             *
             * // Example
             * float pi = 2.0 * czm_oneOverTwoPi;
             */
            czm_oneOverTwoPi : CesiumMath.ONE_OVER_TWO_PI.toString(),

            /**
             * A built-in GLSL floating-point constant for converting degrees to radians.
             *
             * @alias czm_radiansPerDegree
             * @glslConstant
             *
             * @see CesiumMath.RADIANS_PER_DEGREE
             *
             * @example
             * // GLSL declaration
             * const float czm_radiansPerDegree = ...;
             *
             * // Example
             * float rad = czm_radiansPerDegree * deg;
             */
            czm_radiansPerDegree : CesiumMath.RADIANS_PER_DEGREE.toString(),

            /**
             * A built-in GLSL floating-point constant for converting radians to degrees.
             *
             * @alias czm_degreesPerRadian
             * @glslConstant
             *
             * @see CesiumMath.DEGREES_PER_RADIAN
             *
             * @example
             * // GLSL declaration
             * const float czm_degreesPerRadian = ...;
             *
             * // Example
             * float deg = czm_degreesPerRadian * rad;
             */
            czm_degreesPerRadian : CesiumMath.DEGREES_PER_RADIAN.toString()
        };

        var glslConstants = '';
        for ( var name in constants) {
            if (constants.hasOwnProperty(name)) {
                glslConstants += 'const float ' + name + ' = ' + constants[name] + '; \n';
            }
        }
        glslConstants += ' \n';

        return glslConstants;
    }

    function getAutomaticUniforms() {
        var automatics = '';

        var uniforms = allAutomaticUniforms;
        for ( var uniform in uniforms) {
            if (uniforms.hasOwnProperty(uniform)) {
                automatics += getAutomaticUniformDeclaration(uniforms, uniform) + ' \n';
            }
        }
        automatics += '\n';

        return automatics;
    }

    var getShaderDefinitions = function() {
        // I think this should be #line 1 given what the GL ES spec says:
        //
        //   After processing this directive (including its new-line), the implementation will
        //   behave as if the following line has line number line...
        //
        // But this works, at least on NVIDIA hardware.

        // Functions after constants and uniforms because functions depend on them.
        var definitions = getBuiltinConstants() +
                          getAutomaticUniforms() +
                          ShadersBuiltinFunctions + '\n\n' +
                          '#line 0 \n';

        getShaderDefinitions = function() {
            return definitions;
        };

        return definitions;
    };

    function createAndLinkProgram(gl, logShaderCompilation, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        var vsSourceVersioned = extractShaderVersion(vertexShaderSource);
        var fsSourceVersioned = extractShaderVersion(fragmentShaderSource);

        var vsSource = vsSourceVersioned.versionDirective +
                       getShaderDefinitions() +
                       commentOutAutomaticUniforms(vsSourceVersioned.modifiedSource);
        var fsSource = fsSourceVersioned.versionDirective +
                       getFragmentShaderPrecision() +
                       getShaderDefinitions() +
                       commentOutAutomaticUniforms(fsSourceVersioned.modifiedSource);

        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);
        var vsLog = gl.getShaderInfoLog(vertexShader);

        if (logShaderCompilation && vsLog && vsLog.length) {
            console.log('[GL] Vertex shader compile log: ' + vsLog);
        }

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            gl.deleteShader(vertexShader);
            console.error('[GL] Vertex shader compile log: ' + vsLog);
            throw new RuntimeError('Vertex shader failed to compile.  Compile log: ' + vsLog);
        }

        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);
        var fsLog = gl.getShaderInfoLog(fragmentShader);

        if (logShaderCompilation && fsLog && fsLog.length) {
            console.log('[GL] Fragment shader compile log: ' + fsLog);
        }

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            console.error('[GL] Fragment shader compile log: ' + fsLog);
            throw new RuntimeError('Fragment shader failed to compile.  Compile log: ' + fsLog);
        }

        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (attributeLocations) {
            for ( var attribute in attributeLocations) {
                if (attributeLocations.hasOwnProperty(attribute)) {
                    gl.bindAttribLocation(program, attributeLocations[attribute], attribute);
                }
            }
        }

        gl.linkProgram(program);
        var linkLog = gl.getProgramInfoLog(program);

        if (logShaderCompilation && linkLog && linkLog.length) {
            console.log('[GL] Shader program link log: ' + linkLog);
        }

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            console.error('[GL] Shader program link log: ' + linkLog);
            throw new RuntimeError('Program failed to link.  Link log: ' + linkLog);
        }

        return program;
    }

    function findVertexAttributes(gl, program, numberOfAttributes) {
        var attributes = {};
        for ( var i = 0; i < numberOfAttributes; ++i) {
            var attr = gl.getActiveAttrib(program, i);
            var location = gl.getAttribLocation(program, attr.name);

            attributes[attr.name] = {
                name : attr.name,
                type : attr.type,
                index : location
            };
        }

        return attributes;
    }

    function findUniforms(gl ,program) {
        var allUniforms = {};
        var uniforms = [];
        var samplerUniforms = [];

        var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        for ( var i = 0; i < numberOfUniforms; ++i) {
            var activeUniform = gl.getActiveUniform(program, i);
            var suffix = '[0]';
            var uniformName = activeUniform.name.indexOf(suffix, activeUniform.name.length - suffix.length) !== -1 ?
                    activeUniform.name.slice(0, activeUniform.name.length - 3) : activeUniform.name;

            // Ignore GLSL built-in uniforms returned in Firefox.
            if (uniformName.indexOf('gl_') !== 0) {
                if (activeUniform.name.indexOf('[') < 0) {
                    // Single uniform
                    var location = gl.getUniformLocation(program, uniformName);
                    var uniformValue = gl.getUniform(program, location);
                    var uniform = new Uniform(gl, activeUniform, uniformName, location, uniformValue);

                    allUniforms[uniformName] = uniform;

                    if (uniform._setSampler) {
                        samplerUniforms.push(uniform);
                    } else {
                        uniforms.push(uniform);
                    }
                } else {
                    // Uniform array

                    var uniformArray;
                    var locations;
                    var value;
                    var loc;

                    // On some platforms - Nexus 4 in Firefox for one - an array of sampler2D ends up being represented
                    // as separate uniforms, one for each array element.  Check for and handle that case.
                    var indexOfBracket = uniformName.indexOf('[');
                    if (indexOfBracket >= 0) {
                        // We're assuming the array elements show up in numerical order - it seems to be true.
                        uniformArray = allUniforms[uniformName.slice(0, indexOfBracket)];
                        locations = uniformArray._getLocations();

                        // On the Nexus 4 in Chrome, we get one uniform per sampler, just like in Firefox,
                        // but the size is not 1 like it is in Firefox.  So if we push locations here,
                        // we'll end up adding too many locations.
                        if (locations.length <= 1) {
                            value = uniformArray.value;
                            loc = gl.getUniformLocation(program, uniformName);
                            locations.push(loc);
                            value.push(gl.getUniform(program, loc));
                        }
                    } else {
                        locations = [];
                        value = [];
                        for ( var j = 0; j < activeUniform.size; ++j) {
                            loc = gl.getUniformLocation(program, uniformName + '[' + j + ']');
                            locations.push(loc);
                            value.push(gl.getUniform(program, loc));
                        }
                        uniformArray = new UniformArray(gl, activeUniform, uniformName, locations, value);

                        allUniforms[uniformName] = uniformArray;

                        if (uniformArray._setSampler) {
                            samplerUniforms.push(uniformArray);
                        } else {
                            uniforms.push(uniformArray);
                        }
                    }
                }
            }
        }

        return {
            allUniforms : allUniforms,
            uniforms : uniforms,
            samplerUniforms : samplerUniforms
        };
    }

    function partitionUniforms(uniforms) {
        var automaticUniforms = [];
        var manualUniforms = {};

        for (var uniform in uniforms) {
            if (uniforms.hasOwnProperty(uniform)) {
                var automaticUniform = allAutomaticUniforms[uniform];
                if (automaticUniform) {
                    automaticUniforms.push({
                        uniform : uniforms[uniform],
                        automaticUniform : automaticUniform
                    });
                } else {
                    manualUniforms[uniform] = uniforms[uniform];
                }
            }
        }

        return {
            automaticUniforms : automaticUniforms,
            manualUniforms : manualUniforms
        };
    }

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @return {Object} DOC_TBA
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     */
    ShaderProgram.prototype.getVertexAttributes = function() {
        return this._vertexAttributes;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @return {Number} DOC_TBA
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     */
    ShaderProgram.prototype.getNumberOfVertexAttributes = function() {
        return this._numberOfVertexAttributes;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @return {Object} DOC_TBA
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#getManualUniforms
     */
    ShaderProgram.prototype.getAllUniforms = function() {
        return this._allUniforms;
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#getAllUniforms
     */
    ShaderProgram.prototype.getManualUniforms = function() {
        return this._manualUniforms;
    };

    ShaderProgram.prototype._bind = function() {
        this._gl.useProgram(this._program);
    };

    ShaderProgram.prototype._unBind = function() {
        this._gl.useProgram(null);

        var samplerUniforms = this._samplerUniforms;
        var textureUnitIndex = 0;
        var len = samplerUniforms.length;
        for ( var i = 0; i < len; ++i) {
            textureUnitIndex = samplerUniforms[i]._clearSampler(textureUnitIndex);
        }
    };

    ShaderProgram.prototype._setUniforms = function(uniformMap, uniformState, validate) {
        // TODO: Performance

        var len;
        var i;

        var uniforms = this._uniforms;
        var samplerUniforms = this._samplerUniforms;
        var manualUniforms = this._manualUniforms;
        var automaticUniforms = this._automaticUniforms;

        if (uniformMap) {
            for (var uniform in manualUniforms) {
                if (manualUniforms.hasOwnProperty(uniform)) {
                    manualUniforms[uniform].value = uniformMap[uniform]();
                }
            }
        }

        len = automaticUniforms.length;
        for (i = 0; i < len; ++i) {
            automaticUniforms[i].uniform.value = automaticUniforms[i].automaticUniform.getValue(uniformState);
        }

        ///////////////////////////////////////////////////////////////////

        len = uniforms.length;
        for (i = 0; i < len; ++i) {
            uniforms[i]._set();
        }

        var textureUnitIndex = 0;
        len = samplerUniforms.length;
        for (i = 0; i < len; ++i) {
            textureUnitIndex = samplerUniforms[i]._setSampler(textureUnitIndex);
        }

        if (validate) {
            var gl = this._gl;
            var program = this._program;

            gl.validateProgram(program);
            if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
                throw new DeveloperError('Program validation failed.  Link log: ' + gl.getProgramInfoLog(program));
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * @memberof ShaderProgram
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see ShaderProgram#destroy
     */
    ShaderProgram.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * @memberof ShaderProgram
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This shader program was destroyed, i.e., destroy() was called.
     *
     * @see ShaderProgram#isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteShader.xml'>glDeleteShader</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteProgram.xml'>glDeleteProgram</a>
     *
     * @example
     * shaderProgram = shaderProgram && shaderProgram.destroy();
     */
    ShaderProgram.prototype.destroy = function() {
        this._gl.deleteProgram(this._program);
        return destroyObject(this);
    };

    /**
     * DOC_TBA
     * @memberof ShaderProgram
     */
    ShaderProgram.prototype.release = function() {
        if (this._cachedShader) {
            return this._cachedShader.cache.releaseShaderProgram(this);
        }

        return this.destroy();
    };

    return ShaderProgram;
});
