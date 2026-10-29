// A user-style material: quantized "toon" lighting.
module material_toon;
import material;

public struct ToonMaterial : IMaterial {
  public float3 shade(MaterialInput input) {
    float diffuse = max(dot(input.normal, input.sunDirection), 0.0);
    float band = floor(diffuse * 3.0 + 0.5) / 3.0;
    return input.baseColor.rgb * (0.15 + 1.6 * band);
  }
};

export struct Material : IMaterial = ToonMaterial;
