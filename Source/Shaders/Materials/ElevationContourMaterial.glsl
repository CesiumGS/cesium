uniform vec4 color;

czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);

    if (fract(materialInput.height / spacing) < 0.1 ) {
       material.diffuse = color.rgb;
       material.alpha = color.a;
    }
    else {
        material.alpha = 0.0;
    }

    return material;
}