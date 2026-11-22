// Per-instance values in Slang (customShader.ts INSTANCE_VALUES is the
// same in WGSL). Built with
//   npm run slang -- parity/slang/instances.slang --instance lift:f32,tint:vec3f,symbol:u32
import cesium;

public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  vsOutput.positionMC.z += vsInput.instance.lift * step(0.0, vsInput.positionMC.z);
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = fsInput.instance.tint * (float(fsInput.instance.symbol) + 1.0) / 3.0;
}
