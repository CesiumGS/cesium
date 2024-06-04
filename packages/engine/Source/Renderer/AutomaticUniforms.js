import Cartesian3 from "../Core/Cartesian3.js";
import Matrix4 from "../Core/Matrix4.js";
import WebGLConstants from "../Core/WebGLConstants.js";

const viewerPositionWCScratch = new Cartesian3();

function AutomaticUniform(options) {
  this._size = options.size;
  this._datatype = options.datatype;
  this.getValue = options.getValue;
}

const datatypeToGlsl = {};
datatypeToGlsl[WebGLConstants.FLOAT] = "float";
datatypeToGlsl[WebGLConstants.FLOAT_VEC2] = "vec2";
datatypeToGlsl[WebGLConstants.FLOAT_VEC3] = "vec3";
datatypeToGlsl[WebGLConstants.FLOAT_VEC4] = "vec4";
datatypeToGlsl[WebGLConstants.INT] = "int";
datatypeToGlsl[WebGLConstants.INT_VEC2] = "ivec2";
datatypeToGlsl[WebGLConstants.INT_VEC3] = "ivec3";
datatypeToGlsl[WebGLConstants.INT_VEC4] = "ivec4";
datatypeToGlsl[WebGLConstants.BOOL] = "bool";
datatypeToGlsl[WebGLConstants.BOOL_VEC2] = "bvec2";
datatypeToGlsl[WebGLConstants.BOOL_VEC3] = "bvec3";
datatypeToGlsl[WebGLConstants.BOOL_VEC4] = "bvec4";
datatypeToGlsl[WebGLConstants.FLOAT_MAT2] = "mat2";
datatypeToGlsl[WebGLConstants.FLOAT_MAT3] = "mat3";
datatypeToGlsl[WebGLConstants.FLOAT_MAT4] = "mat4";
datatypeToGlsl[WebGLConstants.SAMPLER_2D] = "sampler2D";
datatypeToGlsl[WebGLConstants.SAMPLER_CUBE] = "samplerCube";

AutomaticUniform.prototype.getDeclaration = function (name) {
  let declaration = `uniform ${datatypeToGlsl[this._datatype]} ${name}`;

  const size = this._size;
  if (size === 1) {
    declaration += ";";
  } else {
    declaration += `[${size.toString()}];`;
  }

  return declaration;
};

/**
 * @private
 */
const AutomaticUniforms = {
  /**
   * An automatic GLSL uniform containing the viewport's <code>x</code>, <code>y</code>, <code>width</code>,
   * and <code>height</code> properties in an <code>vec4</code>'s <code>x</code>, <code>y</code>, <code>z</code>,
   * and <code>w</code> components, respectively.
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
  czm_viewport: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC4,
    getValue: function (uniformState) {
      return uniformState.viewportCartesian4;
    },
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
  czm_viewportOrthographic: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.viewportOrthographic;
    },
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
  czm_viewportTransformation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.viewportTransformation;
    },
  }),

  /**
   * An automatic GLSL uniform representing the depth of the scene
   * after the globe pass and then updated after the 3D Tiles pass.
   * The depth is packed into an RGBA texture.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_globeDepthTexture;
   *
   * // Get the depth at the current fragment
   * vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
   * float depth = czm_unpackDepth(texture(czm_globeDepthTexture, coords));
   */
  czm_globeDepthTexture: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.SAMPLER_2D,
    getValue: function (uniformState) {
      return uniformState.globeDepthTexture;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model transformation matrix that
   * transforms model coordinates to world coordinates.
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
  czm_model: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.model;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model transformation matrix that
   * transforms world coordinates to model coordinates.
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
  czm_inverseModel: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseModel;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 view transformation matrix that
   * transforms world coordinates to eye coordinates.
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
  czm_view: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.view;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 view transformation matrix that
   * transforms 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link czm_view}, but in 2D and Columbus View it represents the view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
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
  czm_view3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.view3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 view rotation matrix that
   * transforms vectors in world coordinates to eye coordinates.
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
  czm_viewRotation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.viewRotation;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 view rotation matrix that
   * transforms vectors in 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link czm_viewRotation}, but in 2D and Columbus View it represents the view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
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
  czm_viewRotation3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.viewRotation3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to world coordinates.
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
  czm_inverseView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseView;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseView}, but in 2D and Columbus View it represents the inverse view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
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
  czm_inverseView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseView3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that
   * transforms vectors from eye coordinates to world coordinates.
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
  czm_inverseViewRotation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.inverseViewRotation;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that
   * transforms vectors from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseViewRotation}, but in 2D and Columbus View it represents the inverse view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
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
  czm_inverseViewRotation3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.inverseViewRotation3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 projection transformation matrix that
   * transforms eye coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_projection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.projection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 inverse projection transformation matrix that
   * transforms from clip coordinates to eye coordinates. Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_inverseProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 projection transformation matrix with the far plane at infinity,
   * that transforms eye coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  An infinite far plane is used
   * in algorithms like shadow volumes and GPU ray casting with proxy geometry to ensure that triangles
   * are not clipped by the far plane.
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
  czm_infiniteProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.infiniteProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
   * transforms model coordinates to eye coordinates.
   * <br /><br />
   * Positions should be transformed to eye coordinates using <code>czm_modelView</code> and
   * normals should be transformed using {@link czm_normal}.
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
  czm_modelView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelView;
    },
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
  czm_modelView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelView3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
   * transforms model coordinates, relative to the eye, to eye coordinates.  This is used
   * in conjunction with {@link czm_translateRelativeToEye}.
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
  czm_modelViewRelativeToEye: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelViewRelativeToEye;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to model coordinates.
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
  czm_inverseModelView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseModelView;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to 3D model coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseModelView}, but in 2D and Columbus View it represents the inverse model-view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
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
  czm_inverseModelView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseModelView3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
   * transforms world coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_viewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.viewProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
   * transforms clip coordinates to world coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_inverseViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseViewProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_modelViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelViewProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 inverse model-view-projection transformation matrix that
   * transforms clip coordinates to model coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
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
  czm_inverseModelViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.inverseModelViewProjection;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates, relative to the eye, to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  This is used in
   * conjunction with {@link czm_translateRelativeToEye}.
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
  czm_modelViewProjectionRelativeToEye: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelViewProjectionRelativeToEye;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  The projection matrix places
   * the far plane at infinity.  This is useful in algorithms like shadow volumes and GPU ray casting with
   * proxy geometry to ensure that triangles are not clipped by the far plane.
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
  czm_modelViewInfiniteProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelViewInfiniteProjection;
    },
  }),

  /**
   * An automatic GLSL uniform that indicates if the current camera is orthographic in 3D.
   *
   * @see UniformState#orthographicIn3D
   */
  czm_orthographicIn3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.orthographicIn3D ? 1 : 0;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in model coordinates to eye coordinates.
   * <br /><br />
   * Positions should be transformed to eye coordinates using {@link czm_modelView} and
   * normals should be transformed using <code>czm_normal</code>.
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
  czm_normal: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.normal;
    },
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
  czm_normal3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.normal3D;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in eye coordinates to model coordinates.  This is
   * the opposite of the transform provided by {@link czm_normal}.
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
  czm_inverseNormal: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.inverseNormal;
    },
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
  czm_inverseNormal3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.inverseNormal3D;
    },
  }),

  /**
   * An automatic GLSL uniform containing the height in meters of the
   * eye (camera) above or below the ellipsoid.
   *
   * @see UniformState#eyeHeight
   */
  czm_eyeHeight: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.eyeHeight;
    },
  }),

  /**
   * An automatic GLSL uniform containing height (<code>x</code>) and height squared (<code>y</code>)
   * in meters of the eye (camera) above the 2D world plane. This uniform is only valid
   * when the {@link SceneMode} is <code>SCENE2D</code>.
   *
   * @see UniformState#eyeHeight2D
   */
  czm_eyeHeight2D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC2,
    getValue: function (uniformState) {
      return uniformState.eyeHeight2D;
    },
  }),

  /**
   * An automatic GLSL uniform containing the ellipsoid surface normal
   * at the position below the eye (camera), in eye coordinates.
   * This uniform is only valid when the {@link SceneMode} is <code>SCENE3D</code>.
   */
  czm_eyeEllipsoidNormalEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.eyeEllipsoidNormalEC;
    },
  }),

  /**
   * An automatic GLSL uniform containing the ellipsoid radii of curvature at the camera position.
   * The .x component is the prime vertical radius of curvature (east-west direction)
   * .y is the meridional radius of curvature (north-south direction)
   * This uniform is only valid when the {@link SceneMode} is <code>SCENE3D</code>.
   */
  czm_eyeEllipsoidCurvature: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC2,
    getValue: function (uniformState) {
      return uniformState.eyeEllipsoidCurvature;
    },
  }),

  /**
   * An automatic GLSL uniform containing the transform from model coordinates
   * to an east-north-up coordinate system centered at the position on the
   * ellipsoid below the camera.
   * This uniform is only valid when the {@link SceneMode} is <code>SCENE3D</code>.
   */
  czm_modelToEnu: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.modelToEnu;
    },
  }),

  /**
   * An automatic GLSL uniform containing the the inverse of
   * {@link AutomaticUniforms.czm_modelToEnu}.
   * This uniform is only valid when the {@link SceneMode} is <code>SCENE3D</code>.
   */
  czm_enuToModel: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT4,
    getValue: function (uniformState) {
      return uniformState.enuToModel;
    },
  }),

  /**
   * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
   * of the frustum defined by the camera.  This is the largest possible frustum, not an individual
   * frustum used for multi-frustum rendering.
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
  czm_entireFrustum: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC2,
    getValue: function (uniformState) {
      return uniformState.entireFrustum;
    },
  }),

  /**
   * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
   * of the frustum defined by the camera.  This is the individual
   * frustum used for multi-frustum rendering.
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
  czm_currentFrustum: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC2,
    getValue: function (uniformState) {
      return uniformState.currentFrustum;
    },
  }),

  /**
   * The distances to the frustum planes. The top, bottom, left and right distances are
   * the x, y, z, and w components, respectively.
   */
  czm_frustumPlanes: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC4,
    getValue: function (uniformState) {
      return uniformState.frustumPlanes;
    },
  }),

  /**
   * Gets the far plane's distance from the near plane, plus 1.0.
   */
  czm_farDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.farDepthFromNearPlusOne;
    },
  }),

  /**
   * Gets the log2 of {@link AutomaticUniforms#czm_farDepthFromNearPlusOne}.
   */
  czm_log2FarDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.log2FarDepthFromNearPlusOne;
    },
  }),

  /**
   * Gets 1.0 divided by {@link AutomaticUniforms#czm_log2FarDepthFromNearPlusOne}.
   */
  czm_oneOverLog2FarDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.oneOverLog2FarDepthFromNearPlusOne;
    },
  }),

  /**
   * An automatic GLSL uniform representing the sun position in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunPositionWC;
   *
   * @see UniformState#sunPositionWC
   * @see czm_sunPositionColumbusView
   * @see czm_sunDirectionWC
   */
  czm_sunPositionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.sunPositionWC;
    },
  }),

  /**
   * An automatic GLSL uniform representing the sun position in Columbus view world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunPositionColumbusView;
   *
   * @see UniformState#sunPositionColumbusView
   * @see czm_sunPositionWC
   */
  czm_sunPositionColumbusView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.sunPositionColumbusView;
    },
  }),

  /**
   * An automatic GLSL uniform representing the normalized direction to the sun in eye coordinates.
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
  czm_sunDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.sunDirectionEC;
    },
  }),

  /**
   * An automatic GLSL uniform representing the normalized direction to the sun in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunDirectionWC;
   *
   * // Example
   * float diffuse = max(dot(czm_sunDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#sunDirectionWC
   * @see czm_sunPositionWC
   * @see czm_sunDirectionEC
   */
  czm_sunDirectionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.sunDirectionWC;
    },
  }),

  /**
   * An automatic GLSL uniform representing the normalized direction to the moon in eye coordinates.
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
  czm_moonDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.moonDirectionEC;
    },
  }),

  /**
   * An automatic GLSL uniform representing the normalized direction to the scene's light source in eye coordinates.
   * This is commonly used for directional lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightDirectionEC;
   *
   * // Example
   * float diffuse = max(dot(czm_lightDirectionEC, normalEC), 0.0);
   *
   * @see UniformState#lightDirectionEC
   * @see czm_lightDirectionWC
   */
  czm_lightDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.lightDirectionEC;
    },
  }),

  /**
   * An automatic GLSL uniform representing the normalized direction to the scene's light source in world coordinates.
   * This is commonly used for directional lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightDirectionWC;
   *
   * // Example
   * float diffuse = max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightDirectionWC
   * @see czm_lightDirectionEC
   */
  czm_lightDirectionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.lightDirectionWC;
    },
  }),

  /**
   * An automatic GLSL uniform that represents the color of light emitted by the scene's light source. This
   * is equivalent to the light color multiplied by the light intensity limited to a maximum luminance of 1.0
   * suitable for non-HDR lighting.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightColor;
   *
   * // Example
   * vec3 diffuseColor = czm_lightColor * max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightColor
   * @see czm_lightColorHdr
   */
  czm_lightColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.lightColor;
    },
  }),

  /**
   * An automatic GLSL uniform that represents the high dynamic range color of light emitted by the scene's light
   * source. This is equivalent to the light color multiplied by the light intensity suitable for HDR lighting.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightColorHdr;
   *
   * // Example
   * vec3 diffuseColor = czm_lightColorHdr * max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightColorHdr
   * @see czm_lightColor
   */
  czm_lightColorHdr: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.lightColorHdr;
    },
  }),

  /**
   * An automatic GLSL uniform representing the high bits of the camera position in model
   * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
   * as described in {@link http://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm|Precisions, Precisions}.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_encodedCameraPositionMCHigh;
   *
   * @see czm_encodedCameraPositionMCLow
   * @see czm_modelViewRelativeToEye
   * @see czm_modelViewProjectionRelativeToEye
   */
  czm_encodedCameraPositionMCHigh: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.encodedCameraPositionMCHigh;
    },
  }),

  /**
   * An automatic GLSL uniform representing the low bits of the camera position in model
   * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
   * as described in {@linkhttp://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm|Precisions, Precisions}.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_encodedCameraPositionMCLow;
   *
   * @see czm_encodedCameraPositionMCHigh
   * @see czm_modelViewRelativeToEye
   * @see czm_modelViewProjectionRelativeToEye
   */
  czm_encodedCameraPositionMCLow: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.encodedCameraPositionMCLow;
    },
  }),

  /**
   * An automatic GLSL uniform representing the position of the viewer (camera) in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_viewerPositionWC;
   */
  czm_viewerPositionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return Matrix4.getTranslation(
        uniformState.inverseView,
        viewerPositionWCScratch
      );
    },
  }),

  /**
   * An automatic GLSL uniform representing the frame number. This uniform is automatically incremented
   * every frame.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_frameNumber;
   */
  czm_frameNumber: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.frameState.frameNumber;
    },
  }),

  /**
   * An automatic GLSL uniform representing the current morph transition time between
   * 2D/Columbus View and 3D, with 0.0 being 2D or Columbus View and 1.0 being 3D.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_morphTime;
   *
   * // Example
   * vec4 p = czm_columbusViewMorph(position2D, position3D, czm_morphTime);
   */
  czm_morphTime: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.frameState.morphTime;
    },
  }),

  /**
   * An automatic GLSL uniform representing the current {@link SceneMode}, expressed
   * as a float.
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
  czm_sceneMode: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.frameState.mode;
    },
  }),

  /**
   * An automatic GLSL uniform representing the current rendering pass.
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
  czm_pass: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.pass;
    },
  }),

  /**
   * An automatic GLSL uniform representing the current scene background color.
   *
   * @example
   * // GLSL declaration
   * uniform vec4 czm_backgroundColor;
   *
   * // Example: If the given color's RGB matches the background color, invert it.
   * vec4 adjustColorForContrast(vec4 color)
   * {
   *     if (czm_backgroundColor.rgb == color.rgb)
   *     {
   *         color.rgb = vec3(1.0) - color.rgb;
   *     }
   *
   *     return color;
   * }
   */
  czm_backgroundColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC4,
    getValue: function (uniformState) {
      return uniformState.backgroundColor;
    },
  }),

  /**
   * An automatic GLSL uniform containing the BRDF look up texture used for image-based lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_brdfLut;
   *
   * // Example: For a given roughness and NdotV value, find the material's BRDF information in the red and green channels
   * float roughness = 0.5;
   * float NdotV = dot(normal, view);
   * vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, 1.0 - roughness)).rg;
   */
  czm_brdfLut: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.SAMPLER_2D,
    getValue: function (uniformState) {
      return uniformState.brdfLut;
    },
  }),

  /**
   * An automatic GLSL uniform containing the environment map used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform samplerCube czm_environmentMap;
   *
   * // Example: Create a perfect reflection of the environment map on a  model
   * float reflected = reflect(view, normal);
   * vec4 reflectedColor = texture(czm_environmentMap, reflected);
   */
  czm_environmentMap: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.SAMPLER_CUBE,
    getValue: function (uniformState) {
      return uniformState.environmentMap;
    },
  }),

  /**
   * An automatic GLSL uniform containing the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_specularEnvironmentMaps;
   */
  czm_specularEnvironmentMaps: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.SAMPLER_2D,
    getValue: function (uniformState) {
      return uniformState.specularEnvironmentMaps;
    },
  }),

  /**
   * An automatic GLSL uniform containing the size of the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform vec2 czm_specularEnvironmentMapSize;
   */
  czm_specularEnvironmentMapSize: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC2,
    getValue: function (uniformState) {
      return uniformState.specularEnvironmentMapsDimensions;
    },
  }),

  /**
   * An automatic GLSL uniform containing the maximum level-of-detail of the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_specularEnvironmentMapsMaximumLOD;
   */
  czm_specularEnvironmentMapsMaximumLOD: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.specularEnvironmentMapsMaximumLOD;
    },
  }),

  /**
   * An automatic GLSL uniform containing the spherical harmonic coefficients used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform vec3[9] czm_sphericalHarmonicCoefficients;
   */
  czm_sphericalHarmonicCoefficients: new AutomaticUniform({
    size: 9,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.sphericalHarmonicCoefficients;
    },
  }),

  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that transforms
   * from True Equator Mean Equinox (TEME) axes to the pseudo-fixed axes at the current scene time.
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
  czm_temeToPseudoFixed: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_MAT3,
    getValue: function (uniformState) {
      return uniformState.temeToPseudoFixedMatrix;
    },
  }),

  /**
   * An automatic GLSL uniform representing the ratio of canvas coordinate space to canvas pixel space.
   *
   * @example
   * uniform float czm_pixelRatio;
   */
  czm_pixelRatio: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.pixelRatio;
    },
  }),

  /**
   * An automatic GLSL uniform scalar used to mix a color with the fog color based on the distance to the camera.
   *
   * @see czm_fog
   */
  czm_fogDensity: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.fogDensity;
    },
  }),

  /**
   * An automatic GLSL uniform scalar used to set a minimum brightness when dynamic lighting is applied to fog.
   *
   * @see czm_fog
   */
  czm_fogMinimumBrightness: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.fogMinimumBrightness;
    },
  }),

  /**
   * An automatic uniform representing the color shift for the atmosphere in HSB color space
   *
   * @example
   * uniform vec3 czm_atmosphereHsbShift;
   */
  czm_atmosphereHsbShift: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.atmosphereHsbShift;
    },
  }),
  /**
   * An automatic uniform representing the intensity of the light that is used for computing the atmosphere color
   *
   * @example
   * uniform float czm_atmosphereLightIntensity;
   */
  czm_atmosphereLightIntensity: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.atmosphereLightIntensity;
    },
  }),
  /**
   * An automatic uniform representing the Rayleigh scattering coefficient used when computing the atmosphere scattering
   *
   * @example
   * uniform vec3 czm_atmosphereRayleighCoefficient;
   */
  czm_atmosphereRayleighCoefficient: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.atmosphereRayleighCoefficient;
    },
  }),
  /**
   * An automatic uniform representing the Rayleigh scale height in meters used for computing atmosphere scattering.
   *
   * @example
   * uniform vec3 czm_atmosphereRayleighScaleHeight;
   */
  czm_atmosphereRayleighScaleHeight: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.atmosphereRayleighScaleHeight;
    },
  }),
  /**
   * An automatic uniform representing the Mie scattering coefficient used when computing atmosphere scattering.
   *
   * @example
   * uniform vec3 czm_atmosphereMieCoefficient;
   */
  czm_atmosphereMieCoefficient: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.atmosphereMieCoefficient;
    },
  }),
  /**
   * An automatic uniform storign the Mie scale height used when computing atmosphere scattering.
   *
   * @example
   * uniform float czm_atmosphereMieScaleHeight;
   */
  czm_atmosphereMieScaleHeight: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.atmosphereMieScaleHeight;
    },
  }),
  /**
   * An automatic uniform representing the anisotropy of the medium to consider for Mie scattering.
   *
   * @example
   * uniform float czm_atmosphereAnisotropy;
   */
  czm_atmosphereMieAnisotropy: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.atmosphereMieAnisotropy;
    },
  }),

  /**
   * An automatic uniform representing which light source to use for dynamic lighting
   *
   * @example
   * uniform float czm_atmosphereDynamicLighting
   */
  czm_atmosphereDynamicLighting: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.atmosphereDynamicLighting;
    },
  }),

  /**
   * An automatic GLSL uniform representing the splitter position to use when rendering with a splitter.
   * This will be in pixel coordinates relative to the canvas.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_splitPosition;
   */
  czm_splitPosition: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.splitPosition;
    },
  }),

  /**
   * An automatic GLSL uniform scalar representing the geometric tolerance per meter
   */
  czm_geometricToleranceOverMeter: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.geometricToleranceOverMeter;
    },
  }),

  /**
   * An automatic GLSL uniform representing the distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always be applied. When less than zero,
   * the depth test should never be applied.
   */
  czm_minimumDisableDepthTestDistance: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.minimumDisableDepthTestDistance;
    },
  }),

  /**
   * An automatic GLSL uniform that will be the highlight color of unclassified 3D Tiles.
   */
  czm_invertClassificationColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC4,
    getValue: function (uniformState) {
      return uniformState.invertClassificationColor;
    },
  }),

  /**
   * An automatic GLSL uniform that is used for gamma correction.
   */
  czm_gamma: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT,
    getValue: function (uniformState) {
      return uniformState.gamma;
    },
  }),

  /**
   * An automatic GLSL uniform that stores the ellipsoid radii.
   */
  czm_ellipsoidRadii: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.ellipsoid.radii;
    },
  }),

  /**
   * An automatic GLSL uniform that stores the ellipsoid inverse radii.
   */
  czm_ellipsoidInverseRadii: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants.FLOAT_VEC3,
    getValue: function (uniformState) {
      return uniformState.ellipsoid.oneOverRadii;
    },
  }),
};
export default AutomaticUniforms;
