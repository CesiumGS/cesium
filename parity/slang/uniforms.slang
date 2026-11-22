// Typed uniforms in Slang (customShader.ts UNIFORMS is the same in WGSL).
// Built with
//   npm run slang -- parity/slang/uniforms.slang --uniforms amplitude:f32,offset:vec2f,tint:vec3f,bands:u32,shift:i32,spin:mat3x3f
import cesium;

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  // glTF's M p: the asymmetric spin tells a transposed matrix apart.
  float2 p = mul(uniforms.spin, fsInput.positionMC).xy + uniforms.offset;
  float k = floor((p.x + 0.5) * float(uniforms.bands) + float(uniforms.shift));
  material.baseColor = uniforms.tint * uniforms.amplitude * (0.5 + 0.5 * frac(k * 0.37));
}
