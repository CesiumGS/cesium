uniform sampler2D image;
uniform float minimumHeight;
uniform float maximumHeight;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    float scaledHeight = clamp((materialInput.height - minimumHeight) / (maximumHeight - minimumHeight), 0.0, 1.0);
    vec4 rampColor = texture(image, vec2(scaledHeight, 0.5));
    rampColor = czm_gammaCorrect(rampColor);
    material.diffuse = rampColor.rgb;
    material.alpha = rampColor.a;
    return material;
}
