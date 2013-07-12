precision highp float;
varying vec3 v_normal;
varying vec2 v_texcoord0;
uniform sampler2D u_diffuse;
uniform vec3 u_reflective;
void main(void) {
vec3 normal = normalize(v_normal);
float lambert = max(dot(normal,vec3(0.,0.,1.)), 0.);
vec4 color = vec4(0., 0., 0., 1.);
vec4 diffuse = vec4(0., 0., 0., 0.);
vec4 reflective;
diffuse = texture2D(u_diffuse, v_texcoord0);
reflective.xyz = u_reflective;
diffuse.xyz += reflective.xyz;
diffuse.xyz *= lambert;
color.xyz += diffuse.xyz;
gl_FragColor = vec4(color.rgb * color.a, color.a);
}
