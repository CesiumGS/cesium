precision highp float;
varying vec3 v_normal;
uniform vec4 u_ambient;
varying vec2 v_texcoord0;
uniform sampler2D u_diffuse;
uniform vec4 u_reflective;
void main(void) {
vec3 normal = normalize(v_normal);
vec4 color = vec4(0., 0., 0., 0.);
vec4 diffuse = vec4(0., 0., 0., 1.);
vec3 diffuseLight = vec3(0., 0., 0.);
vec4 reflective;
vec4 ambient;
vec3 ambientLight = vec3(0., 0., 0.);
ambient = u_ambient;
diffuse = texture2D(u_diffuse, v_texcoord0);
reflective = u_reflective;
diffuse.xyz += reflective.xyz;
diffuse.xyz *= max(dot(normal,vec3(0.,0.,1.)), 0.);
color.xyz += diffuse.xyz;
gl_FragColor = vec4(color.rgb * diffuse.a, diffuse.a);
}
