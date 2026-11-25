// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/specification/1.0/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { CESIUM_RTC } from "./Extensions/CESIUM_RTC.js";
import type { KHR_binary_glTF } from "./Extensions/KHR_binary_glTF.js";
import type { WEB3D_quantized_attributes } from "./Extensions/WEB3D_quantized_attributes.js";

/**
 * The root object for a glTF asset.
 *
 * @internal
 */
export interface Gltf1 extends Gltf1.Property {
  /**
   * Names of extensions used somewhere in this asset.
   *
   * @default []
   */
  extensionsUsed?: string[];
  /**
   * A dictionary object of accessors. The name of each accessor is an ID in the
   * global glTF namespace that is used to reference the accessor. An accessor
   * is a typed view into a bufferView.
   *
   * @default {}
   */
  accessors?: Record<string, Gltf1.Accessor>;
  /**
   * A dictionary object of keyframe animations. The name of each animation is
   * an ID in the global glTF namespace that is used to reference the animation.
   *
   * @default {}
   */
  animations?: Record<string, Gltf1.Animation>;
  /**
   * Metadata about the glTF asset.
   *
   * @default {}
   */
  asset?: Gltf1.Asset;
  /**
   * A dictionary object of buffers. The name of each buffer is an ID in the
   * global glTF namespace that is used to reference the buffer. A buffer points
   * to binary geometry, animation, or skins.
   *
   * @default {}
   */
  buffers?: Record<string, Gltf1.Buffer>;
  /**
   * A dictionary object of bufferViews. The name of each bufferView is an ID in
   * the global glTF namespace that is used to reference the bufferView. A
   * bufferView is a view into a buffer generally representing a subset of the
   * buffer.
   *
   * @default {}
   */
  bufferViews?: Record<string, Gltf1.BufferView>;
  /**
   * A dictionary object of cameras. The name of each camera is an ID in the
   * global glTF namespace that is used to reference the camera. A camera
   * defines a projection matrix.
   *
   * @default {}
   */
  cameras?: Record<string, Gltf1.Camera>;
  /**
   * A dictionary object of images. The name of each image is an ID in the
   * global glTF namespace that is used to reference the image. An image defines
   * data used to create a texture.
   *
   * @default {}
   */
  images?: Record<string, Gltf1.Image>;
  /**
   * A dictionary object of materials. The name of each material is an ID in the
   * global glTF namespace that is used to reference the material. A material
   * defines the appearance of a primitive.
   *
   * @default {}
   */
  materials?: Record<string, Gltf1.Material>;
  /**
   * A dictionary object of meshes. The name of each mesh is an ID in the global
   * glTF namespace that is used to reference the mesh. A mesh is a set of
   * primitives to be rendered.
   *
   * @default {}
   */
  meshes?: Record<string, Gltf1.Mesh>;
  /**
   * A dictionary object of nodes in the node hierarchy. The name of each node
   * is an ID in the global glTF namespace that is used to reference the node.
   *
   * @default {}
   */
  nodes?: Record<string, Gltf1.Node>;
  /**
   * A dictionary object of shader programs. The name of each program is an ID
   * in the global glTF namespace that is used to reference the program.
   *
   * @default {}
   */
  programs?: Record<string, Gltf1.Program>;
  /**
   * A dictionary object of samplers. The name of each sampler is an ID in the
   * global glTF namespace that is used to reference the sampler. A sampler
   * contains properties for texture filtering and wrapping modes.
   *
   * @default {}
   */
  samplers?: Record<string, Gltf1.Sampler>;
  /**
   * The ID of the default scene.
   */
  scene?: string;
  /**
   * A dictionary object of scenes. The name of each scene is an ID in the
   * global glTF namespace that is used to reference the scene.
   *
   * @default {}
   */
  scenes?: Record<string, Gltf1.Scene>;
  /**
   * A dictionary object of shaders. The name of each shader is an ID in the
   * global glTF namespace that is used to reference the shader.
   *
   * @default {}
   */
  shaders?: Record<string, Gltf1.Shader>;
  /**
   * A dictionary object of skins. The name of each skin is an ID in the global
   * glTF namespace that is used to reference the skin. A skin is defined by
   * joints and matrices.
   *
   * @default {}
   */
  skins?: Record<string, Gltf1.Skin>;
  /**
   * A dictionary object of techniques. The name of each technique is an ID in
   * the global glTF namespace that is used to reference the technique. A
   * technique is a template for a material appearance.
   *
   * @default {}
   */
  techniques?: Record<string, Gltf1.Technique>;
  /**
   * A dictionary object of textures. The name of each texture is an ID in the
   * global glTF namespace that is used to reference the texture.
   *
   * @default {}
   */
  textures?: Record<string, Gltf1.Texture>;
  /**
   * Dictionary object with extension-specific objects.
   */
  extensions?: Gltf1.Extensions;
}
/** @internal */
export namespace Gltf1 {
  /**
   * A typed view into a bufferView. A bufferView contains raw binary data. An
   * accessor provides a typed view into a bufferView or a subset of a
   * bufferView similar to how WebGL's `vertexAttribPointer()` defines an
   * attribute in a buffer.
   */
  export interface Accessor extends Gltf1.ChildOfRootProperty {
    /**
     * The ID of the bufferView.
     */
    bufferView: string;
    /**
     * The offset relative to the start of the bufferView in bytes. This must be
     * a multiple of the size of the data type.
     */
    byteOffset: number;
    /**
     * The stride, in bytes, between attributes referenced by this accessor.
     * When this is zero, the attributes are tightly packed.
     *
     * @default 0
     */
    byteStride?: number;
    /**
     * The datatype of components in the attribute. All valid values correspond
     * to WebGL enums. The corresponding typed arrays are `Int8Array`,
     * `Uint8Array`, `Int16Array`, `Uint16Array`, and `Float32Array`,
     * respectively.
     *
     * Allowed values:
     *
     * - `5120`: BYTE
     * - `5121`: UNSIGNED_BYTE
     * - `5122`: SHORT
     * - `5123`: UNSIGNED_SHORT
     * - `5126`: FLOAT
     */
    componentType: 5120 | 5121 | 5122 | 5123 | 5126;
    /**
     * The number of attributes referenced by this accessor, not to be confused
     * with the number of bytes or number of components.
     */
    count: number;
    /**
     * Specifies if the attribute is a scalar, vector, or matrix, and the number
     * of elements in the vector or matrix.
     *
     * Allowed values:
     *
     * - `"SCALAR"`
     * - `"VEC2"`
     * - `"VEC3"`
     * - `"VEC4"`
     * - `"MAT2"`
     * - `"MAT3"`
     * - `"MAT4"`
     */
    type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";
    /**
     * Maximum value of each component in this attribute. When both min and max
     * arrays are defined, they have the same length. The length is determined
     * by the value of the type property; it can be 1, 2, 3, 4, 9, or 16.
     */
    max?: number[];
    /**
     * Minimum value of each component in this attribute. When both min and max
     * arrays are defined, they have the same length. The length is determined
     * by the value of the type property; it can be 1, 2, 3, 4, 9, or 16.
     */
    min?: number[];
    /**
     * Dictionary object with extension-specific objects.
     */
    extensions?: Gltf1.Accessor.Extensions;
  }
  export namespace Accessor {
    export interface Extensions extends Gltf1.Property.Extensions {
      WEB3D_quantized_attributes?: WEB3D_quantized_attributes.Accessor;
    }
  }
  /**
   * A keyframe animation.
   */
  export interface Animation extends Gltf1.ChildOfRootProperty {
    /**
     * An array of channels, each of which targets an animation's sampler at a
     * node's property.
     *
     * @default []
     */
    channels?: Gltf1.Animation.Channel[];
    /**
     * A dictionary object of strings whose values are IDs of accessors with
     * keyframe data, e.g., time, translation, rotation, etc.
     *
     * @default {}
     */
    parameters?: Record<string, string>;
    /**
     * A dictionary object of samplers that combines input and output parameters
     * with an interpolation algorithm to define a keyframe graph (but not its
     * target).
     *
     * @default {}
     */
    samplers?: Record<string, Gltf1.Animation.Sampler>;
  }
  export namespace Animation {
    /**
     * Targets an animation's sampler at a node's property.
     */
    export interface Channel extends Gltf1.Property {
      /**
       * The ID of a sampler in this animation used to compute the value for the
       * target, e.g., a node's translation, rotation, or scale (TRS).
       */
      sampler: string;
      /**
       * The ID of the node and TRS property to target.
       */
      target: Gltf1.Animation.Channel.Target;
    }
    export namespace Channel {
      /**
       * The ID of the node and TRS property that an animation channel targets.
       */
      export interface Target extends Gltf1.Property {
        /**
         * The ID of the node to target.
         */
        id: string;
        /**
         * The name of the node's TRS property to modify.
         *
         * Allowed values:
         *
         * - `"translation"`
         * - `"rotation"`
         * - `"scale"`
         */
        path: "translation" | "rotation" | "scale";
      }
    }
    /**
     * Combines input and output parameters with an interpolation algorithm to
     * define a keyframe graph (but not its target).
     */
    export interface Sampler extends Gltf1.Property {
      /**
       * The ID of a parameter in this animation to use as keyframe input. This
       * parameter must have type `FLOAT`. The values represent time in seconds
       * with `time[0] >= 0.0`, and monotonically increasing values, i.e.,
       * `time[n + 1] >= time[n]`.
       */
      input: string;
      /**
       * Interpolation algorithm. When an animation targets a node's rotation,
       * and the animation's interpolation is `"LINEAR"`, spherical linear
       * interpolation (slerp) should be used to interpolate quaternions.
       *
       * Allowed values:
       *
       * - `"LINEAR"`
       *
       * @default "LINEAR"
       */
      interpolation?: "LINEAR";
      /**
       * The ID of a parameter in this animation to use as keyframe output.
       */
      output: string;
    }
  }
  /**
   * Metadata about the glTF asset.
   */
  export interface Asset extends Gltf1.Property {
    /**
     * A copyright message suitable for display to credit the content creator.
     */
    copyright?: string;
    /**
     * Tool that generated this glTF model. Useful for debugging.
     */
    generator?: string;
    /**
     * Specifies if the shaders were generated with premultiplied alpha.
     *
     * @default false
     */
    premultipliedAlpha?: boolean;
    /**
     * Specifies the target rendering API and version, e.g., WebGL 1.0.3.
     *
     * @default {}
     */
    profile?: Gltf1.Asset.Profile;
    /**
     * The glTF version.
     */
    version: string;
  }
  export namespace Asset {
    /**
     * Specifies the target rendering API and version, e.g., WebGL 1.0.3.
     */
    export interface Profile extends Gltf1.Property {
      /**
       * Specifies the target rendering API.
       *
       * @default "WebGL"
       */
      api?: string;
      /**
       * The API version.
       *
       * @default "1.0.3"
       */
      version?: string;
    }
  }
  /**
   * A buffer points to binary geometry, animation, or skins.
   */
  export interface Buffer extends Gltf1.ChildOfRootProperty {
    /**
     * The uri of the buffer. Relative paths are relative to the .gltf file.
     * Instead of referencing an external file, the uri can also be a data-uri.
     */
    uri: string;
    /**
     * The length of the buffer in bytes.
     *
     * @default 0
     */
    byteLength?: number;
    /**
     * XMLHttpRequest `responseType`.
     *
     * Allowed values:
     *
     * - `"arraybuffer"`
     * - `"text"`
     *
     * @default "arraybuffer"
     */
    type?: "arraybuffer" | "text";
  }
  /**
   * A view into a buffer generally representing a subset of the buffer.
   */
  export interface BufferView extends Gltf1.ChildOfRootProperty {
    /**
     * The ID of the buffer.
     */
    buffer: string;
    /**
     * The offset into the buffer in bytes.
     */
    byteOffset: number;
    /**
     * The length of the bufferView in bytes.
     *
     * @default 0
     */
    byteLength?: number;
    /**
     * The target that the WebGL buffer should be bound to. All valid values
     * correspond to WebGL enums. When this is not provided, the bufferView
     * contains animation or skin data.
     *
     * Allowed values:
     *
     * - `34962`: ARRAY_BUFFER
     * - `34963`: ELEMENT_ARRAY_BUFFER
     */
    target?: 34962 | 34963;
  }
  /**
   * A camera's projection. A node can reference a camera ID to apply a
   * transform to place the camera in the scene.
   */
  export interface Camera extends Gltf1.ChildOfRootProperty {
    /**
     * An orthographic camera containing properties to create an orthographic
     * projection matrix.
     */
    orthographic?: Gltf1.Camera.Orthographic;
    /**
     * A perspective camera containing properties to create a perspective
     * projection matrix.
     */
    perspective?: Gltf1.Camera.Perspective;
    /**
     * Specifies if the camera uses a perspective or orthographic projection.
     * Based on this, either the camera's `perspective` or `orthographic`
     * property will be defined.
     *
     * Allowed values:
     *
     * - `"perspective"`
     * - `"orthographic"`
     */
    type: "perspective" | "orthographic";
  }
  export namespace Camera {
    /**
     * An orthographic camera containing properties to create an orthographic
     * projection matrix.
     */
    export interface Orthographic extends Gltf1.Property {
      /**
       * The floating-point horizontal magnification of the view.
       */
      xmag: number;
      /**
       * The floating-point vertical magnification of the view.
       */
      ymag: number;
      /**
       * The floating-point distance to the far clipping plane.
       */
      zfar: number;
      /**
       * The floating-point distance to the near clipping plane.
       */
      znear: number;
    }
    /**
     * A perspective camera containing properties to create a perspective
     * projection matrix.
     */
    export interface Perspective extends Gltf1.Property {
      /**
       * The floating-point aspect ratio of the field of view. When this is
       * undefined, the aspect ratio of the canvas is used.
       */
      aspectRatio?: number;
      /**
       * The floating-point vertical field of view in radians.
       */
      yfov: number;
      /**
       * The floating-point distance to the far clipping plane. zfar must be
       * greater than znear.
       */
      zfar: number;
      /**
       * The floating-point distance to the near clipping plane. zfar must be
       * greater than znear.
       */
      znear: number;
    }
  }
  export interface Extensions extends Gltf1.Property.Extensions {
    /**
     * glTF CESIUM_RTC extension.
     */
    CESIUM_RTC?: CESIUM_RTC;
  }
  export interface ChildOfRootProperty extends Gltf1.Property {
    /**
     * The user-defined name of this object. This is not necessarily unique,
     * e.g., an accessor and a buffer could have the same name, or two accessors
     * could even have the same name.
     */
    name?: string;
  }
  export interface Property {
    /**
     * Application-specific data.
     */
    extras?: unknown;
    /**
     * Dictionary object with extension-specific objects.
     */
    extensions?: Gltf1.Property.Extensions;
  }
  export namespace Property {
    export interface Extensions {
      [name: string]: unknown;
    }
  }
  /**
   * Image data used to create a texture.
   */
  export interface Image extends Gltf1.ChildOfRootProperty {
    /**
     * The uri of the image. Relative paths are relative to the .gltf file.
     * Instead of referencing an external file, the uri can also be a data-uri.
     * The image format must be jpg, png, bmp, or gif.
     */
    uri: string;
    /**
     * Dictionary object with extension-specific objects.
     */
    extensions?: Gltf1.Image.Extensions;
  }
  export namespace Image {
    export interface Extensions extends Gltf1.Property.Extensions {
      KHR_binary_glTF?: KHR_binary_glTF.Image;
    }
  }
  /**
   * The material appearance of a primitive.
   */
  export interface Material extends Gltf1.ChildOfRootProperty {
    /**
     * The ID of the technique. If this is not supplied, and no extension is
     * present that defines material properties, then the primitive should be
     * rendered using a default material with 50% gray emissive color.
     */
    technique?: string;
    /**
     * A dictionary object of parameter values. Parameters with the same name as
     * the technique's parameter override the technique's parameter value.
     *
     * @default {}
     */
    values?: Record<
      string,
      number | boolean | string | (number | boolean | string)[]
    >;
  }
  /**
   * A set of primitives to be rendered. A node can contain one or more meshes.
   * A node's transform places the mesh in the scene.
   */
  export interface Mesh extends Gltf1.ChildOfRootProperty {
    /**
     * An array of primitives, each defining geometry to be rendered with a
     * material.
     *
     * @default []
     */
    primitives?: Gltf1.Mesh.Primitive[];
  }
  export namespace Mesh {
    /**
     * Geometry to be rendered with the given material.
     */
    export interface Primitive extends Gltf1.Property {
      /**
       * A dictionary object of strings, where each string is the ID of the
       * accessor containing an attribute.
       *
       * @default {}
       */
      attributes?: Record<string, string>;
      /**
       * The ID of the accessor that contains the indices. When this is not
       * defined, the primitives should be rendered without indices using
       * `drawArrays()`. When defined, the accessor must contain indices: the
       * bufferView referenced by the accessor must have a target equal to 34963
       * (ELEMENT_ARRAY_BUFFER); a byteStride that is tightly packed, i.e., 0 or
       * the byte size of componentType in bytes; componentType must be 5121
       * (UNSIGNED_BYTE) or 5123 (UNSIGNED_SHORT); and type must be "SCALAR".
       */
      indices?: string;
      /**
       * The ID of the material to apply to this primitive when rendering.
       */
      material: string;
      /**
       * The type of primitives to render. All valid values correspond to WebGL
       * enums.
       *
       * Allowed values:
       *
       * - `0`: POINTS
       * - `1`: LINES
       * - `2`: LINE_LOOP
       * - `3`: LINE_STRIP
       * - `4`: TRIANGLES
       * - `5`: TRIANGLE_STRIP
       * - `6`: TRIANGLE_FAN
       *
       * @default 4
       */
      mode?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
  }
  /**
   * A node in the node hierarchy. A node can have either the `camera`,
   * `meshes`, or `skeletons`/`skin`/`meshes` properties defined. In the later
   * case, all `primitives` in the referenced `meshes` contain `JOINT` and
   * `WEIGHT` attributes and the referenced `material`/`technique` from each
   * `primitive` has parameters with `JOINT` and `WEIGHT` semantics. A node can
   * have either a `matrix` or any combination of
   * `translation`/`rotation`/`scale` (TRS) properties. TRS properties are
   * converted to matrices and postmultiplied in the `T * R * S` order to
   * compose the transformation matrix; first the scale is applied to the
   * vertices, then the rotation, and then the translation. If none are
   * provided, the transform is the identity. When a node is targeted for
   * animation (referenced by an animation.channel.target), only TRS properties
   * may be present; `matrix` will not be present.
   */
  export interface Node extends Gltf1.ChildOfRootProperty {
    /**
     * The ID of the camera referenced by this node.
     */
    camera?: string;
    /**
     * The IDs of this node's children.
     *
     * @default []
     */
    children?: string[];
    /**
     * The ID of skeleton nodes. Each node defines a subtree, which has a
     * `jointName` of the corresponding element in the referenced
     * `skin.jointNames`.
     */
    skeletons?: string[];
    /**
     * The ID of the skin referenced by this node.
     */
    skin?: string;
    /**
     * Name used when this node is a joint in a skin.
     */
    jointName?: string;
    /**
     * A floating-point 4x4 transformation matrix stored in column-major order.
     *
     * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
     */
    matrix?: number[];
    /**
     * The IDs of the meshes in this node. Multiple meshes are allowed so each
     * can share the same transform matrix.
     */
    meshes?: string[];
    /**
     * The node's unit quaternion rotation in the order (x, y, z, w), where w is
     * the scalar.
     *
     * @default [0,0,0,1]
     */
    rotation?: [number, number, number, number];
    /**
     * The node's non-uniform scale.
     *
     * @default [1,1,1]
     */
    scale?: [number, number, number];
    /**
     * The node's translation.
     *
     * @default [0,0,0]
     */
    translation?: [number, number, number];
  }
  /**
   * A shader program, including its vertex and fragment shader, and names of
   * vertex shader attributes.
   */
  export interface Program extends Gltf1.ChildOfRootProperty {
    /**
     * Names of GLSL vertex shader attributes.
     *
     * @default []
     */
    attributes?: string[];
    /**
     * The ID of the fragment shader.
     */
    fragmentShader: string;
    /**
     * The ID of the vertex shader.
     */
    vertexShader: string;
  }
  /**
   * Texture sampler properties for filtering and wrapping modes.
   */
  export interface Sampler extends Gltf1.ChildOfRootProperty {
    /**
     * Magnification filter. Valid values correspond to WebGL enums: `9728`
     * (NEAREST) and `9729` (LINEAR).
     *
     * Allowed values:
     *
     * - `9728`: NEAREST
     * - `9729`: LINEAR
     *
     * @default 9729
     */
    magFilter?: 9728 | 9729;
    /**
     * Minification filter. All valid values correspond to WebGL enums.
     *
     * Allowed values:
     *
     * - `9728`: NEAREST
     * - `9729`: LINEAR
     * - `9984`: NEAREST_MIPMAP_NEAREST
     * - `9985`: LINEAR_MIPMAP_NEAREST
     * - `9986`: NEAREST_MIPMAP_LINEAR
     * - `9987`: LINEAR_MIPMAP_LINEAR
     *
     * @default 9986
     */
    minFilter?: 9728 | 9729 | 9984 | 9985 | 9986 | 9987;
    /**
     * s wrapping mode. All valid values correspond to WebGL enums.
     *
     * Allowed values:
     *
     * - `33071`: CLAMP_TO_EDGE
     * - `33648`: MIRRORED_REPEAT
     * - `10497`: REPEAT
     *
     * @default 10497
     */
    wrapS?: 33071 | 33648 | 10497;
    /**
     * t wrapping mode. All valid values correspond to WebGL enums.
     *
     * Allowed values:
     *
     * - `33071`: CLAMP_TO_EDGE
     * - `33648`: MIRRORED_REPEAT
     * - `10497`: REPEAT
     *
     * @default 10497
     */
    wrapT?: 33071 | 33648 | 10497;
  }
  /**
   * The root nodes of a scene.
   */
  export interface Scene extends Gltf1.ChildOfRootProperty {
    /**
     * The IDs of each root node.
     *
     * @default []
     */
    nodes?: string[];
  }
  /**
   * A vertex or fragment shader.
   */
  export interface Shader extends Gltf1.ChildOfRootProperty {
    /**
     * The uri of the GLSL source. Relative paths are relative to the .gltf
     * file. Instead of referencing an external file, the uri can also be a
     * data-uri.
     */
    uri: string;
    /**
     * The shader stage. All valid values correspond to WebGL enums.
     *
     * Allowed values:
     *
     * - `35632`: FRAGMENT_SHADER
     * - `35633`: VERTEX_SHADER
     */
    type: 35632 | 35633;
    /**
     * Dictionary object with extension-specific objects.
     */
    extensions?: Gltf1.Shader.Extensions;
  }
  export namespace Shader {
    export interface Extensions extends Gltf1.Property.Extensions {
      KHR_binary_glTF?: KHR_binary_glTF.Shader;
    }
  }
  /**
   * Joints and matrices defining a skin.
   */
  export interface Skin extends Gltf1.ChildOfRootProperty {
    /**
     * Floating-point 4x4 transformation matrix stored in column-major order.
     *
     * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
     */
    bindShapeMatrix?: number[];
    /**
     * The ID of the accessor containing the floating-point 4x4 inverse-bind
     * matrices.
     */
    inverseBindMatrices: string;
    /**
     * Joint names of the joints (nodes with a `jointName` property) in this
     * skin. The array length is the same as the `count` property of the
     * `inverseBindMatrices` accessor, and the same as the total quantity of all
     * skeleton nodes from node-trees referenced by the skinned mesh instance
     * node's `skeletons` array.
     */
    jointNames: string[];
  }
  /**
   * A template for material appearances.
   */
  export interface Technique extends Gltf1.ChildOfRootProperty {
    /**
     * A dictionary object of technique.parameters objects. Each parameter
     * defines an attribute or uniform input, and an optional semantic and
     * value.
     *
     * @default {}
     */
    parameters?: Record<string, Gltf1.Technique.Parameters>;
    /**
     * A dictionary object of strings that maps GLSL attribute names to
     * technique parameter IDs.
     *
     * @default {}
     */
    attributes?: Record<string, string>;
    /**
     * The ID of the program.
     */
    program: string;
    /**
     * A dictionary object of strings that maps GLSL uniform names to technique
     * parameter IDs.
     *
     * @default {}
     */
    uniforms?: Record<string, string>;
    /**
     * Fixed-function rendering states.
     *
     * @default {}
     */
    states?: Gltf1.Technique.States;
  }
  export namespace Technique {
    /**
     * An attribute or uniform input to a technique, and an optional semantic
     * and value.
     */
    export interface Parameters extends Gltf1.Property {
      /**
       * When defined, the parameter is an array of count elements of the
       * specified type. Otherwise, the parameter is not an array. When defined,
       * `value` is an array with length equal to count, times the number of
       * components in the type, e.g., `3` for `FLOAT_VEC3`. An array parameter
       * of scalar values is not the same as a vector parameter of the same
       * size; for example, when count is 2 and type is 5126 (FLOAT), the
       * parameter is an array of two floating-point values, not a FLOAT_VEC2.
       */
      count?: number;
      /**
       * The id of the node whose transform is used as the parameter's value.
       * When this is defined, `type` must be `35676` (FLOAT_MAT4), therefore,
       * when the semantic is "MODELINVERSETRANSPOSE",
       * "MODELVIEWINVERSETRANSPOSE", or "VIEWPORT", the node property can't be
       * defined.
       */
      node?: string;
      /**
       * The datatype. All valid values correspond to WebGL enums.
       *
       * Allowed values:
       *
       * - `5120`: BYTE
       * - `5121`: UNSIGNED_BYTE
       * - `5122`: SHORT
       * - `5123`: UNSIGNED_SHORT
       * - `5124`: INT
       * - `5125`: UNSIGNED_INT
       * - `5126`: FLOAT
       * - `35664`: FLOAT_VEC2
       * - `35665`: FLOAT_VEC3
       * - `35666`: FLOAT_VEC4
       * - `35667`: INT_VEC2
       * - `35668`: INT_VEC3
       * - `35669`: INT_VEC4
       * - `35670`: BOOL
       * - `35671`: BOOL_VEC2
       * - `35672`: BOOL_VEC3
       * - `35673`: BOOL_VEC4
       * - `35674`: FLOAT_MAT2
       * - `35675`: FLOAT_MAT3
       * - `35676`: FLOAT_MAT4
       * - `35678`: SAMPLER_2D
       */
      type:
        | 5120
        | 5121
        | 5122
        | 5123
        | 5124
        | 5125
        | 5126
        | 35664
        | 35665
        | 35666
        | 35667
        | 35668
        | 35669
        | 35670
        | 35671
        | 35672
        | 35673
        | 35674
        | 35675
        | 35676
        | 35678;
      /**
       * Identifies a parameter with a well-known meaning. Uniform semantics
       * include `"LOCAL"` (FLOAT_MAT4), `"MODEL"` (FLOAT_MAT4), `"VIEW"`
       * (FLOAT_MAT4), `"PROJECTION"` (FLOAT_MAT4), `"MODELVIEW"` (FLOAT_MAT4),
       * `"MODELVIEWPROJECTION"` (FLOAT_MAT4), `"MODELINVERSE"` (FLOAT_MAT4),
       * `"VIEWINVERSE"` (FLOAT_MAT4), `"PROJECTIONINVERSE"` (FLOAT_MAT4),
       * `"MODELVIEWINVERSE"` (FLOAT_MAT4), `"MODELVIEWPROJECTIONINVERSE"`
       * (FLOAT_MAT4), `"MODELINVERSETRANSPOSE"` (FLOAT_MAT3),
       * `"MODELVIEWINVERSETRANSPOSE"` (FLOAT_MAT3), `"VIEWPORT"` (FLOAT_VEC4),
       * `"JOINTMATRIX"` (FLOAT_MAT4). Attribute semantics include `"POSITION"`,
       * `"NORMAL"`, `"TEXCOORD"`, `"COLOR"`, `"JOINT"`, and `"WEIGHT"`.
       * Attribute semantic property names can be of the form
       * `[semantic]_[set_index]`, e.g., `"TEXCOORD_0"`.
       */
      semantic?: string;
      /**
       * The value of the parameter. A material value with the same name, when
       * specified, overrides this value.
       */
      value?: number | boolean | string | (number | boolean | string)[];
    }
    /**
     * Fixed-function rendering states.
     */
    export interface States extends Gltf1.Property {
      /**
       * WebGL states to enable. States not in the array are disabled. All valid
       * values correspond to WebGL enums.
       *
       * Allowed values for each element:
       *
       * - `3042`: BLEND
       * - `2884`: CULL_FACE
       * - `2929`: DEPTH_TEST
       * - `32823`: POLYGON_OFFSET_FILL
       * - `32926`: SAMPLE_ALPHA_TO_COVERAGE
       * - `3089`: SCISSOR_TEST
       *
       * @default []
       */
      enable?: (3042 | 2884 | 2929 | 32823 | 32926 | 3089)[];
      /**
       * Arguments for fixed-function rendering state functions other than
       * `enable()`/`disable()`.
       */
      functions?: Gltf1.Technique.States.Functions;
    }
    export namespace States {
      /**
       * Arguments for fixed-function rendering state functions other than
       * `enable()`/`disable()`.
       */
      export interface Functions extends Gltf1.Property {
        /**
         * Floating-point values passed to `blendColor()`. [red, green, blue,
         * alpha]
         *
         * @default [0,0,0,0]
         */
        blendColor?: [number, number, number, number];
        /**
         * Integer values passed to `blendEquationSeparate()`. [rgb, alpha]. All
         * valid values correspond to WebGL enums.
         *
         * Allowed values for each element:
         *
         * - `32774`: FUNC_ADD
         * - `32778`: FUNC_SUBTRACT
         * - `32779`: FUNC_REVERSE_SUBTRACT
         *
         * @default [32774,32774]
         */
        blendEquationSeparate?: (32774 | 32778 | 32779)[];
        /**
         * Integer values passed to `blendFuncSeparate()`. [srcRGB, dstRGB,
         * srcAlpha, dstAlpha]. All valid values correspond to WebGL enums.
         *
         * Allowed values for each element:
         *
         * - `0`: ZERO
         * - `1`: ONE
         * - `768`: SRC_COLOR
         * - `769`: ONE_MINUS_SRC_COLOR
         * - `774`: DST_COLOR
         * - `775`: ONE_MINUS_DST_COLOR
         * - `770`: SRC_ALPHA
         * - `771`: ONE_MINUS_SRC_ALPHA
         * - `772`: DST_ALPHA
         * - `773`: ONE_MINUS_DST_ALPHA
         * - `32769`: CONSTANT_COLOR
         * - `32770`: ONE_MINUS_CONSTANT_COLOR
         * - `32771`: CONSTANT_ALPHA
         * - `32772`: ONE_MINUS_CONSTANT_ALPHA
         * - `776`: SRC_ALPHA_SATURATE
         *
         * @default [1,0,1,0]
         */
        blendFuncSeparate?: (
          | 0
          | 1
          | 768
          | 769
          | 774
          | 775
          | 770
          | 771
          | 772
          | 773
          | 32769
          | 32770
          | 32771
          | 32772
          | 776
        )[];
        /**
         * Boolean values passed to `colorMask()`. [red, green, blue, alpha].
         *
         * @default [true,true,true,true]
         */
        colorMask?: [boolean, boolean, boolean, boolean];
        /**
         * Integer value passed to `cullFace()`. All valid values correspond to
         * WebGL enums.
         *
         * Allowed values for each element:
         *
         * - `1028`: FRONT
         * - `1029`: BACK
         * - `1032`: FRONT_AND_BACK
         *
         * @default [1029]
         */
        cullFace?: (1028 | 1029 | 1032)[];
        /**
         * Integer values passed to `depthFunc()`. All valid values correspond
         * to WebGL enums.
         *
         * Allowed values for each element:
         *
         * - `512`: NEVER
         * - `513`: LESS
         * - `515`: LEQUAL
         * - `514`: EQUAL
         * - `516`: GREATER
         * - `517`: NOTEQUAL
         * - `518`: GEQUAL
         * - `519`: ALWAYS
         *
         * @default [513]
         */
        depthFunc?: (512 | 513 | 515 | 514 | 516 | 517 | 518 | 519)[];
        /**
         * Boolean value passed to `depthMask()`.
         *
         * @default [true]
         */
        depthMask?: [boolean];
        /**
         * Floating-point values passed to `depthRange()`. [zNear, zFar]
         *
         * @default [0,1]
         */
        depthRange?: [number, number];
        /**
         * Integer value passed to `frontFace()`. All valid values correspond to
         * WebGL enums.
         *
         * Allowed values for each element:
         *
         * - `2304`: CW
         * - `2305`: CCW
         *
         * @default [2305]
         */
        frontFace?: (2304 | 2305)[];
        /**
         * Floating-point value passed to `lineWidth()`.
         *
         * @default [1]
         */
        lineWidth?: [number];
        /**
         * Floating-point value passed to `polygonOffset()`. [factor, units]
         *
         * @default [0,0]
         */
        polygonOffset?: [number, number];
        /**
         * Floating-point value passed to `scissor()`. [x, y, width, height].
         * The default is the dimensions of the canvas when the WebGL context is
         * created. width and height must be greater than zero.
         *
         * @default [0,0,0,0]
         */
        scissor?: [number, number, number, number];
      }
    }
  }
  /**
   * A texture and its sampler.
   */
  export interface Texture extends Gltf1.ChildOfRootProperty {
    /**
     * The texture's format. Valid values correspond to WebGL enums: `6406`
     * (ALPHA), `6407` (RGB), `6408` (RGBA), `6409` (LUMINANCE), and `6410`
     * (LUMINANCE_ALPHA).
     *
     * Allowed values:
     *
     * - `6406`: ALPHA
     * - `6407`: RGB
     * - `6408`: RGBA
     * - `6409`: LUMINANCE
     * - `6410`: LUMINANCE_ALPHA
     *
     * @default 6408
     */
    format?: 6406 | 6407 | 6408 | 6409 | 6410;
    /**
     * The texture's internal format. Valid values correspond to WebGL enums:
     * `6406` (ALPHA), `6407` (RGB), `6408` (RGBA), `6409` (LUMINANCE), and
     * `6410` (LUMINANCE_ALPHA). Defaults to same value as format.
     *
     * Allowed values:
     *
     * - `6406`: ALPHA
     * - `6407`: RGB
     * - `6408`: RGBA
     * - `6409`: LUMINANCE
     * - `6410`: LUMINANCE_ALPHA
     *
     * @default 6408
     */
    internalFormat?: 6406 | 6407 | 6408 | 6409 | 6410;
    /**
     * The ID of the sampler used by this texture.
     */
    sampler: string;
    /**
     * The ID of the image used by this texture.
     */
    source: string;
    /**
     * The target that the WebGL texture should be bound to. Valid values
     * correspond to WebGL enums: `3553` (TEXTURE_2D).
     *
     * Allowed values:
     *
     * - `3553`: TEXTURE_2D
     *
     * @default 3553
     */
    target?: 3553;
    /**
     * Texel datatype. Valid values correspond to WebGL enums: `5121`
     * (UNSIGNED_BYTE), `33635` (UNSIGNED_SHORT_5_6_5), `32819`
     * (UNSIGNED_SHORT_4_4_4_4), and `32820` (UNSIGNED_SHORT_5_5_5_1).
     *
     * Allowed values:
     *
     * - `5121`: UNSIGNED_BYTE
     * - `33635`: UNSIGNED_SHORT_5_6_5
     * - `32819`: UNSIGNED_SHORT_4_4_4_4
     * - `32820`: UNSIGNED_SHORT_5_5_5_1
     *
     * @default 5121
     */
    type?: 5121 | 33635 | 32819 | 32820;
  }
}
