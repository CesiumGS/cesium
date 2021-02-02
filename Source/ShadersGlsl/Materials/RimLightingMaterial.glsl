uniform vec4 color;
uniform vec4 rimColor;
uniform float width;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    // See http://www.fundza.com/rman_shaders/surface/fake_rim/fake_rim1.html
    float d = 1.0 - dot(materialInput.normalEC, normalize(materialInput.positionToEyeEC));
    float s = smoothstep(1.0 - width, 1.0, d);

    vec4 outColor = czm_gammaCorrect(color);
    vec4 outRimColor = czm_gammaCorrect(rimColor);

    material.diffuse = outColor.rgb;
    material.emission = outRimColor.rgb * s;
    material.alpha = mix(outColor.a, outRimColor.a, s);

    return material;
}
