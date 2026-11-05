// ToonMaterial, the Slang spike's user material (plan §3.4, step 7), on
// the engine's extension point: the glTF material's base color posterized
// to four levels a channel, and a rougher finish. Compiled at build time
// (toon.wgsl, scripts/slangShader.mjs) and at runtime
// (CustomShader.fromSlang); both must draw what parity/customShader.ts's
// WGSL twin draws.
import cesium;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = floor(material.baseColor * 4.0 + 0.5) / 4.0;
  material.roughness = max(material.roughness, 0.6);
}
