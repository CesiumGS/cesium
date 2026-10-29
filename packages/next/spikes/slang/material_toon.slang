// A user-style material built on the default one: posterized base color
// (four levels per channel) and a rougher finish.
module material_toon;
import common;
import material;
import material_default;

public struct ToonMaterial : IMaterial {
  public Surface surface(SurfaceInput i) {
    DefaultMaterial base;
    Surface s = base.surface(i);
    s.baseColor = float4(floor(s.baseColor.rgb * 4.0 + 0.5) / 4.0, s.baseColor.a);
    s.roughness = max(s.roughness, 0.6);
    return s;
  }
};
