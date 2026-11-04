// Named attributes in Slang: a per-vertex shear matrix (MAT2) and heat
// (customShader.ts SHEAR_WGSL is the same in WGSL). Built with
//   npm run slang -- parity/slang/shear.slang --attributes shear:mat2x2f,heat:f32
import cesium;

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  vsOutput.positionMC.z += vsInput.attributes.heat * 0.25;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  // glTF's M v: the asymmetric shear tells a transposed matrix apart.
  float2 p = mul(fsInput.attributes.shear, fsInput.positionMC.xy + 0.5);
  material.baseColor = float3(frac(p * 3.0), fsInput.attributes.heat);
}
