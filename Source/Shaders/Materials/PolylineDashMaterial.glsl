uniform vec4 color;
uniform float dashLength;
varying float v_angle;

mat2 rotate(float rad) {
    float c = cos(rad);
    float s = sin(rad);
    return mat2(
        c, s,
        -s, c
    );
}

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    vec2 pos = rotate(v_angle) * gl_FragCoord.xy;

    float oddOrEven = floor( fract( (pos.x / dashLength) * 0.5 ) + 0.5 );

    if(oddOrEven > 0.5) discard;

    material.emission = color.rgb;
    material.alpha = color.a;
    return material;
}