precision highp float;
varying vec3 v_normal;
uniform vec3 u_diffuse;
uniform vec3 u_reflective;
void main(void) {
vec3 normal = normalize(v_normal);
float lambert = max(dot(normal,vec3(0.,0.,1.)), 0.);
vec4 color = vec4(0., 0., 0., 0.);
vec4 diffuse = vec4(0., 0., 0., 1.);
vec4 reflective;
diffuse.xyz = u_diffuse;
reflective.xyz = u_reflective;
diffuse.xyz += reflective.xyz;
diffuse.xyz *= lambert;
color += diffuse;
gl_FragColor = vec4(color.rgb * color.a, color.a);
}
