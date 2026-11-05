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
  return lerp(
    lerp(lerp(hash3(i), hash3(i + float3(1, 0, 0)), f.x),
         lerp(hash3(i + float3(0, 1, 0)), hash3(i + float3(1, 1, 0)), f.x), f.y),
    lerp(lerp(hash3(i + float3(0, 0, 1)), hash3(i + float3(1, 0, 1)), f.x),
         lerp(hash3(i + float3(0, 1, 1)), hash3(i + float3(1, 1, 1)), f.x), f.y),
    f.z);
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
// The declared uniforms below are the Parameters panel's controls.
[Color(0.2, 0.6, 1.0)] [Label("Glow color")]
uniform float3 glowColor;
[Slider(1.5, 0.5, 6.0)] [Label("Falloff")]
uniform float falloff;
[Slider(1.5, 0.0, 4.0)] [Label("Strength")]
uniform float strength;
[Toggle(true)] [Label("Pulse")]
uniform bool pulse;

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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float facing = saturate(dot(toCamera, normalize(fsInput.normal)));
  float3 film = hue(facing * 1.5 + fsInput.time * 0.05);
  material.baseColor = lerp(float3(0.9), film, 0.85);
  material.metallic = 1.0;
  material.roughness = 0.2;
}
`,
  },
  {
    name: "Toon steps",
    group: "Light and view",
    code: `import cesium;

// Flat steps of the material's color by how much the surface faces up,
// unlit, with dark edges where it turns away from the camera.
[Slider(4, 2, 10)] [Label("Steps")]
uniform int steps;
[Toggle(true)] [Label("Outlines")]
uniform bool outlines;
[Slider(0.25, 0.05, 0.6)] [Label("Outline width")]
uniform float outlineWidth;

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
[Color(0.2, 0.9, 1.0)] [Label("Color")]
uniform float3 holoColor;
[Slider(40, 5, 120)] [Label("Lines per unit")]
uniform float density;
[Slider(2.0, 0.0, 8.0)] [Label("Scroll speed")]
uniform float speed;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float rim = 1.0 - saturate(dot(toCamera, normalize(fsInput.normal)));
  float lines = step(0.5, frac(fsInput.positionMC.z * density - fsInput.time * speed));
  float flicker = 0.85 + 0.15 * sin(fsInput.time * 37.0) * sin(fsInput.time * 11.0);
  material.baseColor = holoColor * (0.15 + 0.35 * lines + 0.8 * rim) * flicker;
  material.unlit = true;
}
`,
  },
  {
    name: "Distance fog",
    group: "Light and view",
    code: `import cesium;

// The surface fades to a fog color with its distance from the camera.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float distance = length(fsInput.positionEC);
  float fog = 1.0 - exp(-distance * 0.15);
  material.baseColor = lerp(material.baseColor, float3(0.55, 0.6, 0.7), fog);
  material.emissive += float3(0.55, 0.6, 0.7) * fog * 0.3;
}
`,
  },
  // ------------------------------------------------------------ patterns
  {
    name: "UV checker",
    group: "Patterns",
    code: `import cesium;

// A checkerboard in texture coordinates (16 by 16 squares): where the
// model's UVs stretch, the squares do.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 cell = floor(fsInput.texCoord0 * 16.0);
  float check = fmod(cell.x + cell.y, 2.0);
  material.baseColor = lerp(float3(0.1), float3(0.9), check);
}
`,
  },
  {
    name: "UV coordinates",
    group: "Patterns",
    code: `import cesium;

// Texture coordinates as color: red is u, green is v, unlit.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = float3(frac(fsInput.texCoord0), 0.0);
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

// Grid lines in model coordinates, a line every tenth of a unit, kept a
// pixel wide by the screen-space change of the coordinate (fwidth).
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * 10.0;
  float3 width = fwidth(p);
  float3 grid = abs(frac(p - 0.5) - 0.5) / max(width, float3(1e-4));
  float line = 1.0 - saturate(min(min(grid.x, grid.y), grid.z));
  material.baseColor = lerp(material.baseColor * 0.6, float3(1.0, 0.8, 0.2), line);
  material.emissive += float3(1.0, 0.8, 0.2) * line * 0.5;
}
`,
  },
  {
    name: "Polka dots",
    group: "Patterns",
    code: `import cesium;

// Dots in texture coordinates, growing and shrinking in time.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 cell = frac(fsInput.texCoord0 * 12.0) - 0.5;
  float radius = 0.25 + 0.1 * sin(fsInput.time * 2.0);
  float dot = 1.0 - smoothstep(radius - 0.02, radius + 0.02, length(cell));
  material.baseColor = lerp(float3(0.95, 0.9, 0.8), float3(0.85, 0.15, 0.2), dot);
}
`,
  },
  {
    name: "Height bands",
    group: "Patterns",
    code: `import cesium;
${HUE}
// Bands of color by height above the ellipsoid, a band every half meter,
// sliding up over time.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float height = length(fsInput.positionWC) - 6369000.0;
  float band = frac(height * 2.0 - fsInput.time * 0.25);
  material.baseColor = lerp(material.baseColor, hue(band), 0.7);
}
`,
  },
  {
    name: "Contour lines",
    group: "Patterns",
    code: `import cesium;

// Lines of equal model height, glowing, a pixel wide at any distance.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float h = fsInput.positionMC.z * 20.0;
  float line = 1.0 - saturate(abs(frac(h - 0.5) - 0.5) / max(fwidth(h), 1e-4));
  material.baseColor *= 0.8;
  material.emissive += float3(0.1, 1.0, 0.4) * line;
}
`,
  },
  {
    name: "Feature IDs",
    group: "Patterns",
    code: `import cesium;

// Each feature its own color (picking's feature IDs; models without
// features are one color). Try the Buildings sample.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  uint h = fsInput.featureId * 2654435761u;
  float3 color = float3(float((h >> 16) & 255u), float((h >> 8) & 255u), float(h & 255u)) / 255.0;
  material.baseColor = lerp(material.baseColor, color, 0.8);
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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * 6.0;
  float veins = abs(sin(p.x * 2.0 + fbm(p) * 6.0));
  float3 stone = lerp(float3(0.25, 0.22, 0.2), float3(0.95, 0.93, 0.9), pow(veins, 0.4));
  material.baseColor = stone;
  material.roughness = 0.15;
  material.metallic = 0.0;
}
`,
  },
  {
    name: "Voronoi cells",
    group: "Noise",
    code: `import cesium;

float3 hash33(float3 p) {
  p = float3(dot(p, float3(127.1, 311.7, 74.7)), dot(p, float3(269.5, 183.3, 246.1)), dot(p, float3(113.5, 271.9, 124.6)));
  return frac(sin(p) * 43758.5453);
}

// Cells around jittered points in model coordinates: the distance to the
// nearest and the next nearest point outline them.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * 8.0;
  float3 cell = floor(p);
  float nearest = 8.0;
  float second = 8.0;
  float3 id = float3(0.0);
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        float3 c = cell + float3(x, y, z);
        float3 point = c + hash33(c);
        float d = length(p - point);
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
  float edge = smoothstep(0.0, 0.08, second - nearest);
  material.baseColor = hash33(id) * 0.8 + 0.1;
  material.baseColor *= edge;
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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float n = fbm(fsInput.positionMC * 5.0);
  float front = frac(fsInput.time * 0.15) * 1.4 - 0.2;
  float burnt = step(n, front);
  float edge = smoothstep(0.06, 0.0, abs(n - front));
  material.baseColor = lerp(material.baseColor, float3(0.02), burnt);
  material.roughness = lerp(material.roughness, 1.0, burnt);
  material.emissive += float3(1.0, 0.45, 0.05) * edge * 3.0;
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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 cell = floor(fsInput.positionMC * 120.0);
  float3 flake = normalize(float3(hash3(cell), hash3(cell + 7.1), hash3(cell + 3.3)) - 0.5);
  float3 toCamera = normalize(-fsInput.positionEC);
  float glint = pow(saturate(dot(flake, toCamera)), 60.0);
  material.baseColor = float3(0.6, 0.1, 0.35);
  material.metallic = 0.6;
  material.roughness = 0.35;
  material.emissive += float3(1.0, 0.9, 1.0) * glint * 4.0;
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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float t = 0.5 + 0.5 * sin(fsInput.positionMC.x * 3.0 - fsInput.time);
  material.baseColor = float3(0.95, 0.75, 0.4);
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
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 p = fsInput.positionMC * float3(2.0, 300.0, 300.0);
  float streak = noise3(p);
  material.baseColor = float3(1.0, 0.78, 0.34);
  material.metallic = 1.0;
  material.roughness = lerp(0.15, 0.45, streak);
}
`,
  },
  {
    name: "Plasma",
    group: "Materials",
    code: `import cesium;
${HUE}
// Moving bands of color in texture coordinates, emitted.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float2 uv = fsInput.texCoord0 * 6.0;
  float t = fsInput.time;
  float v = sin(uv.x + t) + sin(uv.y * 1.3 - t * 1.2) + sin((uv.x + uv.y) * 0.7 + t * 0.6);
  material.baseColor = float3(0.0);
  material.emissive = hue(v * 0.15 + t * 0.05);
}
`,
  },
  // ------------------------------------------------------------ vertices
  {
    name: "Vertex wave",
    group: "Vertices",
    code: `import cesium;

// A wave running through the model: each vertex moves along its normal.
public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float phase = vsInput.positionMC.x * 4.0 + vsInput.time * 4.0;
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * sin(phase) * 0.05;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float phase = fsInput.positionMC.x * 4.0 + fsInput.time * 4.0;
  material.baseColor *= 0.6 + 0.4 * sin(phase);
}
`,
  },
  {
    name: "Vertex twist",
    group: "Vertices",
    code: `import cesium;

float3 twist(float3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return float3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
}

// The model twisted about its z axis, more the higher, swaying in time.
public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float a = vsInput.positionMC.z * 1.5 * sin(vsInput.time);
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
public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float amount = 0.04 * (0.5 + 0.5 * sin(vsInput.time * 2.0));
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * amount;
}
`,
  },
  {
    name: "Spikes",
    group: "Vertices",
    code: `import cesium;
${NOISE}
// Noise pushes vertices out along their normals; color follows the push.
public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float n = noise3(vsInput.positionMC * 4.0 + vsInput.time * 0.5);
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * n * n * 0.25;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float n = noise3(fsInput.positionMC * 4.0 + fsInput.time * 0.5);
  material.baseColor = lerp(float3(0.1, 0.2, 0.5), float3(1.0, 0.5, 0.1), n * n);
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
