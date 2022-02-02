# `CustomShader` Documentation

## Constructor

```js
const customShader = new Cesium.CustomShader({
  // Any custom uniforms the user wants to add to the shader.
  // these can be changed at runtime via customShader.setUniform()
  uniforms: {
    u_time: {
      value: 0, // initial value
      type: Cesium.UniformType.FLOAT
    },
    // Textures can be loaded from a URL, a Resource, or a TypedArray.
    // See the Uniforms section for more detail
    u_externalTexture: {
      value: new Cesium.TextureUniform({
        url: "http://example.com/image.png"
      }),
      type: Cesium.UniformType.SAMPLER_2D
    }
  }
  // Custom varyings that will appear in the custom vertex and fragment shader
  // text.
  varyings: {
    v_customTexCoords: Cesium.VaryingType.VEC2
  },
  // configure where in the fragment shader's materials/lighting pipeline the
  // custom shader goes. More on this below.
  mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
  // either PBR (physically-based rendering) or UNLIT depending on the desired
  // results.
  lightingModel: Cesium.LightingModel.PBR,
  // required when setting material.alpha in the fragment shader
  isTranslucent: true,
  // Custom vertex shader. This is a function from model space -> model space.
  // VertexInput is documented below
  vertexShaderText: `
    // IMPORTANT: the function signature must use these parameter names. This
    // makes it easier for the runtime to generate the shader and make optimizations.
    void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
        // code goes here. An empty body is a no-op.
    }
  `,
  // Custom fragment shader.
  // FragmentInput will be documented below
  // Regardless of the mode, this always takes in a material and modifies it in place.
  fragmentShaderText: `
    // IMPORTANT: the function signature must use these parameter names. This
    // makes it easier for the runtime to generate the shader and make optimizations.
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        // code goes here. e.g. to set the diffuse color to a translucent red:
        material.diffuse = vec3(1.0, 0.0, 0.0);
        material.alpha = 0.5;
    }
  `,
});
```

## Applying A Custom Shader

Custom shaders can be applied to either 3D Tiles or `ModelExperimental` as
follows:

```js
const customShader = new Cesium.CustomShader(/* ... */);

// Applying to all tiles in a tileset.
const tileset = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
  url: "http://example.com/tileset.json",
  customShader: customShader
}));

// Applying to a model directly
const model = Cesium.ModelExperimental.fromGltf({,
  gltf: "http://example.com/model.gltf",
  customShader: customShader
});
```

**Note**: As of this writing, only tilesets that use the `3DTILES_content_gltf`
extension will support `CustomShaders`. Future releases will add support for
other formats such as b3dm.

## Uniforms

Custom Shaders currently supports the following uniform types:

| UniformType  | GLSL type   | JS type          |
| ------------ | ----------- | ---------------- |
| `FLOAT`      | `float`     | `Number`         |
| `VEC2`       | `vec2`      | `Cartesian2`     |
| `VEC3`       | `vec3`      | `Cartesian3`     |
| `VEC4`       | `vec4`      | `Cartesian4`     |
| `INT`        | `int`       | `Number`         |
| `INT_VEC2`   | `ivec2`     | `Cartesian2`     |
| `INT_VEC3`   | `ivec3`     | `Cartesian3`     |
| `INT_VEC4`   | `ivec4`     | `Cartesian4`     |
| `BOOL`       | `bool`      | `Boolean`        |
| `BOOL_VEC2`  | `bvec2`     | `Cartesian2`     |
| `BOOL_VEC3`  | `bvec3`     | `Cartesian3`     |
| `BOOL_VEC4`  | `bvec4`     | `Cartesian4`     |
| `MAT2`       | `mat2`      | `Matrix2`        |
| `MAT3`       | `mat3`      | `Matrix3`        |
| `MAT4`       | `mat4`      | `Matrix4`        |
| `SAMPLER_2D` | `sampler2D` | `TextureUniform` |

### Texture Uniforms

Texture uniforms have more options, which have been encapsulated in the
`TextureUniform` class. Textures can be loaded from a URL, a `Resource` or a
typed array. Here are some examples:

```js
const textureFromUrl = new Cesium.TextureUniform({
  url: "https://example.com/image.png",
});

const textureFromTypedArray = new Cesium.TextureUniform({
  typedArray: new Uint8Array([255, 0, 0, 255]),
  width: 1,
  height: 1,
  pixelFormat: Cesium.PixelFormat.RGBA,
  pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
});

// TextureUniform also provides options for controlling the sampler
const textureWithSampler = new Cesium.TextureUniform({
  url: "https://example.com/image.png",
  repeat: false,
  minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
  magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST,
});
```

## Varyings

Varyings are declared in the `CustomShader` constructor. This automatically
adds a line such as `varying float v_userDefinedVarying;` to the top of the
GLSL shader.

The user is responsible for assigning a value to this varying in
`vertexShaderText` and using it in `fragmentShaderText`. For example:

```js
const customShader = new Cesium.CustomShader({
  // Varying is declared here
  varyings: {
    v_selectedColor: VaryingType.VEC3,
  },
  // User assigns the varying in the vertex shader
  vertexShaderText: `
    void vertexMain(VertexInput vsInput, inout czm_modelVertexOutput vsOutput) {
        float positiveX = step(0.0, positionMC.x);
        v_selectedColor = mix(
            vsInput.attributes.color_0,
            vsInput.attributes.color_1,
            vsOutput.positionMC.x
        );
    }
  `,
  // User uses the varying in the fragment shader
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        material.diffuse = v_selectedColor;
    }
  `,
});
```

Custom Shaders supports the following varying types:

| VaryingType | GLSL type |
| ----------- | --------- |
| `FLOAT`     | `float`   |
| `VEC2`      | `vec2`    |
| `VEC3`      | `vec3`    |
| `VEC4`      | `vec4`    |
| `MAT2`      | `mat2`    |
| `MAT3`      | `mat3`    |
| `MAT4`      | `mat4`    |

## Custom Shader Modes

The custom fragment shader is configurable so it can go before/after materials or lighting. here's a summary of what
modes are available.

| Mode                        | Fragment shader pipeline              | Description                                                                            |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `MODIFY_MATERIAL` (default) | material -> custom shader -> lighting | The custom shader modifies the results of the material stage                           |
| `REPLACE_MATERIAL`          | custom shader -> lighting             | Don't run the material stage at all, but procedurally generate it in the custom shader |

In the above, "material" does preprocessing of textures, resulting in a `czm_modelMaterial`. This is mostly relevant for PBR, but even for UNLIT, the base color texture is handled.

## `VertexInput` struct

An automatically-generated GLSL struct that contains attributes.

```glsl
struct VertexInput {
    // Processed attributes. See the Attributes Struct section below.
    Attributes attributes;
    // Feature IDs/Batch IDs. See the FeatureIds Struct section below.
    FeatureIds featureIds;
    // In the future, metadata will be added here.
};
```

## `FragmentInput` struct

This struct is similar to `VertexInput`, but there are a few more automatic
variables for positions in various coordinate spaces.

```glsl
struct FragmentInput {
    // Processed attribute values. See the Attributes Struct section below.
    Attributes attributes;
    // Feature IDs/Batch IDs. See the FeatureIds Struct section below.
    FeatureIds featureIds;
    // In the future, metadata will be added here.
};
```

## Attributes Struct

The `Attributes` struct is dynamically generated given the variables used in
the custom shader and the attributes available in the primitive to render.

For example, if the user uses `fsInput.attributes.texCoord_0` in the shader,
the runtime will generate the code needed to supply this value from the
attribute `TEXCOORD_0` in the model (where available)

If a primitive does not have the attributes necessary to satisfy the custom
shader, a default value will be inferred where possible so the shader still
compiles. Otherwise, the custom vertex/fragment shader portion will be disabled
for that primitive.

The full list of built-in attributes are as follows. Some attributes have a set
index, which is one of `0, 1, 2, ...` (e.g. `texCoord_0`), these are denoted
with an `N`.

| Corresponding Attribute in Model | variable in shader | Type    | Available in Vertex Shader? | Available in Fragment Shader? | Description                                                                                                                                                              |
| -------------------------------- | ------------------ | ------- | --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POSITION`                       | `positionMC`       | `vec3`  | Yes                         | Yes                           | Position in model coordinates                                                                                                                                            |
| `POSITION`                       | `positionWC`       | `vec3`  | No                          | Yes                           | Position in world coordinates (WGS84 ECEF `(x, y, z)`). Low precision.                                                                                                   |
| `POSITION`                       | `positionEC`       | `vec3`  | No                          | Yes                           | Position in eye coordinates.                                                                                                                                             |
| `NORMAL`                         | `normalMC`         | `vec3`  | Yes                         | No                            | Unit-length normal vector in model coordinates. Only available in the vertex shader                                                                                      |
| `NORMAL`                         | `normalEC`         | `vec3`  | No                          | Yes                           | Unit-length normal vector in eye coordinates. Only available in the vertex shader                                                                                        |
| `TANGENT`                        | `tangentMC`        | `vec3`  | Yes                         | No                            | Unit-length tangent vector in model coordinates. This is always a `vec3`. For models that provide a `w` component, that is removed after computing the bitangent vector. |
| `TANGENT`                        | `tangentEC`        | `vec3`  | No                          | Yes                           | Unit-length tangent vector in eye coordinates. This is always a `vec3`. For models that provide a `w` component, that is removed after computing the bitangent vector.   |
| `NORMAL` & `TANGENT`             | `bitangentMC`      | `vec3`  | Yes                         | No                            | Unit-length bitangent vector in model coordinates. Only available when both normal and tangent vectors are available.                                                    |
| `NORMAL` & `TANGENT`             | `bitangentEC`      | `vec3`  | No                          | Yes                           | Unit-length bitangent vector in eye coordinates. Only available when both normal and tangent vectors are available.                                                      |
| `TEXCOORD_N`                     | `texCoord_N`       | `vec2`  | Yes                         | Yes                           | `N`-th set of texture coordinates.                                                                                                                                       |
| `COLOR_N`                        | `color_N`          | `vec4`  | Yes                         | Yes                           | `N`-th set of vertex colors. This is always a `vec4`; if the model does not specify an alpha value, it is assumed to be 1.                                               |
| `JOINTS_N`                       | `joints_N`         | `ivec4` | Yes                         | Yes                           | `N`-th set of joint indices                                                                                                                                              |
| `WEIGHTS_N`                      | `weights_N`        | `vec4`  |

Custom attributes are also available, though they are renamed to use lowercase
letters and underscores. For example, an attribute called `_SURFACE_TEMPERATURE`
in the model would become `fsInput.attributes.surface_temperature` in the shader.

## `FeatureIds` struct

This struct is dynamically generated to gather all the various feature IDs into
a single collection, regardless of whether the value came from an attribute,
texture or varying.

### 3D Tiles 1.0 Batch IDs

In 3D Tiles 1.0, the same concept of identifying features within a primitive
was called `BATCH_ID` or the legacy `_BATCHID`. These batch IDs are renamed
to a single feature ID, always with index 0:

- `vsInput.featureIds.featureId_0` (Vertex shader)
- `fsInput.featureIds.featureId_0` (Fragment shader)

### `EXT_mesh_features` Feature IDs

When the glTF extension `EXT_mesh_features` is used, feature IDs appear in
two places:

1. Any glTF primitive can have a `featureIds` array. The `featureIds` array may
   contain feature ID attributes, implicit feature ID attributes, and/or feature
   ID textures. Regardless of the type of feature IDs, they all appear in the
   custom shader as `(vsInput|fsInput).featureIds.featureId_N` where `N` is the
   index of the feature IDs in the `featureIds` array.
2. Any glTF node with the `EXT_mesh_gpu_instancing` and `EXT_mesh_features` may
   define feature IDs. These may be feature ID attributes or implicit feature ID
   attributes, but not feature ID textures. These will appear in the custom
   shader as `(vsInput|fsInput).featureIds.instanceFeatureId_N` where `N` is the
   index of the feature IDs in the `featureIds` array.

Furthermore, note that feature ID textures are only supported in the fragment
shader.

For example, suppose we had a glTF primitive with the following feature IDs:

```jsonc
"nodes": [
  {
    "mesh": 0
    "extensions": {
      "EXT_mesh_gpu_instancing": {
        "attributes": {
          "TRANSLATION": 3,
          "FEATURE_ID_0": 4
        }
      },
      "EXT_mesh_features": {
        "propertyTables": [0, 1],
        "featureIds": [
          {
            // Feature ID attribute from implicit range
            //
            // Vertex Shader: vsInput.featureIds.instanceFeatureId_0
            // Fragment Shader: fsInput.featureIds.instanceFeatureId_0
            "offset": 0,
            "repeat": 1
          },
          {
            // Feature ID attribute. This corresponds to FEATURE_ID_0 from the
            // instancing extension above. Note that this is
            // labeled as instanceFeatureId_1 since it is the second feature ID
            // set in the featureIds array
            //
            // Vertex Shader: vsInput.featureIds.instanceFeatureId_1
            // Fragment Shader: fsInput.featureIds.instanceFeatureId_1
            "attribute": 0
          }
        ]
      }
    }
  }
],
"meshes": [
  {
    "primitives": [
      {
        "attributes": {
          "POSITION": 0,
          "FEATURE_ID_0": 1,
          "FEATURE_ID_1": 2
        },
        "extensions": {
          "EXT_mesh_features": {
            "propertyTables": [2, 3, 4, 5],
            "featureIds": [
              {
                // Feature ID Texture
                //
                // Vertex Shader: (Not supported)
                // Fragment Shader: fsInput.featureIds.featureId_0
                "index": 0,
                "texCoord": 0,
                "channel": 0
              },
              {
                // Implicit Feature ID attribute
                //
                // Vertex Shader: vsInput.featureIds.featureId_1
                // Fragment Shader: fsInput.featureIds.featureId_1
                "offset": 0,
                "repeat": 3
              },
              {
                // Feature ID Attribute (FEATURE_ID_0). Note that this
                // is labeled featureId_2 for its index in the featureIds
                // array
                //
                // Vertex Shader: vsInput.featureIds.featureId_2
                // Fragment Shader: fsInput.featureIds.featureId_2
                "attribute": 0
              },
              {
                // Feature ID Attribute (FEATURE_ID_1). Note that this
                // is labeled featureId_3 for its index in the featureIds
                // array
                //
                // Vertex Shader: vsInput.featureIds.featureId_3
                // Fragment Shader: fsInput.featureIds.featureId_3
                "attribute": 1
              }
            ]
          }
        }
      },
    ]
  }
]
```

### Legacy `EXT_feature_metadata` Feature IDs

`EXT_feature_metadata` was an earlier draft of `EXT_mesh_features`. Though
the feature ID concepts have not changed much, the JSON structure is a little
different. In the older extension, `featureIdAttributes` and `featureIdTextures`
were stored separately. In this CesiumJS implementation, the feature attributes
and feature textures are concatenated into one list, essentially
`featureIds = featureIdAttributes.concat(featureIdTextures)`. Besides this
difference in the extension JSON, the feature ID sets are labeled the same
way as `EXT_mesh_features`, i.e.

- `(vsInput|fsInput).featureIds.featureId_N` corresponds to the `N`-th feature
  ID set from the combined `featureIds` array from each primitive.
- `(vsInput|fsInput).featureIds.instanceFeatureId_N` corresponds to the `N`-th
  feature ID set from the `featureIds` array from the node with the
  `EXT_mesh_gpu_instancing` extension.

For comparison, here is the same example as in the previous section, translated
to the `EXT_feature_metadata` extension:

```jsonc
"nodes": [
  {
    "mesh": 0,
    "extensions": {
      "EXT_mesh_gpu_instancing": {
        "attributes": {
          "TRANSLATION": 3,
          "_FEATURE_ID_0": 4
        },
        "extensions": {
          "EXT_feature_metadata": {
            "featureIdAttributes": [
              {
                // Feature ID attribute from implicit range
                //
                // Vertex Shader: vsInput.featureIds.instanceFeatureId_0
                // Fragment Shader: fsInput.featureIds.instanceFeatureId_0
                "featureTable": "perInstanceTable",
                "featureIds": {
                  "constant": 0,
                  "divisor": 1
                }
              },
              {
                // Feature ID attribute. This corresponds to FEATURE_ID_0 from the
                // instancing extension above. Note that this is
                // labeled as instanceFeatureId_1 since it is the second feature ID
                // set in the featureIds array
                //
                // Vertex Shader: vsInput.featureIds.instanceFeatureId_1
                // Fragment Shader: fsInput.featureIds.instanceFeatureId_1
                "featureTable": "perInstanceGroupTable",
                "featureIds": {
                  "attribute": "_FEATURE_ID_0"
                }
              }
            ],
          }
        }
      }
    }
  }
],
"meshes": [
  {
    "primitives": [
      {
        "attributes": {
          "POSITION": 0,
          "_FEATURE_ID_0": 1,
          "_FEATURE_ID_1": 2
        },
        "extensions": {
          "EXT_feature_metadata": {
            "featureIdAttributes": [
              {
                // Implicit Feature ID attribute
                //
                // Vertex Shader: vsInput.featureIds.featureId_0
                // Fragment Shader: fsInput.featureIds.featureId_0
                "featureTable": "perFaceTable",
                "featureIds": {
                  "constant": 0,
                  "divisor": 3
                }
              },
              {
                // Feature ID Attribute (FEATURE_ID_0). Note that this
                // is labeled featureId_1 for its index in the featureIds
                // array
                //
                // Vertex Shader: vsInput.featureIds.featureId_1
                // Fragment Shader: fsInput.featureIds.featureId_1
                "featureTable": "perFeatureTable",
                "featureIds": {
                  "attribute": "_FEATURE_ID_0"
                }
              },
              {
                // Feature ID Attribute (FEATURE_ID_1). Note that this
                // is labeled featureId_2 for its index in the featureIds
                // array
                //
                // Vertex Shader: vsInput.featureIds.featureId_2
                // Fragment Shader: fsInput.featureIds.featureId_2
                "featureTable": "otherFeatureTable",
                "featureIds": {
                  "attribute": "_FEATURE_ID_1"
                }
              }
            ],
            "featureIdTextures": [
              {
                // Feature ID Texture. Note that this is labeled featureId_3
                // since the list of feature ID textures is concatenated to the
                // list of feature ID attributes
                //
                // Vertex Shader: (Not supported)
                // Fragment Shader: fsInput.featureIds.featureId_3
                "featureTable": "perTexelTable",
                "featureIds": {
                  "texture": {
                    "texCoord": 0,
                    "index": 0
                  },
                  "channels": "r"
                }
              }
            ]
          }
        }
      },
    ]
  }
]
```

## `czm_modelVertexOutput` struct

This struct is built-in, see the [documentation comment](../../../Shaders/Builtin/Structs/modelVertexOutput.glsl).

This struct contains the output of the custom vertex shader. This includes:

- `positionMC` - The vertex position in model space coordinates. This struct
  field can be used e.g. to perturb or animate vertices. It is initialized to
  `vsInput.attributes.positionMC`. The custom shader may modify this, and the
  result is used to compute `gl_Position`.
- `pointSize` - corresponds to `gl_PointSize`. This is only applied for models
  rendered as `gl.POINTS`, and ignored otherwise.

> **Implementation Note**: `positionMC` does not modify the primitive's bounding
> sphere. If vertices are moved outside the bounding sphere, the primitive may
> be unintentionally culled depending on the view frustum.

## `czm_modelMaterial` struct

This struct is a built-in, see the [documentation comment](../../../Shaders/Builtin/Structs/modelMaterial.glsl). This is similar to `czm_material` from the old Fabric system, but slightly different fields as this one supports PBR lighting.

This struct serves as the basic input/output of the fragment shader pipeline stages. For example:

- the material stage produces a material
- the lighting stage takes in a material, computes lighting, and stores the result into `material.diffuse`
- Custom shaders (regardless of where in the pipeline it is) takes in a material (even if it's a material with default values) and modifies this.
