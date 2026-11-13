// The lift profile of a vertical exaggeration with a ceiling, written once
// (src/camera/heightProfile.ts `liftedPart` is its float64 mirror, and
// test/heightProfile.test.ts holds the two to each other). A point at height
// h above the ellipsoid goes to h + (k − 1)·G(h) along the normal, where
//
//   a = ceiling − band, u = clamp(h − a, 0, band)
//   G = min(h, a) − base + u − u² / (2 band):
//
// h − base below the blend, a constant above the ceiling, a quadratic blend
// between so that dh'/dh is continuous. G does not depend on k, which stays
// the weight of the displacement. Used by the exaggeration's parity kernel
// (transforms.slang) and by the vertex stage's terrain term (placement.slang).
module heightProfile;

[Differentiable]
public float exaggerationLift(float h, float base, float ceiling, float band)
{
    float a0 = ceiling - band;
    float u = min(max(h - a0, 0.0), band);
    return min(h, a0) - base + u - u * u / (2.0 * band);
}
