// Links DefaultMaterial into the engine's `extern struct Material_`.
module bind_default;
import material;
import material_default;

export struct Material_ : IMaterial = DefaultMaterial;
