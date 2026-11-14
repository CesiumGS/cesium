// The four inputs every candidate takes.

import { twistDescriptor } from "../../src/transforms/twist.ts";

/** 1. A 1.x / 3D Tiles style (show and color). */
export const STYLE = {
  show: "${Height} > 5 && ${Floors} >= 1",
  color:
    "${Height} > 120 ? color('red', 0.9) : mix(rgb(30, 90, 200) / 255.0 * 255.0, vec4(0.9, 0.85, 0.2, 1.0), clamp((${Height} - 10.0) / 110.0, 0.0, 1.0))",
};

/** The same style with one literal changed (a value edit). */
export const STYLE_EDITED = {
  ...STYLE,
  color: STYLE.color.replace("120", "150"),
};

/** Features to evaluate it on (Height in metres). */
export const FEATURES = [
  { Height: 0, Floors: 0 },
  { Height: 6, Floors: 1 },
  { Height: 10, Floors: 2 },
  { Height: 37.25, Floors: 9 },
  { Height: 65.5, Floors: 17 },
  { Height: 119.999, Floors: 30 },
  { Height: 120, Floors: 31 },
  { Height: 250.125, Floors: 61 },
];

/** 2. The built-in twist, as the restricted JS today's parser reads. */
export const TWIST_SOURCE = twistDescriptor.source!;
export const TWIST_PARAMS = {
  ox: 10,
  oy: -4,
  oz: 0,
  ax: 0.2,
  ay: 0.1,
  az: 1,
  rate: 0.01,
};
export const TWIST_POINTS: [number, number, number][] = [
  [0, 0, 0],
  [125.5, -40.25, 12],
  [-3000, 2000, 450.5],
  [6378137, 0, 100],
];

/** 3. A small MaterialX graph: height bands with stripes along u. */
export const MTLX = `<?xml version="1.0"?>
<materialx version="1.39">
  <nodegraph name="NG_bands">
    <texcoord name="uv" type="vector2"/>
    <extract name="u" type="float">
      <input name="in" type="vector2" nodename="uv"/>
      <input name="index" type="integer" value="0"/>
    </extract>
    <geompropvalue name="height" type="float">
      <input name="geomprop" type="string" value="Height"/>
    </geompropvalue>
    <multiply name="stripes_in" type="float">
      <input name="in1" type="float" nodename="u"/>
      <input name="in2" type="float" value="8.0"/>
    </multiply>
    <modulo name="stripes" type="float">
      <input name="in1" type="float" nodename="stripes_in"/>
      <input name="in2" type="float" value="1.0"/>
    </modulo>
    <smoothstep name="edge" type="float">
      <input name="in" type="float" nodename="stripes"/>
      <input name="low" type="float" value="0.45"/>
      <input name="high" type="float" value="0.55"/>
    </smoothstep>
    <divide name="hnorm" type="float">
      <input name="in1" type="float" nodename="height"/>
      <input name="in2" type="float" value="100.0"/>
    </divide>
    <clamp name="hclamp" type="float">
      <input name="in" type="float" nodename="hnorm"/>
      <input name="low" type="float" value="0.0"/>
      <input name="high" type="float" value="1.0"/>
    </clamp>
    <mix name="base" type="color3">
      <input name="fg" type="color3" value="0.9, 0.5, 0.1"/>
      <input name="bg" type="color3" value="0.1, 0.3, 0.8"/>
      <input name="mix" type="float" nodename="hclamp"/>
    </mix>
    <multiply name="shade" type="float">
      <input name="in1" type="float" nodename="edge"/>
      <input name="in2" type="float" value="0.4"/>
    </multiply>
    <add name="lift" type="float">
      <input name="in1" type="float" nodename="shade"/>
      <input name="in2" type="float" value="0.6"/>
    </add>
    <multiply name="out_color" type="color3">
      <input name="in1" type="color3" nodename="base"/>
      <input name="in2" type="float" nodename="lift"/>
    </multiply>
    <output name="base_color" type="color3" nodename="out_color"/>
  </nodegraph>
</materialx>`;

/** 4. A WGSL function (a smooth falloff with a twist of angle), for naga. */
export const WGSL_FN = `fn falloff(p: vec3f, r: f32, k: f32) -> f32 {
  let d = length(p.xy);
  let x = clamp(d / r, 0.0, 1.0);
  let s = 1.0 - x * x * (3.0 - 2.0 * x);
  let a = atan2(p.y, p.x);
  return s * (1.0 + k * sin(3.0 * a)) + 0.25 * smoothstep(0.0, 10.0, p.z);
}`;

/** Its float64 meaning, by hand, as the oracle. */
export function falloffF64(p: readonly number[], r: number, k: number): number {
  const d = Math.hypot(p[0]!, p[1]!);
  const x = Math.min(Math.max(d / r, 0), 1);
  const s = 1 - x * x * (3 - 2 * x);
  const a = Math.atan2(p[1]!, p[0]!);
  const t = Math.min(Math.max((p[2]! - 0) / 10, 0), 1);
  return s * (1 + k * Math.sin(3 * a)) + 0.25 * (t * t * (3 - 2 * t));
}
