# `CustomShader` Documentation

**Note**: This README is stored in `ModelExperimental/` temporarily while
this is an experimental feature. In the future, this may move to the
`Documentation/` directory.

## Constructor

```js
var customShader = new Cesium.CustomShader({
  // Any custom uniforms the user wants to add to the shader.
  // these can be changed at runtime via customShader.setUniform()
  uniforms: {
    u_time: {
      value: 0, // initial value
      type: UniformType.FLOAT
    },
    // Textures can be loaded from a URL, a Resource, or a TypedArray.
    // See the Uniforms section for more detail
    u_externalTexture: {
      value: new Cesium.TextureUniform({
        url: "http://example.com/image.png"
      }),
      type: UniformType.SAMPLER_2D
    },
    // Textures can also be
    u_arrayTexture: {
      value: new Cesium.TextureUniform({
        typedArray: new Uint8Array([255, 0, 0, 1]),
        width: 1,
        height: 1,
        pixelFormat: Cesium.PixelFormat.RGBA
      }),
      type: UniformType.SAMPLER_2D
    }
  }
  // Custom varyings that will appear in the custom vertex and fragment shader
  // text.
  varyings: {
    v_customTexCoords: VaryingType.VEC2
  },
  // configure where in the fragment shader's materials/lighting pipeline the
  // custom shader goes. More on this below.
  mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,
  // either PBR (physically-based rendering) or UNLIT depending on the desired
  // results.
  lightingModel: Cesium.LightingModel.PBR,
  // Custom vertex shader. Right now this is a function from model space -> model space.
  // VertexInput will be documented below
  // NOTE: which coordinate system is used here may change (e.g. could become model -> view space
  vertexShaderText: `
    vec3 vertexMain(VertexInput vsInput, vec3 position) {
        // code goes here. e.g. for a no-op:
        return position;
    }
  `,
  // Custom fragment shader.
  // FragmentInput will be documented below
  // Regardless of the mode, this always takes in a material and modifies it in place.
  fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        // code goes here. e.g. to set the diffuse color to solid red:
        material.diffuse = vec3(1.0, 0.0, 0.0);
    }
  `,
});
```

## Applying A Custom Shader

Custom shaders can be applied to either 3D Tiles or `ModelExperimental` as
follows:

```js
var customShader = new Cesium.CustomShader(/* ... */);

// Applying to all tiles in a tileset.
var tileset = scene.primitive.add(new Cesium.Cesium3DTileset({
  url: "http://example.com/tileset.json",
  customShader: customShader
}));

// Applying to a glTF model directly
var model = Cesium.ModelExperimental.fromGltf({,
  gltf: "http://example.com/model.gltf",
  customShader: customShader
});
```

**Note**: As of this writing, only tilesets that use the `3DTILES_content_gltf`
extension will support `CustomShaders`. Future releases will add support for
other formats such as B3DM.

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
var textureFromUrl = new Cesium.TextureUniform({
  url: "https://example.com/image.png",
});

var textureFromTypedArray = new Cesium.TextureUniform({
  typedArray: new Uint8Array([255, 0, 0, 255]),
  width: 1,
  height: 1,
  pixelFormat: Cesium.PixelFormat.RGBA,
  pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
});

// TextureUniform also provides options for controlling the sampler
var textureWithSampler = new Cesium.TextureUniform({
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
var customShader = new Cesium.CustomShader({
  // Varying is declared here
  varyings: {
    v_selectedColor: VaryingType.VEC3,
  },
  // User assigns the varying in the vertex shader
  vertexShaderText: `
    vec3 vertexMain(VertexInput vsInput, vec3 position) {
        float positiveX = step(0.0, position.x);
        v_selectedColor = mix(
            vsInput.attributes.color_0,
            vsInput.attributes.color_1,
            position.x
        );
        return position;
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

In the above, "material" does preprocessing of glTF textures, resulting in a `czm_modelMaterial`. This is mostly relevant for PBR, but even for UNLIT, the base color texture is handled.

## `VertexInput` struct

An automatically-generated GLSL struct that contains glTF attributes.

```glsl
// this struct represents the raw attribute values.
struct Attributes {
    // required semantics
    vec3 position; // model space position. always present as glTF POSITION is required

    // optional semantics (added depending on what's in the glTF)
    vec3 normal; // glTF NORMAL
    vec3 tangent;
    vec3 texCoord_0;
    // etc.

    // custom attribues
    vec3 custom_attribute; // corresponds to glTF attribute _CUSTOM_ATTRIBUTE
};

struct VertexInput {
    // raw attribute values
    Attributes attributes;
    // in the future we may add another struct for derived attributes (e.g. positionEC)
};
```

## `FragmentInput` struct

This struct is similar to `VertexInput`, but there are a few more automatic
variables for positions in various coordinate spaces.

```glsl
// this struct represents the raw glTF attributes. The varyings required to make this work are handled
// automatically.
struct Attributes {
    // required semantics
    vec3 position; // Raw model space position. always present as glTF POSITION is required

    // optional semantics (added depending on what's in the glTF)
    vec3 normal; // glTF NORMAL
    vec3 tangent;
    vec3 texCoord_0;
    // etc.

    // custom attribues
    vec3 custom_attribute; // corresponds to glTF attribute _CUSTOM_ATTRIBUTE
};

struct FragmentInput {
    // raw glTF attribute values interpolated (but not normalized) from varyings.
    Attributes attributes;
    vec3 positionMC; // model space
    vec3 positionWC; // World coords (ECEF). Low precision.
    vec3 positionEC; // Eye coordinates
};
```

## `czm_modelMaterial` struct

This one is a built-in, see the [documentation comment](https://github.com/CesiumGS/cesium/blob/model-experimental-custom-shaders/Source/Shaders/Builtin/Structs/modelMaterial.glsl). This is similar to `czm_material` from the old Fabric system, but slightly different fields as this one supports PBR lighting.

This struct serves as the basic input/output of the fragment shader pipeline stages. For example:

- the material stage produces a material
- the lighting stage takes in a material, computes lighting, and stores the result into `material.diffuse`
- Custom shaders (regardless of where in the pipeline it is) takes in a material (even if it's a material with default values) and modifies this.
