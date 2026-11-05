/**
 * The playground's presets: Slang custom shader stages against the
 * `cesium` module (src/shaders/cesium.slang), each self-contained. Grouped
 * for the menu. Patterns use model coordinates (`positionMC`, exact) or
 * texture coordinates; `positionWC` is Earth-fixed float32, about a meter
 * near the surface, so only coarse effects (bands by height) read it.
 */
export interface Preset {
  name: string;
  group: string;
  code: string;
}

const NOISE = `
// Value noise and its sum over octaves (fbm), from a cheap hash.
float hash3(float3 p) {
  p = frac(p * 0.3183099 + 0.1);
  p *= 17.0;
  return frac(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(float3 x) {
  float3 i = floor(x);
  float3 f = frac(x);
  f = f * f * (3.0 - 2.0 * f);
  // The cube's eight corners, blended along x, then y, then z.
  float x00 = lerp(hash3(i), hash3(i + float3(1, 0, 0)), f.x);
  float x10 = lerp(hash3(i + float3(0, 1, 0)), hash3(i + float3(1, 1, 0)), f.x);
  float x01 = lerp(hash3(i + float3(0, 0, 1)), hash3(i + float3(1, 0, 1)), f.x);
  float x11 = lerp(hash3(i + float3(0, 1, 1)), hash3(i + float3(1, 1, 1)), f.x);
  return lerp(lerp(x00, x10, f.y), lerp(x01, x11, f.y), f.z);
}

float fbm(float3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amplitude * noise3(p);
    p = p * 2.02 + 1.7;
    amplitude *= 0.5;
  }
  return sum;
}
`;

const HUE = `
float3 hue(float h) {
  float3 k = float3(0.0, 2.0 / 3.0, 1.0 / 3.0);
  return saturate(abs(frac(h + k) * 6.0 - 3.0) - 1.0);
}
`;

export const PRESETS: Preset[] = [
  // ------------------------------------------------------------ lighting
  {
    name: "Rim glow",
    group: "Light and view",
    code: `import cesium;

// A glow where the surface turns away from the camera, pulsing in time.
// Emission is display-relative: 1 is white whatever the exposure.
// The uniforms below are the parameters (the panel over the view).
[Color(0.2, 0.6, 1)] uniform float3 glowColor;
[Slider(1.5, 0.5, 6)] uniform float falloff;
[Slider(1.5, 0, 4)] uniform float strength;
[Toggle(true)] uniform bool pulse;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float rim = 1.0 - saturate(dot(toCamera, normalize(fsInput.normal)));
  float beat = pulse ? 0.6 + 0.4 * sin(fsInput.time * 3.0) : 1.0;
  material.baseColor *= 0.5;
  material.emissive += glowColor * pow(rim, falloff) * beat * strength;
}
`,
  },
  {
    name: "Iridescence",
    group: "Light and view",
    code: `import cesium;
${HUE}
// Thin-film colors that shift with the viewing angle, over a glossy metal.
[Slider(1.5, 0.5, 4)] uniform float bands;
[Slider(0.05, 0, 0.5)] uniform float drift;
[Slider(0.85, 0, 1)] uniform float filmStrength;
[Slider(0.2, 0, 1)] uniform float roughness;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float facing = saturate(dot(toCamera, normalize(fsInput.normal)));
  float3 film = hue(facing * bands + fsInput.time * drift);
  material.baseColor = lerp(float3(0.9), film, filmStrength);
  material.metallic = 1.0;
  material.roughness = roughness;
}
`,
  },
  {
    name: "Toon steps",
    group: "Light and view",
    code: `import cesium;

// Flat steps of the material's color by how much the surface faces up,
// unlit, with dark edges where it turns away from the camera.
[Slider(4, 2, 10)] uniform int steps;
[Toggle(true)] uniform bool outlines;
[Slider(0.25, 0.05, 0.6)] uniform float outlineWidth;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 up = normalize(fsInput.positionWC);
  float3 n = normalize(fsInput.normal);
  float bands = float(steps);
  float light = floor(saturate(dot(n, up) * 0.5 + 0.5) * bands) / bands;
  float3 toCamera = normalize(-fsInput.positionEC);
  float edge = outlines ? step(outlineWidth, dot(toCamera, n)) : 1.0;
  material.baseColor = material.baseColor * (0.35 + 0.65 * light) * edge;
  material.unlit = true;
}
`,
  },
  {
    name: "Hologram",
    group: "Light and view",
    code: `import cesium;

// Scan lines climbing the model, a rim, and a flicker: unlit.
[Color(0.2, 0.9, 1)] uniform float3 tint;
[Slider(40, 5, 120)] uniform float linesPerUnit;
[Slider(2, 0, 8)] uniform float scrollSpeed;
[Slider(0.15, 0, 0.5)] uniform float flicker;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float rim = 1.0 - saturate(dot(toCamera, normalize(fsInput.normal)));
  float z = fsInput.positionMC.z * linesPerUnit - fsInput.time * scrollSpeed;
  float lines = step(0.5, frac(z));
  float t = fsInput.time;
  float wobble = 1.0 - flicker + flicker * sin(t * 37.0) * sin(t * 11.0);
  material.baseColor = tint * (0.15 + 0.35 * lines + 0.8 * rim) * wobble;
  material.unlit = true;
}
`,
  },
  {
    name: "Distance fog",
    group: "Light and view",
    code: `import cesium;

// The surface fades to a fog color with its distance from the camera.
[Color(0.55, 0.6, 0.7)] uniform float3 fogColor;
[Slider(0.15, 0.01, 1)] uniform float density;
[Slider(0.3, 0, 1)] uniform float glow;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float distance = length(fsInput.positionEC);
  float fog = 1.0 - exp(-distance * density);
  material.baseColor = lerp(material.baseColor, fogColor, fog);
  material.emissive += fogColor * fog * glow;
}
`,
  },
  // ------------------------------------------------------------ patterns
  {
    name: "UV checker",
    group: "Patterns",
    code: `import cesium;

// A checkerboard in texture coordinates: where the model's UVs stretch,
// the squares do.
[Slider(16, 2, 64)] uniform int squares;
[Color(0.1, 0.1, 0.1)] uniform float3 dark;
[Color(0.9, 0.9, 0.9)] uniform float3 light;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 cell = floor(fsInput.texCoord0 * float(squares));
  float check = fmod(cell.x + cell.y, 2.0);
  material.baseColor = lerp(dark, light, check);
}
`,
  },
  {
    name: "UV coordinates",
    group: "Patterns",
    code: `import cesium;

// Texture coordinates as color: red is u, green is v, unlit.
[Slider(1, 1, 8)] uniform int tiles;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = float3(frac(fsInput.texCoord0 * float(tiles)), 0.0);
  material.unlit = true;
}
`,
  },
  {
    name: "Normals",
    group: "Patterns",
    code: `import cesium;

// The shading normal as a color (Earth-fixed axes), unlit.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = normalize(fsInput.normal) * 0.5 + 0.5;
  material.unlit = true;
}
`,
  },
  {
    name: "Model-space grid",
    group: "Patterns",
    code: `import cesium;

// Grid lines in model coordinates, kept a pixel wide by the screen-space
// change of the coordinate (fwidth).
[Slider(10, 1, 50)] uniform float linesPerUnit;
[Color(1, 0.8, 0.2)] uniform float3 lineColor;
[Slider(0.5, 0, 2)] uniform float glow;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * linesPerUnit;
  float3 width = max(fwidth(p), float3(1e-4));
  float3 grid = abs(frac(p - 0.5) - 0.5) / width;
  float line = 1.0 - saturate(min(min(grid.x, grid.y), grid.z));
  material.baseColor = lerp(material.baseColor * 0.6, lineColor, line);
  material.emissive += lineColor * line * glow;
}
`,
  },
  {
    name: "Polka dots",
    group: "Patterns",
    code: `import cesium;

// Dots in texture coordinates, growing and shrinking in time.
[Slider(12, 2, 40)] uniform float dotsPerUnit;
[Slider(0.25, 0.05, 0.45)] uniform float radius;
[Color(0.85, 0.15, 0.2)] uniform float3 dotColor;
[Color(0.95, 0.9, 0.8)] uniform float3 paper;
[Toggle(true)] uniform bool pulse;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 cell = frac(fsInput.texCoord0 * dotsPerUnit) - 0.5;
  float r = radius + (pulse ? 0.1 * sin(fsInput.time * 2.0) : 0.0);
  float inside = 1.0 - smoothstep(r - 0.02, r + 0.02, length(cell));
  material.baseColor = lerp(paper, dotColor, inside);
}
`,
  },
  {
    name: "Height bands",
    group: "Patterns",
    code: `import cesium;
${HUE}
// Bands of color by height above the ellipsoid, sliding up over time.
[Slider(2, 0.25, 10)] uniform float bandsPerMeter;
[Slider(0.25, 0, 2)] uniform float speed;
[Slider(0.7, 0, 1)] uniform float amount;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float height = length(fsInput.positionWC) - 6369000.0;
  float band = frac(height * bandsPerMeter - fsInput.time * speed);
  material.baseColor = lerp(material.baseColor, hue(band), amount);
}
`,
  },
  {
    name: "Contour lines",
    group: "Patterns",
    code: `import cesium;

// Lines of equal model height, glowing, a pixel wide at any distance.
[Slider(20, 2, 100)] uniform float linesPerUnit;
[Color(0.1, 1, 0.4)] uniform float3 lineColor;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float h = fsInput.positionMC.z * linesPerUnit;
  float width = max(fwidth(h), 1e-4);
  float line = 1.0 - saturate(abs(frac(h - 0.5) - 0.5) / width);
  material.baseColor *= 0.8;
  material.emissive += lineColor * line;
}
`,
  },
  {
    name: "Feature IDs",
    group: "Patterns",
    code: `import cesium;

// Each feature its own color (picking's feature IDs; models without
// features are one color). Try the Buildings sample.
[Slider(0.8, 0, 1)] uniform float amount;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  uint h = fsInput.featureId * 2654435761u;
  uint3 bytes = uint3(h >> 16, h >> 8, h) & 255u;
  float3 color = float3(bytes) / 255.0;
  material.baseColor = lerp(material.baseColor, color, amount);
}
`,
  },
  // ------------------------------------------------------------ noise
  {
    name: "Marble",
    group: "Noise",
    code: `import cesium;
${NOISE}
// Veins of fbm noise in model coordinates, polished.
[Slider(6, 1, 20)] uniform float scale;
[Slider(6, 0, 12)] uniform float turbulence;
[Color(0.25, 0.22, 0.2)] uniform float3 veinColor;
[Color(0.95, 0.93, 0.9)] uniform float3 stoneColor;
[Slider(0.15, 0, 1)] uniform float roughness;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * scale;
  float veins = abs(sin(p.x * 2.0 + fbm(p) * turbulence));
  material.baseColor = lerp(veinColor, stoneColor, pow(veins, 0.4));
  material.roughness = roughness;
  material.metallic = 0.0;
}
`,
  },
  {
    name: "Voronoi cells",
    group: "Noise",
    code: `import cesium;

float3 hash33(float3 p) {
  p = float3(
    dot(p, float3(127.1, 311.7, 74.7)),
    dot(p, float3(269.5, 183.3, 246.1)),
    dot(p, float3(113.5, 271.9, 124.6)));
  return frac(sin(p) * 43758.5453);
}
// Cells around jittered points in model coordinates: the distance to the
// nearest and the next nearest point outline them.
[Slider(8, 2, 30)] uniform float cellsPerUnit;
[Slider(0.08, 0, 0.3)] uniform float edgeWidth;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * cellsPerUnit;
  float3 cell = floor(p);
  float nearest = 8.0;
  float second = 8.0;
  float3 id = float3(0.0);
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        float3 c = cell + float3(x, y, z);
        float d = length(p - (c + hash33(c)));
        if (d < nearest) {
          second = nearest;
          nearest = d;
          id = c;
        } else if (d < second) {
          second = d;
        }
      }
    }
  }
  float edge = smoothstep(0.0, edgeWidth, second - nearest);
  material.baseColor = (hash33(id) * 0.8 + 0.1) * edge;
}
`,
  },
  {
    name: "Burn",
    group: "Noise",
    code: `import cesium;
${NOISE}
// A burn sweeping through noise: charred behind the front, a glowing edge
// at it, untouched ahead, over and over.
[Slider(0.15, 0, 1)] uniform float speed;
[Slider(5, 1, 20)] uniform float scale;
[Color(1, 0.45, 0.05)] uniform float3 emberColor;
[Slider(3, 0, 8)] uniform float emberGlow;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float n = fbm(fsInput.positionMC * scale);
  float front = frac(fsInput.time * speed) * 1.4 - 0.2;
  float burnt = step(n, front);
  float edge = smoothstep(0.06, 0.0, abs(n - front));
  material.baseColor = lerp(material.baseColor, float3(0.02), burnt);
  material.roughness = lerp(material.roughness, 1.0, burnt);
  material.emissive += emberColor * edge * emberGlow;
}
`,
  },
  {
    name: "Glitter",
    group: "Noise",
    code: `import cesium;
${NOISE}
// Sparkles that turn on and off as the view moves: a cell's flake catches
// the light when its random normal faces the camera.
[Slider(120, 20, 400)] uniform float flakesPerUnit;
[Color(0.6, 0.1, 0.35)] uniform float3 paint;
[Slider(4, 0, 10)] uniform float sparkle;
[Slider(60, 5, 200)] uniform float sharpness;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 cell = floor(fsInput.positionMC * flakesPerUnit);
  float3 random = float3(hash3(cell), hash3(cell + 7.1), hash3(cell + 3.3));
  float3 flake = normalize(random - 0.5);
  float3 toCamera = normalize(-fsInput.positionEC);
  float glint = pow(saturate(dot(flake, toCamera)), sharpness);
  material.baseColor = paint;
  material.metallic = 0.6;
  material.roughness = 0.35;
  material.emissive += float3(1.0, 0.9, 1.0) * glint * sparkle;
}
`,
  },
  // ------------------------------------------------------------ materials
  {
    name: "Metal sweep",
    group: "Materials",
    code: `import cesium;

// Metallic and roughness swept across the model: rough plastic to polished
// metal and back.
[Color(0.95, 0.75, 0.4)] uniform float3 tint;
[Slider(3, 0.5, 10)] uniform float stripes;
[Slider(1, 0, 4)] uniform float speed;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float phase = fsInput.positionMC.x * stripes - fsInput.time * speed;
  float t = 0.5 + 0.5 * sin(phase);
  material.baseColor = tint;
  material.metallic = t;
  material.roughness = lerp(0.9, 0.05, t);
}
`,
  },
  {
    name: "Brushed gold",
    group: "Materials",
    code: `import cesium;
${NOISE}
// Gold with roughness in fine streaks along x, like brushed metal.
[Color(1, 0.78, 0.34)] uniform float3 gold;
[Slider(300, 50, 1000)] uniform float streaks;
[Slider(0.15, 0, 1)] uniform float minRoughness;
[Slider(0.45, 0, 1)] uniform float maxRoughness;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * float3(2.0, streaks, streaks);
  material.baseColor = gold;
  material.metallic = 1.0;
  material.roughness = lerp(minRoughness, maxRoughness, noise3(p));
}
`,
  },
  {
    name: "Plasma",
    group: "Materials",
    code: `import cesium;
${HUE}
// Moving bands of color in texture coordinates, emitted.
[Slider(6, 1, 20)] uniform float scale;
[Slider(1, 0, 4)] uniform float speed;
[Slider(1, 0, 4)] uniform float brightness;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 uv = fsInput.texCoord0 * scale;
  float t = fsInput.time * speed;
  float v = sin(uv.x + t)
          + sin(uv.y * 1.3 - t * 1.2)
          + sin((uv.x + uv.y) * 0.7 + t * 0.6);
  material.baseColor = float3(0.0);
  material.emissive = hue(v * 0.15 + t * 0.05) * brightness;
}
`,
  },
  // ------------------------------------------------------------ vertices
  {
    name: "Vertex wave",
    group: "Vertices",
    code: `import cesium;

// A wave running through the model: each vertex moves along its normal.
[Slider(0.05, 0, 0.3)] uniform float amplitude;
[Slider(4, 0.5, 20)] uniform float frequency;
[Slider(4, 0, 10)] uniform float speed;

float wave(float x, float time) {
  return sin(x * frequency + time * speed);
}

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float push = wave(vsInput.positionMC.x, vsInput.time) * amplitude;
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * push;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor *= 0.6 + 0.4 * wave(fsInput.positionMC.x, fsInput.time);
}
`,
  },
  {
    name: "Vertex twist",
    group: "Vertices",
    code: `import cesium;

// The model twisted about its z axis, more the higher, swaying in time.
[Slider(1.5, 0, 6)] uniform float twistAmount;
[Slider(1, 0, 4)] uniform float speed;

float3 twist(float3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return float3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float sway = sin(vsInput.time * speed);
  float a = vsInput.positionMC.z * twistAmount * sway;
  vsOutput.positionMC = twist(vsInput.positionMC, a);
  vsOutput.normalMC = twist(vsInput.normalMC, a);
}
`,
  },
  {
    name: "Breathe",
    group: "Vertices",
    code: `import cesium;

// The surface inflates and deflates along its normals.
[Slider(0.04, 0, 0.2)] uniform float depth;
[Slider(2, 0, 8)] uniform float speed;

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float push = depth * (0.5 + 0.5 * sin(vsInput.time * speed));
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * push;
}
`,
  },
  {
    name: "Spikes",
    group: "Vertices",
    code: `import cesium;
${NOISE}
// Noise pushes vertices out along their normals; color follows the push.
[Slider(0.25, 0, 1)] uniform float spikeHeight;
[Slider(4, 1, 12)] uniform float scale;
[Slider(0.5, 0, 3)] uniform float speed;
[Color(0.1, 0.2, 0.5)] uniform float3 low;
[Color(1, 0.5, 0.1)] uniform float3 high;

float spike(float3 positionMC, float time) {
  float n = noise3(positionMC * scale + time * speed);
  return n * n;
}

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float push = spike(vsInput.positionMC, vsInput.time) * spikeHeight;
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * push;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = lerp(low, high, spike(fsInput.positionMC, fsInput.time));
}
`,
  },
];

/** The preset shown first. */
export const FIRST_PRESET = "Rim glow";

/**
 * A new shader ("New"): the model's own material, unchanged, with the
 * contract's inputs a stage starts from at hand.
 */
export const NEW_SHADER = `import cesium;

// A new shader: the model draws with its own material until you change it.
// fragmentMain sets the material (MaterialOutput: baseColor, alpha,
// metallic, roughness, normal, occlusion, emissive, unlit) from what the
// surface point knows (FragmentInput: positionEC, normal, uv, time, ...).
// Add vertexMain(VertexInput, inout VertexOutput) to move vertices.
// Controls: declare a uniform with an attribute and use it by name, e.g.
//   [Slider(0.5, 0.0, 1.0)] uniform float amount;   (also Color, Toggle, Label)
// Ctrl-Space completes; hover for docs; Cmd/Ctrl-click goes to definitions.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material)
{
}
`;
