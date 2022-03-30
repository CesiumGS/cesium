# Property Texture With Vector (and other) Properties

This sample is a variation on [`SimplePropertyTexture`](../SimplePropertyTexture/) with a different set of properties defined to test more advanced metadata
types. This model is contrived, it is intended for unit testing only.

The sample contains a glTF asset with a single mesh primitive. The mesh primitive consists of a quad (the unit square), formed by 2 triangles. The vertices in this mesh primitive have the usual `POSITION`, `NORMAL`, and `TEXCOORD_0` vertex attributes.

### Metadata Structure

This model contains the following metadata properties to set up several
different test cases. The properties share the same texture, reinterpreting the
bytes as necessary.

| property ID         | Type                            | Channels |
| ------------------- | ------------------------------- | -------- |
| `vec2Property`      | `VEC2` of `UINT8` (normalized)  | `gb`     |
| `uint8Property`     | `UINT8`                         | `r`      |
| `uint8vec3Property` | `VEC3` of `UINT8`               | `rgb`    |
| `arrayProperty`     | array of 3 `UINT8` (normalized) | `rgb`    |

## License

[CC0](https://creativecommons.org/share-your-work/public-domain/cc0/)
