// The engine's shared structs, constants and helpers: the one source of
// their layouts (CESIUM2_WEBGPU_PLAN.md §3.4, "Slang-first, for real",
// step 3). Kernels written in Slang `import common;`. The TypeScript
// offsets are generated from this module's reflection (scripts/
// slangBuild.mjs, `layouts.slang` → src/render/generated/layouts.ts).
module common;

// Anchor slots per view (render/layout.ts MAX_ANCHORS): slot 0 is the
// transform table's root (no anchor).
public static const uint MAX_ANCHORS = 32u;

// Where the sun-light table holds a light at zenith cosine `mu`, at `heightShare` of the
// way up the air (sky.slang `sunLightFragment` is the inverse).
public float2 sunLightTableUv(float mu, float heightShare) {
  float2 size = float2(256.0, 64.0);
  float2 unit = float2(
      0.5 + 0.5 * sign(mu) * sqrt(abs(mu)),
      sqrt(clamp(heightShare, 0.0, 1.0)));
  return (0.5 + unit * (size - 1.0)) / size;
}

// The view's eye in one anchor's coordinates, and the rotation from that
// anchor's axes to the view's shading axes (its body anchor's), both
// computed in float64 on the CPU (scene/anchorEyes.ts). `eyeHi.w` is 1
// when the eye is too far from the anchor (more than 2^31 m) for the
// split positions' integer difference: its draws are hidden in the view.
public struct AnchorEye {
  public float4 eyeHi;           // xyz: the eye, split as SplitPosition's
  public float4 eyeLo;
  public float4 axes[3];         // the rotation by row (xyz)
};

public struct View {
  public float4x4 viewProj;      // rotation-only view × reverse-Z projection
  public float4x4 viewRotation;
  public float3 cameraHi;
  public float near;
  public float3 cameraLo;
  public float aspect;
  public float4 planes[5];       // camera-relative, inward normals; far is infinite
  // Toward the sun (unit, Earth-fixed axes, xyz), and the Moon's
  // illuminance share for the air's light (w; 0 by day, `moonLight`).
  public float4 sunDirection;
  public float4 viewport;        // width, height, 1/width, 1/height
  // Environment axes (east, up, -north) at the camera; [0].w: 1 when the
  // globe's night lights show (View.cityLights); [1].w: how much aerial
  // perspective comes from the screen grid from high up.
  public float4 iblFrame[3];
  public float sunIlluminance;   // lux by default
  public float diffuseIbl;
  public float specularIbl;
  public float specularMaxLod;
  public uint viewBit;           // this view's bit in DrawRecord.viewMask
  public float exposure;         // pre-exposure: scene light × exposure is written
  public float aerialStart;      // aerial-perspective volume's distances, km
  public float aerialEnd;
  // The atmosphere's bottom and top radii (km), 1 when the sun's light
  // comes from it per pixel (sunIlluminance then scales it, 1), and 1 when
  // aerial perspective applies.
  public float4 sunLight;
  // The body's ellipsoid, meters (xyz), and how much aerial perspective is
  // marched per vertex rather than read from the volume (w).
  public float4 bodyRadii;
  // Toward the Moon from the camera (unit, xyz), and its illuminance as a
  // share of the sun's above the atmosphere (w; 0: none).
  public float4 moonLight;
  // Seconds since the engine started (x), for custom shaders' animation;
  // y: 1 in a height capture's view; z: 1 in a shadow cascade's, whose cull
  // also draws its view's casters (cull `drawable`).
  public float4 time;
  // Per anchor slot (Transform.flags bits 8 to 15): the eye in the
  // anchor's coordinates and its axes into the shading axes (cullTables
  // `relativeMatrix`). The body anchor's eye is `cameraHi`/`cameraLo`'s.
  public AnchorEye anchors[MAX_ANCHORS];
};

public struct DrawRecord {
  public float3 center;          // bounding sphere in the transform's local frame
  public float radius;           // (per instance, for instanced records)
  public float4 color;           // linear RGBA tint
  public uint transform;         // index in `transforms`
  public uint flags;             // 1 hidden, 2 unlit override, 4 collision, 8 underlay
  public uint materialIndex;
  public uint indexCount;
  public uint firstIndex;
  public uint featureId;         // first global feature ID; 0 = not pickable
  public uint batch;
  public uint positionOffset;    // word offsets of attribute streams; 0xffffffff = absent
  public uint normalOffset;
  public uint uvOffset;
  public uint colorOffset;
  public uint tangentOffset;
  public uint textureSet;
  public uint imagerySlice;
  public uint featureIdOffset;   // per-vertex local feature IDs (u32 words)
  public uint viewMask;          // views that draw this record (per-view LOD selection)
  public uint clipBlock;         // mixed-LOD placeholder: block of clip boxes (bits 0-27), boxes in it (28-31)
  public uint placeholderMask;   // views in which the record draws only inside them
  public uint terrainClip;       // globe tiles: a bit per terrain clip region of the world it touches
  public uint instanceFirst;     // range in `instanceTable`; count 0 = not instanced
  public uint instanceCount;
  public uint instanceStreams;   // per-instance streams in the arena (word offset)
  public uint instanceStride;    // their words per instance
  public uint lightsSlice;       // a globe tile's slice of the night lights (as imagerySlice)
  public uint attributes;        // the mesh's named-attribute directory (MeshStreams.attributes)
  public uint instanceDirectory; // named fields of the instance streams (DrawRecordData)
  public float billboardSize;    // billboards (flag 16): pixels per mesh unit
  public float billboardDepthTest; // billboards: drawn in front within this distance, m
  // Its placement's block in the world's placements buffer (placement.slang,
  // scene/placementTable.ts), applied before the custom vertex stage;
  // 0xffffffff: none (the transform alone).
  public uint placement;
  public uint skirtStart;        // a globe tile's first skirt vertex (mesh-local); 0xffffffff = none
  public uint casterMask;        // views whose shadow cascades alone draw this record
};

// A placement composed in float64 on the CPU (World transform table),
// relative to its anchor (the table's root under none).
public struct Transform {
  public float3 originHi;
  public float scale;            // largest axis scale of `linear` (bounding radii)
  public float3 originLo;
  public uint flags;             // 1 hidden (itself or an ancestor); bits 8-15 its anchor slot
  public float3x3 linear;        // rotation-scale, in its anchor's axes
};

// One instance of an instanced record.
public struct Instance {
  public float4 row0;            // affine relative to the record's transform,
  public float4 row1;            // as three rows of a 3×4 matrix
  public float4 row2;
  public uint record;            // 0xffffffff: free slot
  public uint feature;           // local feature ID; 0xffffffff = the record's
  public uint flags;             // 1 hidden
  public uint tint;              // RGBA8 linear multiplier
};

// Written per view by the cull kernels for every draw item (a record
// without instances, or one instance).
public struct DrawItem {
  public float4x4 relModel;      // to camera-relative world space, float32-safe
  // Where the draw's origin is drawn (xyz), camera-relative: relModel's
  // translation moved by its placement's order-0 displacement, summed
  // exactly (cullTables drawnTranslation). Read only for a record with a
  // placement; the same as relModel's translation otherwise.
  public float4 drawn;
  public uint record;
  public uint feature;           // the instance's global feature ID; 0 = the record's
  public uint instance;          // index within the record's instance range
  public uint tint;              // RGBA8 linear multiplier
};

public struct Material {
  public float4 baseColor;       // linear
  public float3 emissive;
  public float metallic;
  public float roughness;
  public float alphaCutoff;
  public float normalScale;
  public float occlusionStrength;
  public uint flags;             // MaterialFlags in layout.ts
  // Texture references by slot, two 16-bit ones a word (layout.ts
  // `MaterialData.textures`): read through `materialTextureRef`.
  public uint textures01;
  public uint textures23;
  public uint textures4;
};

public static const uint NO_TEXTURE = 0xffffu;
public static const uint NO_STREAM = 0xffffffffu;

// A material's texture reference for `slot` (0 base color, 1 metallic-
// roughness, 2 normal, 3 occlusion, 4 emissive), NO_TEXTURE for none.
public uint materialTextureRef(Material m, uint slot) {
  uint word = slot < 2u ? m.textures01 : (slot < 4u ? m.textures23 : m.textures4);
  return (word >> ((slot & 1u) * 16u)) & 0xffffu;
}

public bool materialHasTexture(Material m, uint slot) {
  return materialTextureRef(m, slot) != NO_TEXTURE;
}

// --- lights beyond the sun (scene/lights.ts) ---------------------------------

// A view's point and spot lights, culled to it and camera-relative, and
// its froxel grid: tiles across and down, slices in depth from `near` (log).
public struct LightHeader {
  public float4 grid;            // tiles across, down, slices; the lights' count
  public float4 depth;           // near (m), slices per unit of ln(z / near), tan(half fov) x, y
  public float4 forward;         // the camera's axes; .w of forward: the grid's far end (m)
  public float4 right;
  public float4 up;
};

public struct Light {
  public float4 position;        // camera-relative; .w its reach (m)
  public float4 color;           // linear RGB × candela; .w 1 for a spot
  public float4 direction;       // where a spot points; .w its cone's scale
  public float4 cone;            // .x its cone's offset: (cos θ · scale + offset)²
};

// scene/lights.ts MAX_VIEW_LIGHTS.
public static const uint MAX_VIEW_LIGHTS = 1024u;
// A froxel's lights: its count, then up to CLUSTER_LIGHTS indices (its
// brightest; scene/lights.ts the same).
public static const uint CLUSTER_LIGHTS = 16u;

// --- positions -----------------------------------------------------------------

// A float64 position split into float32 pairs (math/transforms.ts
// `splitVec3`: highs are whole meters). Its parts are private: the only
// way to use one is `difference` (exact to float32 near each other) or
// `approximate` (about half a meter at the Earth's radius), so a precision
// mistake is a compile error. The highs subtract as integers: Dawn compiles
// with relaxed math on Apple GPUs, which may reassociate
// `(aHi - bHi) + (aLo - bLo)` into a sum of the large values, and on an
// M-series Mac that erred as much as plain float32 (0.45 m at
// Philadelphia, r50; plan §3.3 "Precision"). Integer arithmetic can't be
// reassociated with float arithmetic.
public struct SplitPosition {
  float3 hi;
  float3 lo;

  public __init(float3 hi, float3 lo) {
    this.hi = hi;
    this.lo = lo;
  }

  /// The offset from `b` to this position.
  public float3 difference(SplitPosition b) {
    return float3(int3(hi) - int3(b.hi)) + (lo - b.lo);
  }

  /// `difference` as its two exact parts, whole meters and a fraction, for
  /// a caller that sums more terms into it before rounding (cullTables.slang
  /// `drawnTranslation`): their sum is `difference`.
  public void differenceParts(SplitPosition b, out float3 whole, out float3 fraction) {
    whole = float3(int3(hi) - int3(b.hi));
    fraction = lo - b.lo;
  }

  /// As one float32 value: only for what doesn't need more (a direction
  /// from the Earth's center, an altitude).
  public float3 approximate() {
    return hi + lo;
  }
};
