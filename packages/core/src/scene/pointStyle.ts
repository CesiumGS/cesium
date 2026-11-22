/**
 * The generic point cull's style (pointCull.slang, across its boundary:
 * shaders/link POINT_STYLE_BOUNDARY): every point shown, none small enough
 * to splat.
 */
export const POINT_STYLE_DEFAULTS = `fn styleShow(i: u32, distance: f32) -> bool { return true; }
fn styleSize(i: u32, distance: f32) -> f32 { return 3.4e38; }
fn styleColor(i: u32, distance: f32) -> vec4f { return vec4f(1.0); }
fn styleShapeAt(i: u32, distance: f32, p: vec2f) -> f32 { return -1.0; }
fn styleOffset(i: u32, distance: f32) -> vec2f { return vec2f(0.0); }
`;
