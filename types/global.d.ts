/**
 * Global type declarations for CesiumJS TypeScript conversion
 */

// WebGL Extensions
interface WebGLRenderingContext {
  getExtension(name: "WEBGL_lose_context"): WEBGL_lose_context | null;
  getExtension(name: "WEBGL_debug_renderer_info"): WEBGL_debug_renderer_info | null;
  getExtension(name: "WEBGL_compressed_texture_s3tc"): WEBGL_compressed_texture_s3tc | null;
  getExtension(name: "WEBGL_compressed_texture_pvrtc"): WEBGL_compressed_texture_pvrtc | null;
  getExtension(name: "WEBGL_compressed_texture_etc1"): WEBGL_compressed_texture_etc1 | null;
  getExtension(name: "WEBGL_compressed_texture_astc"): WEBGL_compressed_texture_astc | null;
  getExtension(name: "EXT_texture_filter_anisotropic"): EXT_texture_filter_anisotropic | null;
  getExtension(name: "WEBGL_depth_texture"): WEBGL_depth_texture | null;
  getExtension(name: "OES_element_index_uint"): OES_element_index_uint | null;
  getExtension(name: "OES_texture_float"): OES_texture_float | null;
  getExtension(name: "OES_texture_float_linear"): OES_texture_float_linear | null;
  getExtension(name: "OES_texture_half_float"): OES_texture_half_float | null;
  getExtension(name: "OES_texture_half_float_linear"): OES_texture_half_float_linear | null;
  getExtension(name: "OES_standard_derivatives"): OES_standard_derivatives | null;
  getExtension(name: "OES_vertex_array_object"): OES_vertex_array_object | null;
  getExtension(name: "ANGLE_instanced_arrays"): ANGLE_instanced_arrays | null;
  getExtension(name: "EXT_blend_minmax"): EXT_blend_minmax | null;
  getExtension(name: "EXT_frag_depth"): EXT_frag_depth | null;
  getExtension(name: "EXT_shader_texture_lod"): EXT_shader_texture_lod | null;
}

interface WEBGL_compressed_texture_pvrtc {
  readonly COMPRESSED_RGB_PVRTC_4BPPV1_IMG: number;
  readonly COMPRESSED_RGB_PVRTC_2BPPV1_IMG: number;
  readonly COMPRESSED_RGBA_PVRTC_4BPPV1_IMG: number;
  readonly COMPRESSED_RGBA_PVRTC_2BPPV1_IMG: number;
}

interface WEBGL_compressed_texture_etc1 {
  readonly COMPRESSED_RGB_ETC1_WEBGL: number;
}

interface WEBGL_compressed_texture_astc {
  readonly COMPRESSED_RGBA_ASTC_4x4_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_5x4_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_5x5_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_6x5_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_6x6_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_8x5_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_8x6_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_8x8_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_10x5_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_10x6_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_10x8_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_10x10_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_12x10_KHR: number;
  readonly COMPRESSED_RGBA_ASTC_12x12_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR: number;
  readonly COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR: number;
}

// Cesium-specific global types
declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
    webkitRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    mozRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    msRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    oRequestAnimationFrame?: (callback: FrameRequestCallback) => number;
    webkitCancelAnimationFrame?: (handle: number) => void;
    mozCancelAnimationFrame?: (handle: number) => void;
    msCancelAnimationFrame?: (handle: number) => void;
    oCancelAnimationFrame?: (handle: number) => void;
  }

  interface Navigator {
    webkitGetUserMedia?: any;
    mozGetUserMedia?: any;
    msGetUserMedia?: any;
  }

  interface Document {
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    msFullscreenElement?: Element | null;
    webkitFullscreenEnabled?: boolean;
    mozFullScreenEnabled?: boolean;
    msFullscreenEnabled?: boolean;
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }

  // Performance API extensions
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};
