// Screen overlays drawn after tonemapping (e.g. a linked view's footprint).
// Positions are camera-relative float32, computed on the CPU in float64.

@group(0) @binding(0) var<uniform> view: View;

struct OverlayParams {
  color: vec4f,
};
@group(1) @binding(0) var<uniform> overlay: OverlayParams;

@vertex
fn vs(@location(0) position: vec3f) -> @builtin(position) vec4f {
  var clip = view.viewProj * vec4f(position, 1.0);
  // Keep lines on top of everything in the view.
  clip.z = clip.w;
  return clip;
}

@fragment
fn fs() -> @location(0) vec4f {
  return overlay.color;
}
