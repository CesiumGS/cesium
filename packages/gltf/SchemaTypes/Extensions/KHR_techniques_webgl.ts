// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Archived/KHR_techniques_webgl/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_techniques_webgl {
  /**
   * Instances of shading techniques with external shader programs along with
   * their parameterized values. Shading techniques describe data types and
   * semantics for GLSL vertex and fragment shader programs.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * An array of `Program` objects.
     */
    programs: KHR_techniques_webgl.Program[];
    /**
     * An array of `Shader` objects.
     */
    shaders: KHR_techniques_webgl.Shader[];
    /**
     * An array of `Technique` objects. A technique is a template for a material
     * appearance.
     */
    techniques: KHR_techniques_webgl.Technique[];
  }
  /**
   * The technique to use for a material and any additional uniform values.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The index of the technique.
     */
    technique: number;
    /**
     * Dictionary object of uniform values. Uniforms with the same name as the
     * technique's uniform must conform to the referenced `type` and `count` (if
     * present) properties, and override the technique's uniform value. A
     * uniform value must be supplied here if not present in the technique
     * uniforms.
     *
     * @default {}
     */
    values?: Record<
      string,
      number | boolean | number[] | boolean[] | Gltf2.Material.TextureInfo
    >;
  }
  /**
   * A shader program, including its vertex and fragment shaders.
   */
  export interface Program extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the fragment shader.
     */
    fragmentShader: number;
    /**
     * The index of the vertex shader.
     */
    vertexShader: number;
    /**
     * The names of required WebGL 1.0 extensions.
     */
    glExtensions?: string[];
  }
  /**
   * A vertex or fragment shader. Exactly one of `uri` or `bufferView` must be
   * provided for the GLSL source.
   */
  export interface Shader extends Gltf2.ChildOfRootProperty {
    /**
     * The uri of the GLSL source. Relative paths are relative to the `.gltf`
     * file. Instead of referencing an external file, the uri can also be a
     * data-uri.
     */
    uri?: string;
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
     * The index of the bufferView that contains the GLSL shader source. Use
     * this instead of the shader's uri property.
     */
    bufferView?: number;
  }
  /**
   * A template for material appearances.
   */
  export interface Technique extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the program.
     */
    program: number;
    /**
     * A dictionary object of `Attribute` objects. Each object defines an
     * attribute input with a type and a semantic.
     */
    attributes?: Record<string, KHR_techniques_webgl.Technique.Attribute>;
    /**
     * A dictionary object of `Uniform` objects. Each object defines a uniform
     * input with a type and an optional semantic and value.
     */
    uniforms?: Record<string, KHR_techniques_webgl.Technique.Uniform>;
  }
  export namespace Technique {
    /**
     * An attribute input to a technique and the corresponding semantic.
     */
    export interface Attribute extends Gltf2.Property {
      /**
       * Identifies a mesh attribute semantic. Attribute semantics include
       * `"POSITION"`, `"NORMAL"`, `"TEXCOORD"`, `"COLOR"`, `"JOINT"`, and
       * `"WEIGHT"`. `"TEXCOORD"` and `"COLOR"` attribute semantic property
       * names must be of the form `[semantic]_[set_index]`, e.g.,
       * `"TEXCOORD_0"`, `"TEXCOORD_1"`, `"COLOR_1"`, etc. For
       * forward-compatibility, application-specific semantics must start with
       * an underscore, e.g., `"_SIMULATION_TIME"`.
       */
      semantic: string;
    }
    /**
     * A uniform input to a technique, and an optional semantic and value.
     */
    export interface Uniform extends Gltf2.Property {
      /**
       * When defined, the uniform is an array of `count` elements of the
       * specified type. Otherwise, the uniform is not an array. When defined,
       * `value`'s length must equal `count`, times the number of components in
       * the `type`, e.g., `3` for `FLOAT_VEC3`. A uniform array of scalar
       * values is not the same as a uniform vector of the same size; for
       * example, when count is 2 and type is `5126` (`FLOAT`), the uniform is
       * an array of two floating-point values, not a `FLOAT_VEC2`. When a
       * glTF-defined semantic is used, the semantic must be `JOINTMATRIX`;
       * application-specific uniforms can be arrays and, therefore, define
       * `count`.
       */
      count?: number;
      /**
       * The index of the node whose transform is used as the uniform's value.
       * When this is defined, `type` must be `35676` (`FLOAT_MAT4`), therefore,
       * when the semantic is `"MODELINVERSETRANSPOSE"`,
       * `"MODELVIEWINVERSETRANSPOSE"`, or `"VIEWPORT"`, the node property can't
       * be defined.
       */
      node?: number;
      /**
       * The uniform type. All valid values correspond to WebGL enums.
       *
       * Allowed values:
       *
       * - `5124`: INT
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
        | 5124
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
       * Identifies a uniform with a well-known meaning. Uniform semantics
       * include `"LOCAL"` (FLOAT_MAT4), `"MODEL"` (FLOAT_MAT4), `"VIEW"`
       * (FLOAT_MAT4), `"PROJECTION"` (FLOAT_MAT4), `"MODELVIEW"` (FLOAT_MAT4),
       * `"MODELVIEWPROJECTION"` (FLOAT_MAT4), `"MODELINVERSE"` (FLOAT_MAT4),
       * `"VIEWINVERSE"` (FLOAT_MAT4), `"PROJECTIONINVERSE"` (FLOAT_MAT4),
       * `"MODELVIEWINVERSE"` (FLOAT_MAT4), `"MODELVIEWPROJECTIONINVERSE"`
       * (FLOAT_MAT4), `"MODELINVERSETRANSPOSE"` (FLOAT_MAT3),
       * `"MODELVIEWINVERSETRANSPOSE"` (FLOAT_MAT3), `"VIEWPORT"` (FLOAT_VEC4),
       * `"JOINTMATRIX"` (FLOAT_MAT4[]). For forward-compatibility,
       * application-specific semantics must start with an underscore, e.g.,
       * `"_SIMULATION_TIME"`.
       */
      semantic?: string;
      /**
       * The value of the uniform. The length is determined by the values of the
       * `type` and `count` (if present) properties. A material uniform value
       * with the same name, when specified, overrides this value.
       */
      value?:
        number | boolean | number[] | boolean[] | Gltf2.Material.TextureInfo;
    }
  }
}
