// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/1.0/Khronos/KHR_binary_glTF/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

/** @internal */
export namespace KHR_binary_glTF {
  export interface Image {
    /**
     * The id (JSON property name) of the buffer-view that references the image.
     * Use this instead of the image's uri property.
     */
    bufferView: string;
    /**
     * The image's MIME type.
     */
    mimeType: string;
    /**
     * The width of the image in pixels.
     */
    width: number;
    /**
     * The height of the image in pixels.
     */
    height: number;
  }
  export interface Shader {
    /**
     * The id (JSON property name) of the buffer-view that references the shader
     * source. Use this instead of the shader's uri property.
     */
    bufferView: string;
  }
}
