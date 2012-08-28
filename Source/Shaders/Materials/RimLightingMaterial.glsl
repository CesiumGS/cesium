uniform vec4 color;
uniform vec4 rimColor;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    float d = dot(materialInput.normalEC, materialInput.positionToEyeEC);

    material.diffuse = color.rgb;

    if (d < 0.5) {
        // On rim
        material.emission = rimColor.rgb;
        material.alpha = rimColor.a;
    }
    else {
        material.alpha = color.a;
    }

    return material;
}
