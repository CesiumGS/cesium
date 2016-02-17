/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Matrix4',
        './WebGLConstants'
    ], function(
        Cartesian3,
        Matrix4,
        WebGLConstants) {
    'use strict';
    /*global WebGLRenderingContext*/

    var viewerPositionWCScratch = new Cartesian3();

    function AutomaticUniform(options) {
        this._size = options.size;
        this._datatype = options.datatype;
        this.getValue = options.getValue;
    }

    // this check must use typeof, not defined, because defined doesn't work with undeclared variables.
    if (typeof WebGLRenderingContext === 'undefined') {
        return {};
    }

    var datatypeToGlsl = {};
    datatypeToGlsl[WebGLConstants.FLOAT] = 'float';
    datatypeToGlsl[WebGLConstants.FLOAT_VEC2] = 'vec2';
    datatypeToGlsl[WebGLConstants.FLOAT_VEC3] = 'vec3';
    datatypeToGlsl[WebGLConstants.FLOAT_VEC4] = 'vec4';
    datatypeToGlsl[WebGLConstants.INT] = 'int';
    datatypeToGlsl[WebGLConstants.INT_VEC2] = 'ivec2';
    datatypeToGlsl[WebGLConstants.INT_VEC3] = 'ivec3';
    datatypeToGlsl[WebGLConstants.INT_VEC4] = 'ivec4';
    datatypeToGlsl[WebGLConstants.BOOL] = 'bool';
    datatypeToGlsl[WebGLConstants.BOOL_VEC2] = 'bvec2';
    datatypeToGlsl[WebGLConstants.BOOL_VEC3] = 'bvec3';
    datatypeToGlsl[WebGLConstants.BOOL_VEC4] = 'bvec4';
    datatypeToGlsl[WebGLConstants.FLOAT_MAT2] = 'mat2';
    datatypeToGlsl[WebGLConstants.FLOAT_MAT3] = 'mat3';
    datatypeToGlsl[WebGLConstants.FLOAT_MAT4] = 'mat4';
    datatypeToGlsl[WebGLConstants.SAMPLER_2D] = 'sampler2D';
    datatypeToGlsl[WebGLConstants.SAMPLER_CUBE] = 'samplerCube';

    AutomaticUniform.prototype.getDeclaration = function(name) {
        var declaration = 'uniform ' + datatypeToGlsl[this._datatype] + ' ' + name;

        var size = this._size;
        if (size === 1) {
            declaration += ';';
        } else {
            declaration += '[' + size.toString() + '];';
        }

        return declaration;
    };

    /**
     * @private
     */
    var AutomaticUniforms = {
        /**
         * An automatic GLSL uniform containing the viewport's <code>x</code>, <code>y</code>, <code>width</code>,
         * and <code>height</code> properties in an <code>vec4</code>'s <code>x</code>, <code>y</code>, <code>z</code>,
         * and <code>w</code> components, respectively.
         *
         * @alias czm_viewport
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec4 czm_viewport;
         *
         * // Scale the window coordinate components to [0, 1] by dividing
         * // by the viewport's width and height.
         * vec2 v = gl_FragCoord.xy / czm_viewport.zw;
         * 
         * @see Context#getViewport
         */
        czm_viewport : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC4,
            getValue : function(uniformState) {
                return uniformState.viewportCartesian4;
            }
        }),

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
         *
         * @alias czm_viewportOrthographic
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_viewportOrthographic;
         *
         * // Example
         * gl_Position = czm_viewportOrthographic * vec4(windowPosition, 0.0, 1.0);
         * 
         * @see UniformState#viewportOrthographic
         * @see czm_viewport
         * @see czm_viewportTransformation
         * @see BillboardCollection
         */
        czm_viewportOrthographic : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.viewportOrthographic;
            }
        }),

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
         *
         * @alias czm_viewportTransformation
         * @glslUniform
         *
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
         * 
         * @see UniformState#viewportTransformation
         * @see czm_viewport
         * @see czm_viewportOrthographic
         * @see czm_modelToWindowCoordinates
         * @see BillboardCollection
         */
        czm_viewportTransformation : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.viewportTransformation;
            }
        }),

        /**
         * An automatic GLSL uniform representing the depth after
         * only the globe has been rendered and packed into an RGBA texture.
         *
         * @private
         *
         * @alias czm_globeDepthTexture
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform sampler2D czm_globeDepthTexture;
         *
         * // Get the depth at the current fragment
         * vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
         * float depth = czm_unpackDepth(texture2D(czm_globeDepthTexture, coords));
         */
        czm_globeDepthTexture : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.SAMPLER_2D,
            getValue : function(uniformState) {
                return uniformState.globeDepthTexture;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model transformation matrix that
         * transforms model coordinates to world coordinates.
         *
         * @alias czm_model
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_model;
         *
         * // Example
         * vec4 worldPosition = czm_model * modelPosition;
         * 
         * @see UniformState#model
         * @see czm_inverseModel
         * @see czm_modelView
         * @see czm_modelViewProjection
         */
        czm_model : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.model;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model transformation matrix that
         * transforms world coordinates to model coordinates.
         *
         * @alias czm_inverseModel
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModel;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModel * worldPosition;
         * 
         * @see UniformState#inverseModel
         * @see czm_model
         * @see czm_inverseModelView
         */
        czm_inverseModel : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseModel;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 view transformation matrix that
         * transforms world coordinates to eye coordinates.
         *
         * @alias czm_view
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_view;
         *
         * // Example
         * vec4 eyePosition = czm_view * worldPosition;
         * 
         * @see UniformState#view
         * @see czm_viewRotation
         * @see czm_modelView
         * @see czm_viewProjection
         * @see czm_modelViewProjection
         * @see czm_inverseView
         */
        czm_view : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.view;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 view transformation matrix that
         * transforms 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_view}, but in 2D and Columbus View it represents the view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_view3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_view3D;
         *
         * // Example
         * vec4 eyePosition3D = czm_view3D * worldPosition3D;
         * 
         * @see UniformState#view3D
         * @see czm_view
         */
        czm_view3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.view3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 view rotation matrix that
         * transforms vectors in world coordinates to eye coordinates.
         *
         * @alias czm_viewRotation
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_viewRotation;
         *
         * // Example
         * vec3 eyeVector = czm_viewRotation * worldVector;
         * 
         * @see UniformState#viewRotation
         * @see czm_view
         * @see czm_inverseView
         * @see czm_inverseViewRotation
         */
        czm_viewRotation : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.viewRotation;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 view rotation matrix that
         * transforms vectors in 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_viewRotation}, but in 2D and Columbus View it represents the view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_viewRotation3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_viewRotation3D;
         *
         * // Example
         * vec3 eyeVector = czm_viewRotation3D * worldVector;
         * 
         * @see UniformState#viewRotation3D
         * @see czm_viewRotation
         */
        czm_viewRotation3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.viewRotation3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to world coordinates.
         *
         * @alias czm_inverseView
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseView;
         *
         * // Example
         * vec4 worldPosition = czm_inverseView * eyePosition;
         * 
         * @see UniformState#inverseView
         * @see czm_view
         * @see czm_inverseNormal
         */
        czm_inverseView : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseView;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseView}, but in 2D and Columbus View it represents the inverse view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_inverseView3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseView3D;
         *
         * // Example
         * vec4 worldPosition = czm_inverseView3D * eyePosition;
         * 
         * @see UniformState#inverseView3D
         * @see czm_inverseView
         */
        czm_inverseView3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseView3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that
         * transforms vectors from eye coordinates to world coordinates.
         *
         * @alias czm_inverseViewRotation
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseViewRotation;
         *
         * // Example
         * vec4 worldVector = czm_inverseViewRotation * eyeVector;
         * 
         * @see UniformState#inverseView
         * @see czm_view
         * @see czm_viewRotation
         * @see czm_inverseViewRotation
         */
        czm_inverseViewRotation : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.inverseViewRotation;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that
         * transforms vectors from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseViewRotation}, but in 2D and Columbus View it represents the inverse view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_inverseViewRotation3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseViewRotation3D;
         *
         * // Example
         * vec4 worldVector = czm_inverseViewRotation3D * eyeVector;
         * 
         * @see UniformState#inverseView3D
         * @see czm_inverseViewRotation
         */
        czm_inverseViewRotation3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.inverseViewRotation3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 projection transformation matrix that
         * transforms eye coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_projection
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_projection;
         *
         * // Example
         * gl_Position = czm_projection * eyePosition;
         * 
         * @see UniformState#projection
         * @see czm_viewProjection
         * @see czm_modelViewProjection
         * @see czm_infiniteProjection
         */
        czm_projection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.projection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 inverse projection transformation matrix that
         * transforms from clip coordinates to eye coordinates. Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_inverseProjection
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseProjection;
         *
         * // Example
         * vec4 eyePosition = czm_inverseProjection * clipPosition;
         * 
         * @see UniformState#inverseProjection
         * @see czm_projection
         */
        czm_inverseProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseProjection;
            }
        }),

        /**
         * @private
         */
        czm_inverseProjectionOIT : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseProjectionOIT;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 projection transformation matrix with the far plane at infinity,
         * that transforms eye coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  An infinite far plane is used
         * in algorithms like shadow volumes and GPU ray casting with proxy geometry to ensure that triangles
         * are not clipped by the far plane.
         *
         * @alias czm_infiniteProjection
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_infiniteProjection;
         *
         * // Example
         * gl_Position = czm_infiniteProjection * eyePosition;
         * 
         * @see UniformState#infiniteProjection
         * @see czm_projection
         * @see czm_modelViewInfiniteProjection
         */
        czm_infiniteProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.infiniteProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms model coordinates to eye coordinates.
         * <br /><br />
         * Positions should be transformed to eye coordinates using <code>czm_modelView</code> and
         * normals should be transformed using {@link czm_normal}.
         *
         * @alias czm_modelView
         * @glslUniform
         *
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
         * 
         * @see UniformState#modelView
         * @see czm_model
         * @see czm_view
         * @see czm_modelViewProjection
         * @see czm_normal
         */
        czm_modelView : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelView;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms 3D model coordinates to eye coordinates.  In 3D mode, this is identical to
         * {@link czm_modelView}, but in 2D and Columbus View it represents the model-view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         * <br /><br />
         * Positions should be transformed to eye coordinates using <code>czm_modelView3D</code> and
         * normals should be transformed using {@link czm_normal3D}.
         *
         * @alias czm_modelView3D
         * @glslUniform
         *
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
         * 
         * @see UniformState#modelView3D
         * @see czm_modelView
         */
        czm_modelView3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelView3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
         * transforms model coordinates, relative to the eye, to eye coordinates.  This is used
         * in conjunction with {@link czm_translateRelativeToEye}.
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
         *   vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
         *   gl_Position = czm_projection * (czm_modelViewRelativeToEye * p);
         * }
         *
         * @see czm_modelViewProjectionRelativeToEye
         * @see czm_translateRelativeToEye
         * @see EncodedCartesian3
         */
        czm_modelViewRelativeToEye : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelViewRelativeToEye;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to model coordinates.
         *
         * @alias czm_inverseModelView
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModelView;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModelView * eyePosition;
         * 
         * @see UniformState#inverseModelView
         * @see czm_modelView
         */
        czm_inverseModelView : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseModelView;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 transformation matrix that
         * transforms from eye coordinates to 3D model coordinates.  In 3D mode, this is identical to
         * {@link czm_inverseModelView}, but in 2D and Columbus View it represents the inverse model-view matrix
         * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_inverseModelView3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModelView3D;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModelView3D * eyePosition;
         * 
         * @see UniformState#inverseModelView
         * @see czm_inverseModelView
         * @see czm_modelView3D
         */
        czm_inverseModelView3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseModelView3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
         * transforms world coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_viewProjection
         * @glslUniform
         *
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
         * 
         * @see UniformState#viewProjection
         * @see czm_view
         * @see czm_projection
         * @see czm_modelViewProjection
         * @see czm_inverseViewProjection
         */
        czm_viewProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.viewProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
         * transforms clip coordinates to world coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_inverseViewProjection
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseViewProjection;
         *
         * // Example
         * vec4 worldPosition = czm_inverseViewProjection * clipPosition;
         * 
         * @see UniformState#inverseViewProjection
         * @see czm_viewProjection
         */
        czm_inverseViewProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseViewProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_modelViewProjection
         * @glslUniform
         *
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
         * 
         * @see UniformState#modelViewProjection
         * @see czm_model
         * @see czm_view
         * @see czm_projection
         * @see czm_modelView
         * @see czm_viewProjection
         * @see czm_modelViewInfiniteProjection
         * @see czm_inverseModelViewProjection
         */
        czm_modelViewProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelViewProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 inverse model-view-projection transformation matrix that
         * transforms clip coordinates to model coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.
         *
         * @alias czm_inverseModelViewProjection
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat4 czm_inverseModelViewProjection;
         *
         * // Example
         * vec4 modelPosition = czm_inverseModelViewProjection * clipPosition;
         * 
         * @see UniformState#modelViewProjection
         * @see czm_modelViewProjection
         */
        czm_inverseModelViewProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.inverseModelViewProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates, relative to the eye, to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  This is used in
         * conjunction with {@link czm_translateRelativeToEye}.
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
         *   vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
         *   gl_Position = czm_modelViewProjectionRelativeToEye * p;
         * }
         *
         * @see czm_modelViewRelativeToEye
         * @see czm_translateRelativeToEye
         * @see EncodedCartesian3
         */
        czm_modelViewProjectionRelativeToEye : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelViewProjectionRelativeToEye;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
         * transforms model coordinates to clip coordinates.  Clip coordinates is the
         * coordinate system for a vertex shader's <code>gl_Position</code> output.  The projection matrix places
         * the far plane at infinity.  This is useful in algorithms like shadow volumes and GPU ray casting with
         * proxy geometry to ensure that triangles are not clipped by the far plane.
         *
         * @alias czm_modelViewInfiniteProjection
         * @glslUniform
         *
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
         * 
         * @see UniformState#modelViewInfiniteProjection
         * @see czm_model
         * @see czm_view
         * @see czm_infiniteProjection
         * @see czm_modelViewProjection
         */
        czm_modelViewInfiniteProjection : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT4,
            getValue : function(uniformState) {
                return uniformState.modelViewInfiniteProjection;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in model coordinates to eye coordinates.
         * <br /><br />
         * Positions should be transformed to eye coordinates using {@link czm_modelView} and
         * normals should be transformed using <code>czm_normal</code>.
         *
         * @alias czm_normal
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_normal;
         *
         * // Example
         * vec3 eyeNormal = czm_normal * normal;
         * 
         * @see UniformState#normal
         * @see czm_inverseNormal
         * @see czm_modelView
         */
        czm_normal : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.normal;
            }
        }),

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
         *
         * @alias czm_normal3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_normal3D;
         *
         * // Example
         * vec3 eyeNormal = czm_normal3D * normal;
         * 
         * @see UniformState#normal3D
         * @see czm_normal
         */
        czm_normal3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.normal3D;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in eye coordinates to model coordinates.  This is
         * the opposite of the transform provided by {@link czm_normal}.
         *
         * @alias czm_inverseNormal
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseNormal;
         *
         * // Example
         * vec3 normalMC = czm_inverseNormal * normalEC;
         * 
         * @see UniformState#inverseNormal
         * @see czm_normal
         * @see czm_modelView
         * @see czm_inverseView
         */
        czm_inverseNormal : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.inverseNormal;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
         * transforms normal vectors in eye coordinates to 3D model coordinates.  This is
         * the opposite of the transform provided by {@link czm_normal}.
         * In 3D mode, this is identical to
         * {@link czm_inverseNormal}, but in 2D and Columbus View it represents the inverse normal transformation
         * matrix as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
         * 2D and Columbus View in the same way that 3D is lit.
         *
         * @alias czm_inverseNormal3D
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_inverseNormal3D;
         *
         * // Example
         * vec3 normalMC = czm_inverseNormal3D * normalEC;
         * 
         * @see UniformState#inverseNormal3D
         * @see czm_inverseNormal
         */
        czm_inverseNormal3D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.inverseNormal3D;
            }
        }),

        /**
         * An automatic GLSL uniform containing height (<code>x</code>) and height squared (<code>y</code>)
         *  of the eye (camera) in the 2D scene in meters.
         *
         * @alias czm_eyeHeight2D
         * @glslUniform
         *
         * @see UniformState#eyeHeight2D
         */
        czm_eyeHeight2D : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC2,
            getValue : function(uniformState) {
                return uniformState.eyeHeight2D;
            }
        }),

        /**
         * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
         * of the frustum defined by the camera.  This is the largest possible frustum, not an individual
         * frustum used for multi-frustum rendering.
         *
         * @alias czm_entireFrustum
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec2 czm_entireFrustum;
         *
         * // Example
         * float frustumLength = czm_entireFrustum.y - czm_entireFrustum.x;
         * 
         * @see UniformState#entireFrustum
         * @see czm_currentFrustum
         */
        czm_entireFrustum : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC2,
            getValue : function(uniformState) {
                return uniformState.entireFrustum;
            }
        }),

        /**
         * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
         * of the frustum defined by the camera.  This is the individual
         * frustum used for multi-frustum rendering.
         *
         * @alias czm_currentFrustum
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec2 czm_currentFrustum;
         *
         * // Example
         * float frustumLength = czm_currentFrustum.y - czm_currentFrustum.x;
         * 
         * @see UniformState#currentFrustum
         * @see czm_entireFrustum
         */
        czm_currentFrustum : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC2,
            getValue : function(uniformState) {
                return uniformState.currentFrustum;
            }
        }),

        /**
         * The distances to the frustum planes. The top, bottom, left and right distances are
         * the x, y, z, and w components, respectively.
         *
         * @alias czm_frustumPlanes
         * @glslUniform
         */
        czm_frustumPlanes : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC4,
            getValue : function(uniformState) {
                return uniformState.frustumPlanes;
            }
        }),

        /**
         * An automatic GLSL uniform representing the sun position in world coordinates.
         *
         * @alias czm_sunPositionWC
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunPositionWC;
         * 
         * @see UniformState#sunPositionWC
         * @see czm_sunPositionColumbusView
         * @see czm_sunDirectionWC
         */
        czm_sunPositionWC : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.sunPositionWC;
            }
        }),

        /**
         * An automatic GLSL uniform representing the sun position in Columbus view world coordinates.
         *
         * @alias czm_sunPositionColumbusView
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunPositionColumbusView;
         * 
         * @see UniformState#sunPositionColumbusView
         * @see czm_sunPositionWC
         */
        czm_sunPositionColumbusView : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.sunPositionColumbusView;
            }
        }),

        /**
         * An automatic GLSL uniform representing the normalized direction to the sun in eye coordinates.
         * This is commonly used for directional lighting computations.
         *
         * @alias czm_sunDirectionEC
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunDirectionEC;
         *
         * // Example
         * float diffuse = max(dot(czm_sunDirectionEC, normalEC), 0.0);
         * 
         * @see UniformState#sunDirectionEC
         * @see czm_moonDirectionEC
         * @see czm_sunDirectionWC
         */
        czm_sunDirectionEC : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.sunDirectionEC;
            }
        }),

        /**
         * An automatic GLSL uniform representing the normalized direction to the sun in world coordinates.
         * This is commonly used for directional lighting computations.
         *
         * @alias czm_sunDirectionWC
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_sunDirectionWC;
         * 
         * @see UniformState#sunDirectionWC
         * @see czm_sunPositionWC
         * @see czm_sunDirectionEC
         */
        czm_sunDirectionWC : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.sunDirectionWC;
            }
        }),

        /**
         * An automatic GLSL uniform representing the normalized direction to the moon in eye coordinates.
         * This is commonly used for directional lighting computations.
         *
         * @alias czm_moonDirectionEC
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_moonDirectionEC;
         *
         * // Example
         * float diffuse = max(dot(czm_moonDirectionEC, normalEC), 0.0);
         * 
         * @see UniformState#moonDirectionEC
         * @see czm_sunDirectionEC
         */
        czm_moonDirectionEC : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.moonDirectionEC;
            }
        }),

        /**
         * An automatic GLSL uniform representing the high bits of the camera position in model
         * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
         * as described in {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
         *
         * @alias czm_encodedCameraPositionMCHigh
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_encodedCameraPositionMCHigh;
         * 
         * @see czm_encodedCameraPositionMCLow
         * @see czm_modelViewRelativeToEye
         * @see czm_modelViewProjectionRelativeToEye
         */
        czm_encodedCameraPositionMCHigh : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.encodedCameraPositionMCHigh;
            }
        }),

        /**
         * An automatic GLSL uniform representing the low bits of the camera position in model
         * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
         * as described in {@link http://blogs.agi.com/insight3d/index.php/2008/09/03/precisions-precisions/|Precisions, Precisions}.
         *
         * @alias czm_encodedCameraPositionMCLow
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_encodedCameraPositionMCLow;
         * 
         * @see czm_encodedCameraPositionMCHigh
         * @see czm_modelViewRelativeToEye
         * @see czm_modelViewProjectionRelativeToEye
         */
        czm_encodedCameraPositionMCLow : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return uniformState.encodedCameraPositionMCLow;
            }
        }),

        /**
         * An automatic GLSL uniform representing the position of the viewer (camera) in world coordinates.
         *
         * @alias czm_viewerPositionWC
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform vec3 czm_viewerPositionWC;
         */
        czm_viewerPositionWC : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_VEC3,
            getValue : function(uniformState) {
                return Matrix4.getTranslation(uniformState.inverseView, viewerPositionWCScratch);
            }
        }),

        /**
         * An automatic GLSL uniform representing the frame number. This uniform is automatically incremented
         * every frame.
         *
         * @alias czm_frameNumber
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform float czm_frameNumber;
         */
        czm_frameNumber : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.frameState.frameNumber;
            }
        }),

        /**
         * An automatic GLSL uniform representing the current morph transition time between
         * 2D/Columbus View and 3D, with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @alias czm_morphTime
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform float czm_morphTime;
         *
         * // Example
         * vec4 p = czm_columbusViewMorph(position2D, position3D, czm_morphTime);
         */
        czm_morphTime : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.frameState.morphTime;
            }
        }),

        /**
         * An automatic GLSL uniform representing the current {@link SceneMode}, expressed
         * as a float.
         *
         * @alias czm_sceneMode
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform float czm_sceneMode;
         *
         * // Example
         * if (czm_sceneMode == czm_sceneMode2D)
         * {
         *     eyeHeightSq = czm_eyeHeight2D.y;
         * }
         * 
         * @see czm_sceneMode2D
         * @see czm_sceneModeColumbusView
         * @see czm_sceneMode3D
         * @see czm_sceneModeMorphing
         */
        czm_sceneMode : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.frameState.mode;
            }
        }),

        /**
         * An automatic GLSL uniform representing the current rendering pass.
         *
         * @alias czm_pass
         * @glslUniform
         *
         * @example
         * // GLSL declaration
         * uniform float czm_pass;
         *
         * // Example
         * if ((czm_pass == czm_passTranslucent) && isOpaque())
         * {
         *     gl_Position *= 0.0; // Cull opaque geometry in the translucent pass
         * }
         */
        czm_pass : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.pass;
            }
        }),

        /**
         * An automatic GLSL uniform representing a 3x3 rotation matrix that transforms
         * from True Equator Mean Equinox (TEME) axes to the pseudo-fixed axes at the current scene time.
         *
         * @alias czm_temeToPseudoFixed
         * @glslUniform
         *
         *
         * @example
         * // GLSL declaration
         * uniform mat3 czm_temeToPseudoFixed;
         *
         * // Example
         * vec3 pseudoFixed = czm_temeToPseudoFixed * teme;
         * 
         * @see UniformState#temeToPseudoFixedMatrix
         * @see Transforms.computeTemeToPseudoFixedMatrix
         */
        czm_temeToPseudoFixed : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT_MAT3,
            getValue : function(uniformState) {
                return uniformState.temeToPseudoFixedMatrix;
            }
        }),

        /**
         * An automatic GLSL uniform representing the ratio of canvas coordinate space to canvas pixel space.
         *
         * @alias czm_resolutionScale
         * @glslUniform
         *
         * @example
         * uniform float czm_resolutionScale;
         */
        czm_resolutionScale : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.resolutionScale;
            }
        }),

        /**
         * An automatic GLSL uniform scalar used to mix a color with the fog color based on the distance to the camera.
         *
         * @alias czm_fogDensity
         * @glslUniform
         *
         * @see czm_fog
         */
        czm_fogDensity : new AutomaticUniform({
            size : 1,
            datatype : WebGLConstants.FLOAT,
            getValue : function(uniformState) {
                return uniformState.fogDensity;
            }
        })
    };

    return AutomaticUniforms;
});
