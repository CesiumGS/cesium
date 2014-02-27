precision highp float;
varying vec3 v_normal;
uniform vec3 u_light0Color;
uniform vec3 u_light1Color;
varying vec3 v_light1Direction;
uniform float u_shininess;
uniform vec4 u_diffuse;
uniform vec4 u_specular;
void main(void) {
vec3 normal = normalize(v_normal);
vec4 color = vec4(0., 0., 0., 0.);
vec4 diffuse = vec4(0., 0., 0., 1.);
vec3 diffuseLight = vec3(0., 0., 0.);
vec4 specular;
vec3 ambientLight = vec3(0., 0., 0.);
{
ambientLight += u_light0Color;
}
vec3 specularLight = vec3(0., 0., 0.);
{
float diffuseIntensity;
float specularIntensity;
vec3 l = normalize(v_light1Direction);
vec3 h = normalize(l+vec3(0.,0.,1.));
diffuseIntensity = max(dot(normal,l), 0.);
specularIntensity = pow(max(0.0,dot(normal,h)),u_shininess);
specularLight += u_light1Color * specularIntensity;
diffuseLight += u_light1Color * diffuseIntensity;
}
diffuse = u_diffuse;
specular = u_specular;
specular.xyz *= specularLight;
color.xyz += specular.xyz;
diffuse.xyz *= diffuseLight;
color.xyz += diffuse.xyz;
color = vec4(color.rgb * diffuse.a, diffuse.a);
gl_FragColor = color;
}
