// Links ToonMaterial into the engine's `extern struct Material_`.
module bind_toon;
import material;
import material_toon;

export struct Material_ : IMaterial = ToonMaterial;
