precision highp float;
varying vec3 v_normal;
uniform vec4 u_ambient;
varying vec2 v_texcoord0;
uniform sampler2D u_diffuse;
uniform vec4 u_emission;
uniform vec4 u_specular;
uniform float u_shininess;
varying vec3 v_light0Direction;
uniform vec3 u_light0Color;

// New uniforms for testing
uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelViewProjectionMatrix;
uniform mat4 u_modelInverseMatrix;
uniform mat4 u_viewInverseMatrix;
uniform mat4 u_projectionInverseMatrix;
uniform mat4 u_modelViewInverseMatrix;
uniform mat4 u_modelViewProjectionInverseMatrix;
uniform mat4 u_modelInverseTransposeMatrix;
uniform vec4 u_viewport;

uniform vec2 u_vec2;
uniform mat2 u_mat2;
uniform mat3 u_mat3;
uniform mat4 u_mat4;
// End uniforms

void main(void) {
vec3 normal = normalize(v_normal);
vec4 color = vec4(0., 0., 0., 0.);
vec4 diffuse = vec4(0., 0., 0., 1.);
vec3 diffuseLight = vec3(0., 0., 0.);
vec4 emission;
vec4 ambient;
vec4 specular;
ambient = u_ambient;
diffuse = texture2D(u_diffuse, v_texcoord0);
emission = u_emission;
specular = u_specular;
vec3 specularLight = vec3(0., 0., 0.);
{
float specularIntensity = 0.;
float attenuation = 1.0;
vec3 l = normalize(v_light0Direction);
vec3 h = normalize(l+vec3(0.,0.,1.));
specularIntensity = max(0., pow(max(dot(normal,h), 0.) , u_shininess)) * attenuation;
specularLight += u_light0Color * specularIntensity;
diffuseLight += u_light0Color * max(dot(normal,l), 0.) * attenuation;
}
specular.xyz *= specularLight;
color.xyz += specular.xyz;
diffuse.xyz *= diffuseLight;
color.xyz += diffuse.xyz;
color.xyz += emission.xyz;
color = vec4(color.rgb * diffuse.a, diffuse.a);

// Use new uniforms for testing
color.r = 
    u_modelMatrix[0][0] + 
    u_viewMatrix[0][0] + 
    u_modelViewProjectionMatrix[0][0] + 
    u_modelInverseMatrix[0][0] +
    u_viewInverseMatrix[0][0] + 
    u_projectionInverseMatrix[0][0] + 
    u_modelViewInverseMatrix[0][0] + 
    u_modelViewProjectionInverseMatrix[0][0] + 
    u_modelInverseTransposeMatrix[0][0] + 
    u_viewport.x + 
    u_vec2.x +
    u_mat2[0][0] +
    u_mat3[0][0] +
    u_mat4[0][0];
// End uniforms

gl_FragColor = color;
}
