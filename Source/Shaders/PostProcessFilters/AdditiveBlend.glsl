uniform sampler2D u_texture0;
uniform sampler2D u_texture1;

uniform vec2 u_center;
uniform float u_radius;

varying vec2 v_textureCoordinates;

void main()
{
    vec4 color0 = texture2D(u_texture0, v_textureCoordinates);
    vec4 color1 = texture2D(u_texture1, v_textureCoordinates);
    
    float x = length(gl_FragCoord.xy - u_center) / u_radius;
    float t = smoothstep(0.5, 0.8, x);
    gl_FragColor = mix(color0 + color1, color0, t);
}
