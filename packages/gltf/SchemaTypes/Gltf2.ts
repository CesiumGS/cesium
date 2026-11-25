// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/specification/2.0/schema
//   https://github.com/KhronosGroup/glTF/tree/c330f9e5a324c9858145be183d2a1e63718fd3e8/specification/2.1/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

/**
 * The root object for a glTF asset.
 *
 * @internal
 */
export interface Gltf2 extends Gltf2.Property {
  /**
   * An array of accessors.
   */
  accessors?: Gltf2.Accessor[];
  /**
   * An array of animations.
   */
  animations?: Gltf2.Animation[];
  /**
   * Metadata about the glTF asset.
   */
  asset: Gltf2.Asset;
  /**
   * An array of buffer views.
   */
  bufferViews?: Gltf2.BufferView[];
  /**
   * An array of buffers.
   */
  buffers?: Gltf2.Buffer[];
  /**
   * An array of cameras.
   */
  cameras?: Gltf2.Camera[];
  /**
   * Names of glTF extensions required to properly load the asset.
   */
  extensionsRequired?: string[];
  /**
   * Names of glTF extensions used in the asset.
   */
  extensionsUsed?: string[];
  /**
   * An array of external assets. (glTF 2.1)
   */
  externalAssets?: Gltf2.ExternalAsset[];
  /**
   * An array of file references. (glTF 2.1)
   */
  files?: Gltf2.File[];
  /**
   * An array of images.
   */
  images?: Gltf2.Image[];
  /**
   * An array of materials.
   */
  materials?: Gltf2.Material[];
  /**
   * An array of meshes.
   */
  meshes?: Gltf2.Mesh[];
  /**
   * An array of nodes.
   */
  nodes?: Gltf2.Node[];
  /**
   * An array of samplers.
   */
  samplers?: Gltf2.Sampler[];
  /**
   * The index of the default scene.
   */
  scene?: number;
  /**
   * An array of scenes.
   */
  scenes?: Gltf2.Scene[];
  /**
   * An array of shapes. (glTF 2.1)
   */
  shapes?: Gltf2.Shape[];
  /**
   * An array of skins.
   */
  skins?: Gltf2.Skin[];
  /**
   * An array of textures.
   */
  textures?: Gltf2.Texture[];
  /**
   * A dictionary mapping file-unique IDs to objects that contain a JSON
   * pointer. (glTF 2.1)
   */
  uniqueIds?: Record<
    string,
    Gltf2.Property & {
      /**
       * JSON pointer to an existing element within the same glTF asset.
       */
      pointer: string;
    }
  >;
}
/** @internal */
export namespace Gltf2 {
  /**
   * Descriptor of a finite non-empty sequence of typed values usually sourced
   * from a buffer view.
   */
  export interface Accessor extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the buffer view. When undefined, elements are sourced from
     * an infinite sequence of zero bytes or provided by an extension.
     */
    bufferView?: number;
    /**
     * The offset into the buffer view in bytes.
     *
     * @default 0
     */
    byteOffset?: number;
    /**
     * The data type of the accessor's components.
     *
     * Allowed values:
     *
     * - `5120`: 8-bit signed integer (sint8) or 8-bit signed normalized integer
     *   (snorm8).
     * - `5121`: 8-bit unsigned integer (uint8) or 8-bit unsigned normalized
     *   integer (unorm8).
     * - `5122`: 16-bit signed integer (sint16) or 16-bit signed normalized
     *   integer (snorm16).
     * - `5123`: 16-bit unsigned integer (uint16) or 16-bit unsigned normalized
     *   integer (unorm16).
     * - `5124`: 32-bit signed integer (sint32). (glTF 2.1)
     * - `5125`: 32-bit unsigned integer (uint32).
     * - `5126`: 32-bit floating-point number (float32) in IEEE 754
     *   single-precision format (binary32).
     * - `5130`: 64-bit floating-point number (float64) in IEEE 754
     *   double-precision format (binary64). (glTF 2.1)
     * - `5131`: 16-bit floating-point number (float16) in IEEE 754
     *   half-precision format (binary16). (glTF 2.1)
     * - `5134`: 64-bit signed integer (sint64). (glTF 2.1)
     * - `5135`: 64-bit unsigned integer (uint64). (glTF 2.1)
     */
    componentType: number;
    /**
     * The number of elements provided by the accessor.
     */
    count: number;
    /**
     * Maximum value of each component as provided by the accessor. Array length
     * corresponds to the accessor's type.
     */
    max?: number[];
    /**
     * Minimum value of each component as provided by the accessor. Array length
     * corresponds to the accessor's type.
     */
    min?: number[];
    /**
     * Specifies whether integer values are normalized (divided by the component
     * type's maximum possible value) before usage.
     *
     * @default false
     */
    normalized?: boolean;
    /**
     * The descriptor of sparsely-encoded accessor elements.
     */
    sparse?: Gltf2.Accessor.Sparse;
    /**
     * The dimensionality of the accessor elements.
     *
     * Allowed values:
     *
     * - `"SCALAR"`: Scalar
     * - `"VEC2"`: Two-component Vector
     * - `"VEC3"`: Three-component Vector
     * - `"VEC4"`: Four-component Vector
     * - `"MAT2"`: 2x2 Matrix
     * - `"MAT3"`: 3x3 Matrix
     * - `"MAT4"`: 4x4 Matrix
     */
    type: string;
  }
  export namespace Accessor {
    /**
     * The descriptor of sparsely-encoded accessor elements.
     */
    export interface Sparse extends Gltf2.Property {
      /**
       * The number of replaced accessor elements.
       */
      count: number;
      /**
       * The descriptor of the indices of replaced accessor elements.
       */
      indices: Gltf2.Accessor.Sparse.Indices;
      /**
       * The descriptor of the source of replacement elements.
       */
      values: Gltf2.Accessor.Sparse.Values;
    }
    export namespace Sparse {
      /**
       * The descriptor of the indices of replaced accessor elements.
       */
      export interface Indices extends Gltf2.Property {
        /**
         * The index of the buffer view containing the indices of the replaced
         * elements.
         */
        bufferView: number;
        /**
         * The offset into the buffer view in bytes.
         *
         * @default 0
         */
        byteOffset?: number;
        /**
         * The data type of the indices of the replaced elements.
         *
         * Allowed values:
         *
         * - `5121`: 8-bit unsigned integer (uint8).
         * - `5123`: 16-bit unsigned integer (uint16).
         * - `5125`: 32-bit unsigned integer (uint32).
         */
        componentType: number;
      }
      /**
       * The descriptor of the source of replacement elements.
       */
      export interface Values extends Gltf2.Property {
        /**
         * The index of the buffer view containing replacement accessor
         * elements.
         */
        bufferView: number;
        /**
         * The offset into the buffer view in bytes.
         *
         * @default 0
         */
        byteOffset?: number;
      }
    }
  }
  /**
   * Descriptors of the animated properties (channels) and their keyframe data
   * (samplers).
   */
  export interface Animation extends Gltf2.ChildOfRootProperty {
    /**
     * An array of animation channels.
     */
    channels: Gltf2.Animation.Channel[];
    /**
     * An array of animation samplers.
     */
    samplers: Gltf2.Animation.Sampler[];
  }
  export namespace Animation {
    /**
     * The descriptor of the animated property combined with the sampler
     * providing its keyframe data.
     */
    export interface Channel extends Gltf2.Property {
      /**
       * The index of the animation sampler.
       */
      sampler: number;
      /**
       * The descriptor of the animated property.
       */
      target: Gltf2.Animation.Channel.Target;
    }
    export namespace Channel {
      /**
       * The descriptor of the animated property.
       */
      export interface Target extends Gltf2.Property {
        /**
         * The index of the node containing the animated property. When
         * undefined, the target is defined by other means.
         */
        node?: number;
        /**
         * The identifier of the animated property, such as the property name.
         *
         * Allowed values:
         *
         * - `"rotation"`: Rotation
         * - `"scale"`: Scale
         * - `"translation"`: Translation
         * - `"weights"`: Weights
         */
        path: string;
      }
    }
    /**
     * Combination of timestamps, keyframe data, and the interpolation mode.
     */
    export interface Sampler extends Gltf2.Property {
      /**
       * The index of the accessor providing keyframe timestamps.
       */
      input: number;
      /**
       * Interpolation mode used to compute animated property values between
       * keyframes.
       *
       * Allowed values:
       *
       * - `"CUBICSPLINE"`: Values between the keyframes are interpolated using
       *   Hermite cubic splines.
       * - `"LINEAR"`: Values between the keyframes are interpolated linearly.
       *   Rotation values use spherical linear interpolation.
       * - `"STEP"`: Values between the keyframes are equal to the output of the
       *   last played keyframe.
       *
       * @default "LINEAR"
       */
      interpolation?: string;
      /**
       * The index of the accessor providing keyframe property values and
       * additional values as needed by the interpolation mode.
       */
      output: number;
    }
  }
  /**
   * Metadata about the glTF asset.
   */
  export interface Asset extends Gltf2.Property {
    /**
     * The copyright message suitable for display to credit the content creator.
     */
    copyright?: string;
    /**
     * The tool used to generate the asset.
     */
    generator?: string;
    /**
     * The minimum glTF version that the asset targets.
     */
    minVersion?: string;
    /**
     * The index of the image in the `images` array to use as a thumbnail for
     * this asset. The image **SHOULD** be a common, widely-supported format,
     * but **MAY** have any media type. (glTF 2.1)
     */
    thumbnail?: number;
    /**
     * The glTF version that the asset targets.
     */
    version: string;
  }
  /**
   * Reference to a binary buffer resource.
   */
  export interface Buffer extends Gltf2.ChildOfRootProperty {
    /**
     * The length of the buffer in bytes.
     */
    byteLength: number;
    /**
     * The index of the chunk that contains the buffer data. If neither `chunk`
     * nor `uri` is defined on buffer 0, then buffer 0 implicitly refers to
     * chunk 1. There is no default chunk index for other buffers. (glTF 2.1)
     */
    chunk?: number;
    /**
     * The identifier used to retrieve the buffer data.
     */
    uri?: string;
  }
  /**
   * A span of bytes in a buffer.
   */
  export interface BufferView extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the buffer.
     */
    buffer: number;
    /**
     * The length of the buffer view in bytes.
     */
    byteLength: number;
    /**
     * The offset into the buffer in bytes.
     *
     * @default 0
     */
    byteOffset?: number;
    /**
     * The stride, in bytes, between consecutive vertex attribute values.
     */
    byteStride?: number;
    /**
     * The optional hint specifying buffer view usage.
     *
     * Allowed values:
     *
     * - `34962`: The buffer view is used for vertex attributes.
     * - `34963`: The buffer view is used for vertex indices.
     */
    target?: number;
  }
  /**
   * Camera's parameters.
   */
  export interface Camera extends Gltf2.ChildOfRootProperty {
    /**
     * Orthographic projection parameters.
     */
    orthographic?: Gltf2.Camera.Orthographic;
    /**
     * Perspective projection parameters.
     */
    perspective?: Gltf2.Camera.Perspective;
    /**
     * The projection type.
     *
     * Allowed values:
     *
     * - `"orthographic"`: Orthographic
     * - `"perspective"`: Perspective
     */
    type: string;
  }
  export namespace Camera {
    /**
     * Orthographic projection parameters.
     */
    export interface Orthographic extends Gltf2.Property {
      /**
       * Horizontal magnification of the view.
       */
      xmag: number;
      /**
       * The vertical magnification of the view.
       */
      ymag: number;
      /**
       * The distance to the far clipping plane.
       */
      zfar: number;
      /**
       * The distance to the near clipping plane.
       */
      znear: number;
    }
    /**
     * Perspective projection parameters.
     */
    export interface Perspective extends Gltf2.Property {
      /**
       * The floating-point aspect ratio of the field of view. When undefined,
       * the camera uses the viewport's aspect ratio.
       */
      aspectRatio?: number;
      /**
       * The vertical field of view in radians.
       */
      yfov: number;
      /**
       * The distance to the far clipping plane. When undefined, the far
       * clipping plane is at infinity.
       */
      zfar?: number;
      /**
       * The floating-point distance to the near clipping plane.
       */
      znear: number;
    }
  }
  /**
   * An external asset that references a file in the `files` array and may be
   * instantiated by any node. (glTF 2.1)
   */
  export interface ExternalAsset extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the file reference in the top-level `files` array used for
     * this external asset.
     */
    file: number;
  }
  /**
   * A reference to an external file. Files **MAY** be referenced by a URI (or
   * IRI) or a buffer view index. (glTF 2.1)
   */
  export interface File extends Gltf2.ChildOfRootProperty {
    /**
     * An array of aliases used for files within this external file. Aliases
     * allow overriding inner file URIs.
     */
    aliases?: Gltf2.File.Alias[];
    /**
     * The index of the bufferView that contains the file data. This field
     * **MUST NOT** be defined when `uri` is defined.
     */
    bufferView?: number;
    /**
     * The media type or MIME type of the external file. This field is required
     * and **MUST** always be defined.
     *
     * Allowed values:
     *
     * - `"model/gltf+json"`
     * - `"model/gltf-binary"`
     */
    mimeType: string;
    /**
     * The URI (or IRI) of the external file. Relative paths are relative to the
     * current glTF asset. Instead of referencing an external file, this field
     * **MAY** contain a `data:`-URI. This field **MUST NOT** be defined when
     * `bufferView` is defined.
     */
    uri?: string;
  }
  export namespace File {
    /**
     * Used to alias files referenced within an external file to other paths by
     * the parent. (glTF 2.1)
     */
    export interface Alias extends Gltf2.Property {
      /**
       * String alias matched against an inner path.
       */
      alias: string;
      /**
       * The index of the file in the files array.
       */
      file: number;
    }
  }
  /**
   * Common type for all glTF JSON objects that are elements of top-level
   * arrays.
   */
  export interface ChildOfRootProperty extends Gltf2.Property {
    /**
     * The user-defined object name.
     */
    name?: string;
  }
  /**
   * Common type for all glTF JSON objects that are not used as plain JSON
   * objects.
   */
  export interface Property {
    /**
     * JSON object with extension objects. Property names correspond to glTF
     * extension names and property values are extension-specific objects.
     */
    extensions?: Record<string, object>;
    /**
     * Application-specific data usually stored as a JSON object.
     */
    extras?: unknown;
  }
  /**
   * Reference to an image resource.
   */
  export interface Image extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the buffer view that contains the image data. Not applicable
     * to images sourced from IRIs.
     */
    bufferView?: number;
    /**
     * The media type of the image. Required when the image is sourced from a
     * buffer view.
     *
     * Allowed values:
     *
     * - `"image/jpeg"`: JPEG
     * - `"image/png"`: PNG
     */
    mimeType?: string;
    /**
     * The identifier used to retrieve the image data. Not applicable to images
     * sourced from buffer views.
     */
    uri?: string;
  }
  /**
   * The material parameters.
   */
  export interface Material extends Gltf2.ChildOfRootProperty {
    /**
     * The alpha cutoff value. Applies only when the alpha rendering mode is
     * Mask.
     *
     * @default 0.5
     */
    alphaCutoff?: number;
    /**
     * The alpha rendering mode.
     *
     * Allowed values:
     *
     * - `"BLEND"`: The alpha value is used to composite the source and
     *   destination areas. The rendered output is combined with the background
     *   using the alpha over operator.
     * - `"MASK"`: If the alpha value is greater than or equal to the alpha
     *   cutoff value, the material is rendered as fully opaque; otherwise, it
     *   is rendered as fully transparent.
     * - `"OPAQUE"`: The alpha value is ignored, and the rendered output is
     *   fully opaque.
     *
     * @default "OPAQUE"
     */
    alphaMode?: string;
    /**
     * Specifies whether the material is double sided.
     *
     * @default false
     */
    doubleSided?: boolean;
    /**
     * The linear factors for the emissive color of the material.
     *
     * @default [0,0,0]
     */
    emissiveFactor?: [number, number, number];
    /**
     * The emissive texture binding object.
     */
    emissiveTexture?: Gltf2.Material.TextureInfo;
    /**
     * The tangent-space normal texture binding object.
     */
    normalTexture?: Gltf2.Material.NormalTextureInfo;
    /**
     * The occlusion texture binding object.
     */
    occlusionTexture?: Gltf2.Material.OcclusionTextureInfo;
    /**
     * A set of parameter values that are used to define the metallic-roughness
     * material model from Physically-Based Rendering (PBR) methodology.
     *
     * @default {}
     */
    pbrMetallicRoughness?: Gltf2.Material.PbrMetallicRoughness;
  }
  export namespace Material {
    /**
     * Tangent-space normal texture index, its scale, and the index of the
     * associated texture coordinate set.
     */
    export interface NormalTextureInfo extends Gltf2.Material.TextureInfo {
      /**
       * The scalar parameter applied to each normal vector of the texture. This
       * value scales the normal vector in X and Y directions after it is
       * reconstructed from the texture's RGB values.
       *
       * @default 1
       */
      scale?: number;
    }
    /**
     * Occlusion texture index, its strength, and the index of the associated
     * texture coordinate set.
     */
    export interface OcclusionTextureInfo extends Gltf2.Material.TextureInfo {
      /**
       * A scalar parameter controlling the amount of occlusion applied. A value
       * of zero means no occlusion; a value of one means the occlusion value
       * sampled from the occlusion texture; intermediate values interpolate the
       * occlusion linearly.
       *
       * @default 1
       */
      strength?: number;
    }
    /**
     * A set of parameter values that are used to define the metallic-roughness
     * material model from Physically-Based Rendering (PBR) methodology.
     */
    export interface PbrMetallicRoughness extends Gltf2.Property {
      /**
       * The linear factors for the base color of the material.
       *
       * @default [1,1,1,1]
       */
      baseColorFactor?: [number, number, number, number];
      /**
       * The base color texture binding object.
       */
      baseColorTexture?: Gltf2.Material.TextureInfo;
      /**
       * The linear factor for the metalness of the material.
       *
       * @default 1
       */
      metallicFactor?: number;
      /**
       * The metallic-roughness texture binding object.
       */
      metallicRoughnessTexture?: Gltf2.Material.TextureInfo;
      /**
       * The linear factor for the roughness of the material.
       *
       * @default 1
       */
      roughnessFactor?: number;
    }
    /**
     * Texture index and the index of the associated texture coordinate set.
     */
    export interface TextureInfo extends Gltf2.Property {
      /**
       * The index of the texture.
       */
      index: number;
      /**
       * The index of the texture coordinate set.
       *
       * @default 0
       */
      texCoord?: number;
    }
  }
  /**
   * Mesh primitives to instantiate.
   */
  export interface Mesh extends Gltf2.ChildOfRootProperty {
    /**
     * An array of mesh primitives.
     */
    primitives: Gltf2.Mesh.Primitive[];
    /**
     * Default morph target weights. The number of array elements matches the
     * number of morph targets of the mesh.
     */
    weights?: number[];
  }
  export namespace Mesh {
    /**
     * Geometry to be rendered with the given material.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * A JSON object that maps attribute semantic names to the indices of
       * accessors providing the corresponding data.
       */
      attributes: Record<string, number>;
      /**
       * The index of the accessor that provides the vertex indices. When
       * undefined, the mesh primitive uses non-indexed geometry.
       */
      indices?: number;
      /**
       * The index of the material to apply to the mesh primitive.
       */
      material?: number;
      /**
       * The topology type of the mesh primitive.
       *
       * Allowed values:
       *
       * - `0`: Point List
       * - `1`: Line List
       * - `2`: Line Loop
       * - `3`: Line Strip
       * - `4`: Triangle List
       * - `5`: Triangle Strip
       * - `6`: Triangle Fan
       *
       * @default 4
       */
      mode?: number;
      /**
       * An array of morph targets.
       */
      targets?: Record<string, number>[];
    }
  }
  /**
   * A node in the node hierarchy.
   */
  export interface Node extends Gltf2.ChildOfRootProperty {
    /**
     * The bounding volume of the node. (glTF 2.1)
     */
    boundingVolume?: Gltf2.Node.BoundingVolume;
    /**
     * The index of the camera.
     */
    camera?: number;
    /**
     * The indices of the node's children.
     */
    children?: number[];
    /**
     * The index of the external asset in this node. Cannot be used together
     * with `mesh`. (glTF 2.1)
     */
    externalAsset?: number;
    /**
     * A 4x4 transformation matrix stored in column-major order.
     *
     * @default [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
     */
    matrix?: number[];
    /**
     * The index of the mesh.
     */
    mesh?: number;
    /**
     * The node's unit quaternion rotation in the order (x, y, z, w), where w is
     * the scalar.
     *
     * @default [0,0,0,1]
     */
    rotation?: [number, number, number, number];
    /**
     * The node's non-uniform scale, given as the scaling factors along the x,
     * y, and z axes.
     *
     * @default [1,1,1]
     */
    scale?: [number, number, number];
    /**
     * The index of the skin to use for instantiating a mesh.
     */
    skin?: number;
    /**
     * The node's translation along the x, y, and z axes.
     *
     * @default [0,0,0]
     */
    translation?: [number, number, number];
    /**
     * The weights to use for instantiating mesh primitives with morph targets.
     * The number of array elements matches the number of morph targets of the
     * mesh.
     */
    weights?: number[];
  }
  export namespace Node {
    /**
     * A bounding volume. (glTF 2.1)
     */
    export interface BoundingVolume extends Gltf2.Property {
      /**
       * The bounding volume's unit quaternion rotation relative to the node's
       * local coordinate system.
       *
       * @default [0,0,0,1]
       */
      rotation?: [number, number, number, number];
      /**
       * The bounding volume's scale along the rotated local X, Y, and Z axes.
       *
       * @default [1,1,1]
       */
      scale?: [number, number, number];
      /**
       * The index of the shape in the top-level `shapes` array used for this
       * bounding volume. Required.
       */
      shape: number;
      /**
       * The bounding volume's translation along the node's local X, Y, and Z
       * axes.
       *
       * @default [0,0,0]
       */
      translation?: [number, number, number];
    }
  }
  /**
   * Texture sampler properties for filtering and wrapping modes.
   */
  export interface Sampler extends Gltf2.ChildOfRootProperty {
    /**
     * Filter used when the texture's rendered dimensions are greater than its
     * original dimensions.
     *
     * Allowed values:
     *
     * - `9728`: Nearest-neighbor filtering, also known as point filtering.
     * - `9729`: Linear filtering.
     */
    magFilter?: number;
    /**
     * Filter used when the texture's rendered dimensions are less than its
     * original dimensions.
     *
     * Allowed values:
     *
     * - `9728`: Nearest-neighbor filtering, also known as point filtering,
     *   without mipmapping.
     * - `9729`: Linear filtering without mipmapping.
     * - `9984`: Nearest-neighbor filtering from the closest mipmap.
     * - `9985`: Linear filtering from the closest mipmap.
     * - `9986`: Nearest-neighbor filtering from the two closest mipmaps
     *   followed by linear filtering between them.
     * - `9987`: Linear filtering from the two closest mipmaps followed by
     *   linear filtering between them, also known as trilinear filtering.
     */
    minFilter?: number;
    /**
     * Wrapping mode for horizontal texture coordinates less than zero or
     * greater than or equal to one.
     *
     * Allowed values:
     *
     * - `10497`: The normalized range is repeated infinitely.
     * - `33071`: The out-of-bounds texture coordinates are clamped.
     * - `33648`: The normalized range is repeated infinitely, reversing the
     *   direction on every repeat.
     *
     * @default 10497
     */
    wrapS?: number;
    /**
     * Wrapping mode for vertical texture coordinates less than zero or greater
     * than or equal to one.
     *
     * Allowed values:
     *
     * - `10497`: The normalized range is repeated infinitely.
     * - `33071`: The out-of-bounds texture coordinates are clamped.
     * - `33648`: The normalized range is repeated infinitely, reversing the
     *   direction on every repeat.
     *
     * @default 10497
     */
    wrapT?: number;
  }
  /**
   * Visual objects, such as nodes, to render.
   */
  export interface Scene extends Gltf2.ChildOfRootProperty {
    /**
     * The root node indices.
     */
    nodes?: number[];
  }
  /**
   * A generic, re-usable shape definition with no inherent meaning attached to
   * it. (glTF 2.1)
   */
  export interface Shape extends Gltf2.ChildOfRootProperty {
    /**
     * The type of shape this shape object represents. If any properties are
     * explicitly specified for the shape, the shape properties object MUST
     * match the shape type.
     *
     * Allowed values:
     *
     * - `"box"`
     * - `"capsule"`
     * - `"convexMesh"`
     * - `"cylinder"`
     * - `"mesh"`
     * - `"plane"`
     * - `"sphere"`
     */
    type: string;
    /**
     * Parameter values defining a box shape.
     */
    box?: Gltf2.Shape.Box;
    /**
     * Parameter values defining a capsule shape.
     */
    capsule?: Gltf2.Shape.Capsule;
    /**
     * Parameter values defining a convex mesh shape.
     */
    convexMesh?: Gltf2.Shape.ConvexMesh;
    /**
     * Parameter values defining a cylinder shape.
     */
    cylinder?: Gltf2.Shape.Cylinder;
    /**
     * Parameter values defining a generic mesh shape.
     */
    mesh?: Gltf2.Shape.Mesh;
    /**
     * Parameter values defining a plane shape.
     */
    plane?: Gltf2.Shape.Plane;
    /**
     * Parameter values defining a sphere shape.
     */
    sphere?: Gltf2.Shape.Sphere;
  }
  export namespace Shape {
    /**
     * An axis-aligned box with a size per-axis, centered at the origin in local
     * space, with normals facing outwards along each axis. (glTF 2.1)
     */
    export interface Box extends Gltf2.Property {
      /**
       * The size of the box in each axis in local space.
       *
       * @default [1,1,1]
       */
      size?: [number, number, number];
    }
    /**
     * A capsule, centered at the origin in local space with potentially
     * different radii at each end, equivalent to the convex hull of two spheres
     * located along the Y axis (in local space) at a specified distance, with
     * normals facing outwards. (glTF 2.1)
     */
    export interface Capsule extends Gltf2.Property {
      /**
       * The distance between the centers of the two capping spheres of capsule,
       * also known as the mid-height.
       *
       * @default 1
       */
      height?: number;
      /**
       * The radius of the sphere located at the bottom of the capsule (i.e. the
       * sphere at the half-height along -Y)
       *
       * @default 0.5
       */
      radiusBottom?: number;
      /**
       * The radius of the sphere located at the top of the capsule (i.e. the
       * sphere at the half-height along +Y)
       *
       * @default 0.5
       */
      radiusTop?: number;
    }
    /**
     * A convex triangular mesh shape. (glTF 2.1)
     */
    export interface ConvexMesh extends Gltf2.Property {
      /**
       * The index of the mesh defining the geometry for this shape.
       */
      mesh: number;
    }
    /**
     * A cylinder, centered at the origin in local space with potentially
     * different radii at each end, equivalent to the convex hull of two circles
     * in the X/Z plane positioned along the Y axis at a specified distance,
     * with the top cap normal facing along the +Y axis, the bottom cap normal
     * facing along the -Y axis, and the side normals facing outwards along the
     * X/Z plane. (glTF 2.1)
     */
    export interface Cylinder extends Gltf2.Property {
      /**
       * The height of the cylinder, centered along the Y axis.
       *
       * @default 2
       */
      height?: number;
      /**
       * The radius of the bottom of the cylinder (the disc located along -Y.)
       *
       * @default 0.5
       */
      radiusBottom?: number;
      /**
       * The radius of the top of the cylinder (the disc located along +Y.)
       *
       * @default 0.5
       */
      radiusTop?: number;
    }
    /**
     * A generic triangular mesh shape, which may be either concave or convex.
     * (glTF 2.1)
     */
    export interface Mesh extends Gltf2.Property {
      /**
       * The index of the mesh defining the geometry for this shape.
       */
      mesh: number;
    }
    /**
     * A plane centered at the origin in local space, optionally with finite
     * extents, with normal along the +Y axis in local space. The plane is
     * one-sided. (glTF 2.1)
     */
    export interface Plane extends Gltf2.Property {
      /**
       * The extents along the X axis in local space. If not provided, this
       * dimension should be considered infinite.
       */
      sizeX?: number;
      /**
       * The extents along the Z axis in local space. If not provided, this
       * dimension should be considered infinite.
       */
      sizeZ?: number;
    }
    /**
     * A sphere, centered at the origin in local space with a radius equal in
     * all directions, with normals facing outwards. (glTF 2.1)
     */
    export interface Sphere extends Gltf2.Property {
      /**
       * The radius of the sphere.
       *
       * @default 0.5
       */
      radius?: number;
    }
  }
  /**
   * Joints and matrices defining a skin.
   */
  export interface Skin extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the accessor providing the inverse bind matrices. When
     * undefined, all inverse bind matrices are identity.
     */
    inverseBindMatrices?: number;
    /**
     * Indices of the joint nodes.
     */
    joints: number[];
    /**
     * The index of the node to use as the skeleton root.
     */
    skeleton?: number;
  }
  /**
   * Combination of the texture's source and sampler.
   */
  export interface Texture extends Gltf2.ChildOfRootProperty {
    /**
     * The index of the sampler.
     */
    sampler?: number;
    /**
     * The index of the image.
     */
    source?: number;
  }
}
