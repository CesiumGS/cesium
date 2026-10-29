// Default material, equivalent to src/shaders/opaque.wgsl's placeholder lighting.
module material_default;
import material;

public struct DefaultMaterial : IMaterial {
  public float3 shade(MaterialInput input) {
    if ((input.flags & 2u) != 0u) {
      return input.baseColor.rgb; // unlit
    }
    float diffuse = max(dot(input.normal, input.sunDirection), 0.0);
    return input.baseColor.rgb * (0.12 + 2.0 * diffuse);
  }
};

// Link-time binding of the engine's `extern struct Material`.
export struct Material : IMaterial = DefaultMaterial;
