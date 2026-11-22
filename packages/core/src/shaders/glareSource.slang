// A glare source (docs/design/custom-post-processing.md, docs/design/sky-light-and-points-unifications.md): the record glare.slang's kernel writes
// and the veil stages (stages/glare*.slang) and sprites read, as one struct.
module glareSource;

// In record 0, the header: pixel.x the count of records in use, the sun's among them;
// pixel.y the sun's z along the view; radius the sine of its angular radius; visibility the
// pixels spent.
public struct GlareSource {
  public float2 pixel;
  public float radius;       // a sprite's, pixels; 0 for none
  public float visibility;
  public float3 light;       // lux, through the air
  public float kind;         // 0: none, 1: the sun, 2: a star
};
